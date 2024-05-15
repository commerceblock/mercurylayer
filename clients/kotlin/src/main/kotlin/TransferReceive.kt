import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*
import org.bitcoinj.core.NetworkParameters
import org.electrumj.Util
import org.electrumj.dto.BlockchainScripthashListUnspentResponseEntry

class TransferReceive: CliktCommand(help = "Retrieve coins from server") {

    private val walletName: String by argument(help = "Name of the wallet")

    private val appContext: AppContext by lazy {
        requireNotNull(currentContext.findObject() as? AppContext) {
            "ClientConfig not found in context"
        }
    }

    private suspend fun sendTransferReceiverRequestPayload(
        transferReceiverRequestPayload: TransferReceiverRequestPayload) : String
    {
        val httpClient = HttpClient(CIO) {
            install(ContentNegotiation) {
                json()
            }
        }

        val url = "${appContext.clientConfig.statechainEntity}/transfer/receiver"

        while (true) {
            val response = httpClient.post(url) {
                contentType(ContentType.Application.Json)
                setBody(transferReceiverRequestPayload)
            }

            if (response.status == HttpStatusCode.BadRequest) {

                val transferReceiverErrorResponsePayload : TransferReceiverErrorResponsePayload = response.body()

                if (transferReceiverErrorResponsePayload.code == TransferReceiverError.EXPIRED_BATCH_TIME_ERROR) {
                    throw Exception(transferReceiverErrorResponsePayload.message)
                } else if (transferReceiverErrorResponsePayload.code == TransferReceiverError.STATECOIN_BATCH_LOCKED_ERROR) {
                    println("Statecoin batch still locked. Waiting until expiration or unlock.")
                    delay(5000)
                    continue
                }
            }

            if (response.status == HttpStatusCode.OK) {
                val transferReceiverPostResponsePayload : TransferReceiverPostResponsePayload = response.body()
                return transferReceiverPostResponsePayload.serverPubkey
            } else {
                throw Exception("Failed to update transfer message")
            }
        }
    }

    private fun verifyTx0OutputIsUnspentAndConfirmed(
        coin: Coin, tx0Outpoint: TxOutpoint, tx0Hex: String, walletNetwork: String) : Pair<Boolean, CoinStatus>
    {
        val tx0outputAddress = getOutputAddressFromTx0(tx0Outpoint, tx0Hex, walletNetwork)

        val electrumClient = getElectrumClient(appContext.clientConfig)

        // TODO: check wallet network
        val netParam = NetworkParameters.fromID(NetworkParameters.ID_TESTNET)
        val scripthash: String = Util.scripthash(netParam, tx0outputAddress)

        val responseEntries: List<BlockchainScripthashListUnspentResponseEntry> =
            electrumClient.blockchainScripthashListUnspent(scripthash)

        var status = CoinStatus.UNCONFIRMED;

        responseEntries.forEach { entry ->
            if (entry.txHash == tx0Outpoint.txid && entry.txPos == tx0Outpoint.vout.toLong()) {
                val blockHeader = electrumClient.blockchainHeadersSubscribe()
                val blockheight = blockHeader.height

                val confirmations = blockheight - entry.height + 1

                if (confirmations >= appContext.clientConfig.confirmationTarget) {
                    status = CoinStatus.CONFIRMED;
                }

                return Pair(true, status)
            }
        }

        return Pair(false, status)
    }

    private suspend fun unlockStatecoin(statechainId: String, signedStatechainId: String, authPubkey: String) {
        val url = "${appContext.clientConfig.statechainEntity}/transfer/unlock"

        val httpClient = HttpClient(CIO) {
            install(ContentNegotiation) {
                json()
            }
        }

        val transferUnlockRequestPayload = TransferUnlockRequestPayload (
            statechainId,
            signedStatechainId,
            authPubkey
        )

        val response = httpClient.post(url) {
            contentType(ContentType.Application.Json)
            setBody(transferUnlockRequestPayload)
        }

        if (response.status != HttpStatusCode.OK) {
            throw Exception("Failed to unlock transfer message")
        }

        httpClient.close()
    }

    private fun getTx0(tx0Txid: String) : String {
        val electrumClient = getElectrumClient(appContext.clientConfig)

        var txHex = electrumClient.blockchainTransactionGetNoVerbose(tx0Txid);

        electrumClient.closeConnection()

        return txHex
    }

