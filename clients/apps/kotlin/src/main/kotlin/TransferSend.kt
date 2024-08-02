import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.options.option
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class TransferSend: CliktCommand(help = "Send the specified coin to an statechain address") {

    private val walletName: String by argument(help = "Name of the wallet")

    private val statechainId: String by argument(help = "Statechain id")

    private val toAddress: String by argument(help = "Address to send the funds")

    private val batchId: String? by option("-b", "--generate-batch-id", help = "Optional batch ID for the transaction")

    private val appContext: AppContext by lazy {
        requireNotNull(currentContext.findObject() as? AppContext) {
            "ClientConfig not found in context"
        }
    }

    private suspend fun getNewX1(statechainId: String, signedStatechainId: String, newAuthPubkey: String, batchId: String?): String {

        val transferSenderRequestPayload = TransferSenderRequestPayload(
            statechainId,
            signedStatechainId,
            newAuthPubkey,
            batchId
        )

        val url = "${appContext.clientConfig.statechainEntity}/transfer/sender"

        val httpClient = HttpClient(CIO) {
            install(ContentNegotiation) {
                json()
            }
        }

        val transferSenderResponsePayload: TransferSenderResponsePayload = httpClient.post(url) {
            contentType(ContentType.Application.Json)
            setBody(transferSenderRequestPayload)
        }.body()

        httpClient.close()

        return transferSenderResponsePayload.x1
    }

    private suspend fun execute() {
        val wallet = appContext.sqliteManager.loadWallet(walletName)

        CoinUpdate.execute(wallet, appContext)

        if (!validateAddress(toAddress, wallet.network)) {
            throw Exception("Invalid address")
        }

        var backupTxs = appContext.sqliteManager.getBackupTxs(statechainId)

        if (backupTxs.isEmpty()) {
            throw Exception("There is no backup transaction for the statechain id $statechainId")
        }

        val newTxN = backupTxs.count() + 1

        val coinsWithStatechainId = wallet.coins.filter { c -> c.statechainId == statechainId }

        if (coinsWithStatechainId.isEmpty()) {
            throw Exception("There is no coin for the statechain id $statechainId")
        }

        // If the user sends to himself, he will have two coins with the same statechain_id
        // In this case, we need to find the one with the lowest locktime
        // Sort the coins by locktime in ascending order and pick the first one
        val coin = coinsWithStatechainId.minByOrNull { it.locktime!! }
            ?: throw Exception("No coins available after sorting by locktime")

        if (coin.status != CoinStatus.CONFIRMED && coin.status != CoinStatus.IN_TRANSFER) {
            throw Exception("Coin status must be CONFIRMED or IN_TRANSFER to transfer it. The current status is ${coin.status}")
        }

        if (coin.locktime == null) {
            throw Exception("Coin.locktime is null");
        }

        val electrumClient = getElectrumClient(appContext.clientConfig)

        val blockHeader = electrumClient.blockchainHeadersSubscribe()
        val currentBlockheight = blockHeader.height.toUInt()

        electrumClient.closeConnection()

        if (currentBlockheight > coin.locktime!!)  {
            throw Exception("The coin is expired. Coin locktime is ${coin.locktime} and current blockheight is $currentBlockheight");
        }

        val statechainId = coin.statechainId
        val signedStatechainId = coin.signedStatechainId

        val isWithdrawal = false
        val qtBackupTx = backupTxs.size

        // Sorting backup transactions by tx_n in ascending order
        backupTxs = backupTxs.sortedBy { it.txN }

        val bkpTx1 = backupTxs.firstOrNull() ?: throw Exception("No backup transactions available")

        val blockHeight = getBlockheight(bkpTx1)

        val decodedTransferAddress = decodeStatechainAddress(toAddress)
        val newAuthPubkey = decodedTransferAddress.authPubkey

        val newX1 = getNewX1(statechainId!!, signedStatechainId!!, newAuthPubkey, batchId)

        val infoConfig = getInfoConfig(appContext.clientConfig)

        val initlock = infoConfig.initlock;
        val interval = infoConfig.interval;

        val feeRateSatsPerByte: UInt = if (infoConfig.feeRateSatsPerByte > appContext.clientConfig.maxFeeRate.toUInt()) {
            appContext.clientConfig.maxFeeRate.toUInt()
        } else {
            infoConfig.feeRateSatsPerByte.toUInt()
        }

        val signedTx = Transaction.create(
            coin,
            appContext.clientConfig,
            blockHeight,
            qtBackupTx.toUInt(),
            toAddress,
            wallet.network,
            false,
            feeRateSatsPerByte,
            initlock,
            interval
        )

        val backupTx = BackupTx(
            txN = newTxN.toUInt(),
            tx = signedTx,
            clientPublicNonce = coin.publicNonce ?: throw Exception("publicNonce is null"),
            serverPublicNonce = coin.serverPublicNonce ?: throw Exception("serverPublicNonce is null"),
            clientPublicKey = coin.userPubkey,
            serverPublicKey = coin.serverPubkey ?: throw Exception("serverPubkey is null"),
            blindingFactor = coin.blindingFactor ?: throw Exception("blindingFactor is null")
        )

        backupTxs = backupTxs.plus(backupTx)

        val inputTxid = coin.utxoTxid!!
        val inputVout = coin.utxoVout!!
        val clientSeckey = coin.userPrivkey
        val recipientAddress = toAddress

        val transferSignature = createTransferSignature(recipientAddress, inputTxid, inputVout, clientSeckey);

        val transferUpdateMsgRequestPayload = createTransferUpdateMsg(newX1, recipientAddress, coin, transferSignature, backupTxs)

        val url = "${appContext.clientConfig.statechainEntity}/transfer/update_msg"

        val httpClient = HttpClient(CIO) {
            install(ContentNegotiation) {
                json()
            }
        }

        val response = httpClient.post(url) {
            contentType(ContentType.Application.Json)
            setBody(transferUpdateMsgRequestPayload)
        }

        if (response.status != HttpStatusCode.OK) {
            throw Exception("Failed to update transfer message")
        }

        httpClient.close()

        appContext.sqliteManager.updateBackupTxs(coin.statechainId!!, backupTxs)

        val activityUtxo = "${inputTxid}:${inputVout}"

        val activity = createActivity(activityUtxo, coin.amount!!, "Transfer")

        wallet.activities = wallet.activities.plus(activity)
        coin.status = CoinStatus.IN_TRANSFER

        appContext.sqliteManager.updateWallet(wallet)

        val json = buildJsonObject {
            put("status", "Transfer sent")
        }

        println(Json.encodeToString(json))
    }

    override fun run() {
        runBlocking { execute() }
    }
}