    private suspend fun processEncryptedMessage(
        coin: Coin,
        encMessages: List<String>,
        serverInfo: InfoConfig,
        wallet: Wallet) : List<String>
    {
        val statechainIdsAdded = mutableListOf<String>()

        val clientAuthKey = coin.authPrivkey
        val newUserPubkey = coin.userPubkey

        encMessages.forEach { encMessage ->

            val transferMsg = fiiDecryptTransferMsg(encMessage, clientAuthKey)
            val tx0Outpoint = getTx0Outpoint(transferMsg.backupTransactions)
            val tx0Hex = getTx0(tx0Outpoint.txid)

            val isTransferSignatureValid = ffiVerifyTransferSignature(newUserPubkey, tx0Outpoint, transferMsg)

            if (!isTransferSignatureValid) {
                println("Invalid transfer signature")
                return@forEach
            }

            val statechainInfo = getStatechainInfo(appContext.clientConfig, transferMsg.statechainId)

            if (statechainInfo == null) {
                println("Statechain info not found")
                return@forEach
            }

            val isTx0OutputPubkeyValid = fiiValidateTx0OutputPubkey(statechainInfo.enclavePublicKey, transferMsg, tx0Outpoint, tx0Hex, wallet.network)

            if (!isTx0OutputPubkeyValid) {
                println("Invalid tx0 output pubkey")
                return@forEach
            }

            val latestBackupTxPaysToUserPubkey = fiiVerifyLatestBackupTxPaysToUserPubkey(transferMsg, newUserPubkey, wallet.network)

            if (!latestBackupTxPaysToUserPubkey) {
                println("Latest Backup Tx does not pay to the expected public key")
                return@forEach
            }

            if (statechainInfo.numSigs.toInt() != transferMsg.backupTransactions.size) {
                println("num_sigs is not correct")
                return@forEach
            }

            val isTx0OutputUnspent = verifyTx0OutputIsUnspentAndConfirmed(coin, tx0Outpoint, tx0Hex, wallet.network);
            if (!isTx0OutputUnspent.first) {
                println("tx0 output is spent or not confirmed")
                return@forEach
            }

            val currentFeeRateSatsPerByte = serverInfo.feeRateSatsPerByte.toUInt()

            val feeRateTolerance = appContext.clientConfig.feeRateTolerance.toUInt()

            var previousLockTime: UInt? = null

            var sigSchemeValidation = true

            for ((index, backupTx) in transferMsg.backupTransactions.withIndex()) {

                try {
                    verifyTransactionSignature(backupTx.tx, tx0Hex, feeRateTolerance, currentFeeRateSatsPerByte)

                    val currentStatechainInfo = statechainInfo.statechainInfo[index]

                    verifyBlindedMusigScheme(
                        backupTx, tx0Hex, currentStatechainInfo
                    )
                }
                catch (e: MercuryException) {
                    println("Invalid signature, ${e.toString()}")
                    sigSchemeValidation = false
                    break
                }

                if (previousLockTime != null) {
                    val currentLockTime = getBlockheight(backupTx)
                    if (previousLockTime - currentLockTime != serverInfo.interval) {
                        println("Interval is not correct")
                        sigSchemeValidation = false
                        break
                    }
                }

                previousLockTime = getBlockheight(backupTx)
            }

            if (!sigSchemeValidation) {
                println("Signature scheme validation failed")
                return@forEach
            }

            val transferReceiverRequestPayload = fiiCreateTransferReceiverRequestPayload(statechainInfo, transferMsg, coin)

            val signedStatechainIdForUnlock = signMessage(transferMsg.statechainId, coin)

            unlockStatecoin(transferMsg.statechainId, signedStatechainIdForUnlock, coin.authPubkey)

            var serverPublicKeyHex = ""

            try {
                serverPublicKeyHex = sendTransferReceiverRequestPayload(transferReceiverRequestPayload)
            } catch (e: Exception) {
                println("Error: ${e.message}");
                return@forEach
            }

            val newKeyInfo = getNewKeyInfo(serverPublicKeyHex, coin, transferMsg.statechainId, tx0Outpoint, tx0Hex, wallet.network)

            coin.serverPubkey = serverPublicKeyHex
            coin.aggregatedPubkey = newKeyInfo.aggregatePubkey
            coin.aggregatedAddress = newKeyInfo.aggregateAddress
            coin.statechainId = transferMsg.statechainId
            coin.signedStatechainId = newKeyInfo.signedStatechainId
            coin.amount = newKeyInfo.amount
            coin.utxoTxid = tx0Outpoint.txid
            coin.utxoVout = tx0Outpoint.vout
            coin.locktime = previousLockTime
            coin.status = isTx0OutputUnspent.second

            val utxo = "${tx0Outpoint.txid}:${tx0Outpoint.vout}"

            val activity = createActivity(utxo, newKeyInfo.amount, "Receive")
            wallet.activities = wallet.activities.plus(activity)

            appContext.sqliteManager.insertOrUpdateBackupTxs(transferMsg.statechainId, transferMsg.backupTransactions)

            statechainIdsAdded.add(transferMsg.statechainId)
        }

        return statechainIdsAdded
    }

    private suspend fun getMsgAddr(authPubkey: String) : List<String> {
        val url = "${appContext.clientConfig.statechainEntity}/transfer/get_msg_addr/${authPubkey}"

        val httpClient = HttpClient(CIO) {
            install(ContentNegotiation) {
                json()
            }
        }

        val response: GetMsgAddrResponsePayload = httpClient.get(url).body();

        httpClient.close()

        return response.listEncTransferMsg
    }

    private suspend fun execute() {

        val wallet = appContext.sqliteManager.loadWallet(walletName)

        CoinUpdate.execute(wallet, appContext)

        val receivedStatechainIds = mutableListOf<String>()

        val infoConfig = getInfoConfig(appContext.clientConfig)

        wallet.coins.forEach { coin ->
            if (coin.status != CoinStatus.INITIALISED) {
                return@forEach  // Continue in Kotlin's forEach
            }

            // Log information - assuming use of a logging library or println for simplicity
//            println("----\nuser_pubkey: ${coin.userPubkey}")
//            println("auth_pubkey: ${coin.authPubkey}")
//            println("statechain_id: ${coin.statechainId}")
//            println("coin.amount: ${coin.amount}")
//            println("coin.status: ${coin.status}")

            val encMessages = getMsgAddr(coin.authPubkey)

            if (encMessages.isEmpty()) {
                return@forEach  // Continue in Kotlin's forEach
            }

            val statechainIdsAdded = processEncryptedMessage(coin, encMessages, infoConfig, wallet)
            receivedStatechainIds.addAll(statechainIdsAdded)
        }

        appContext.sqliteManager.updateWallet(wallet)

        val json = buildJsonObject {
            putJsonArray("receivedStatechainIds") {
                receivedStatechainIds.forEach{ id -> add(id) }
            }
        }

        println(Json.encodeToString(json))

    }
    override fun run() {
        runBlocking { execute() }
    }
}