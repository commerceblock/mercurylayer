import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.serialization.kotlinx.json.*
import org.bitcoinj.core.NetworkParameters
import org.electrumj.Util
import org.electrumj.dto.BlockchainScripthashListUnspentResponseEntry

data class DepositResult(
    val activity: Activity,
    val backupTx: BackupTx
)

class CoinUpdate() {

    companion object {

        private suspend fun createTx1(
            coin: Coin,
            clientConfig: ClientConfig,
            walletNetwork: String,
            tx0Hash: String,
            tx0Vout: UInt
        ): BackupTx {

            if (coin.status != CoinStatus.INITIALISED) {
                throw IllegalStateException("The coin with the public key ${coin.userPubkey} is not in the INITIALISED state");
            }

            if (coin.utxoTxid != null && coin.utxoVout != null) {
                throw Exception("The coin with the public key ${coin.userPubkey} has already been deposited")
            }
            coin.utxoTxid = tx0Hash
            coin.utxoVout = tx0Vout

            coin.status = CoinStatus.IN_MEMPOOL

            val toAddress = getUserBackupAddress(coin, walletNetwork)

            val infoConfig = getInfoConfig(clientConfig)

            val initlock = infoConfig.initlock;
            val interval = infoConfig.interval;

            val feeRateSatsPerByte: UInt = if (infoConfig.feeRateSatsPerByte > clientConfig.maxFeeRate.toUInt()) {
                clientConfig.maxFeeRate.toUInt()
            } else {
                infoConfig.feeRateSatsPerByte.toUInt()
            }

            val signedTx = Transaction.create(
                coin,
                clientConfig,
                null,
                0u,
                toAddress,
                walletNetwork,
                false,
                feeRateSatsPerByte,
                initlock,
                interval
            )

            if (coin.publicNonce == null) {
                throw Exception("coin.publicNonce is None")
            }

            if (coin.blindingFactor == null) {
                throw Exception("coin.blindingFactor is None")
            }

            if (coin.statechainId == null) {
                throw Exception("coin.statechainId is None")
            }

            val backupTx = BackupTx(
                txN = 1u,
                tx = signedTx,
                clientPublicNonce = coin.publicNonce ?: throw Exception("publicNonce is null"),
                serverPublicNonce = coin.serverPublicNonce ?: throw Exception("serverPublicNonce is null"),
                clientPublicKey = coin.userPubkey,
                serverPublicKey = coin.serverPubkey ?: throw Exception("serverPubkey is null"),
                blindingFactor = coin.blindingFactor ?: throw Exception("blindingFactor is null")
            )

            val blockHeight = getBlockheight(backupTx)
            coin.locktime = blockHeight

            return backupTx
        }

        /*fun testElect(clientConfig: ClientConfig) {
            val electrumClient = getElectrumClient(clientConfig)

            val netParam = NetworkParameters.fromID(NetworkParameters.ID_TESTNET)
            val scripthash: String = Util.scripthash(netParam,"tb1p8jgrjg4rt4rt9nydw0r2ql9yl77ns069a3czkz3ml7zyc2whfdks0td33p")

            val responseEntries: List<BlockchainScripthashListUnspentResponseEntry> = electrumClient.blockchainScripthashListUnspent(scripthash)

            electrumClient.closeConnection()

            println("responseEntries.count: ${responseEntries.count()}")

            responseEntries.forEach { entry ->

                println("entry.height: ${entry.height}")
                println("entry.txHash: ${entry.txHash}")
                println("entry.txPos: ${entry.txPos}")
                println("entry.value: ${entry.value}")

            }
        }*/

        private suspend fun checkDeposit(coin: Coin, clientConfig: ClientConfig, walletNetwork: String): DepositResult? {

            if (coin.statechainId == null && coin.utxoTxid == null && coin.utxoVout == null) {
                if (coin.status != CoinStatus.INITIALISED) {
                    throw IllegalStateException("Coin does not have a statechain ID, a UTXO and the status is not INITIALISED")
                } else {
                    return null
                }
            }

            val electrumClient = getElectrumClient(clientConfig)

            // TODO: check wallet network
            val netParam = NetworkParameters.fromID(NetworkParameters.ID_TESTNET)
            val scripthash: String = Util.scripthash(netParam, coin.aggregatedAddress)

            val responseEntries: List<BlockchainScripthashListUnspentResponseEntry> =
                electrumClient.blockchainScripthashListUnspent(scripthash)

            var utxo: BlockchainScripthashListUnspentResponseEntry? = null;

            responseEntries.forEach { entry ->
                if (entry.value == coin.amount!!.toLong()) {
                    utxo = entry
                }
            }

            if (utxo == null) {
                return null
            }

            if (utxo!!.height == 0.toLong() && coin.status == CoinStatus.IN_MEMPOOL) {
                return null
            }

            val blockHeader = electrumClient.blockchainHeadersSubscribe()
            val blockheight = blockHeader.height.toUInt();

            electrumClient.closeConnection()

            var depositResult: DepositResult? = null

            if (coin.status == CoinStatus.INITIALISED) {
                val utxoTxid = utxo!!.txHash;
                val utxoVout = utxo!!.txPos;

                val backupTx = createTx1(coin, clientConfig, walletNetwork, utxoTxid, utxoVout.toUInt())

                val activityUtxo = "${utxo!!.txHash}:${utxo!!.txPos}"

                val activity = createActivity(activityUtxo, utxo!!.value.toUInt(), "deposit")

                depositResult = DepositResult(activity, backupTx)
            }

            if (utxo!!.height > 0) {
                val confirmations = blockheight - utxo!!.height.toUInt() + 1u

                coin.status = CoinStatus.UNCONFIRMED

                if (confirmations >= clientConfig.confirmationTarget.toUInt()) {
                    coin.status = CoinStatus.CONFIRMED
                }
            }

            return depositResult
        }

        private suspend fun checkTransfer(coin: Coin, clientConfig: ClientConfig): Boolean {

            if (coin.statechainId == null) {
                throw Exception("The coin with the aggregated address ${coin.aggregatedAddress} does not have a statechain ID");
            }

            val statechainInfo = getStatechainInfo(clientConfig, coin.statechainId!!) ?: return true

            val enclavePublicKey = statechainInfo.enclavePublicKey

            val isTransferred = !isEnclavePubkeyPartOfCoin(coin, enclavePublicKey)

            return isTransferred
        }

        private fun checkWithdrawal(coin: Coin, clientConfig: ClientConfig, walletNetwork: String): Boolean {

            var txid: String? = null

            if (coin.txWithdraw != null) {
                txid = coin.txWithdraw
            }

            if (coin.txCpfp != null) {
                if (txid != null) {
                    throw Exception("Coin ${coin.aggregatedAddress} has both txWithdraw and txCpfp")
                }
                txid = coin.txCpfp
            }

            if (txid == null) {
                throw Exception("Coin ${coin.aggregatedAddress} has neither txWithdraw nor txCpfp")
            }

            if (coin.withdrawalAddress == null) {
                throw Exception("Coin ${coin.aggregatedAddress} has no withdrawalAddress")
            }

            val electrumClient = getElectrumClient(clientConfig)

            // TODO: check wallet network
            val netParam = NetworkParameters.fromID(NetworkParameters.ID_TESTNET)
            val scripthash: String = Util.scripthash(netParam, coin.withdrawalAddress!!)

            val responseEntries: List<BlockchainScripthashListUnspentResponseEntry> =
                electrumClient.blockchainScripthashListUnspent(scripthash)

            var utxo: BlockchainScripthashListUnspentResponseEntry? = null;

            responseEntries.forEach { entry ->
                if (entry.txHash == txid) {
                    utxo = entry
                }
            }

            if (utxo == null) {
                return false
            }

            val blockHeader = electrumClient.blockchainHeadersSubscribe()
            val blockheight = blockHeader.height.toUInt()

            electrumClient.closeConnection()

            if (utxo!!.height > 0) {
                val confirmations = blockheight - utxo!!.height.toUInt() + 1u
                return confirmations >= clientConfig.confirmationTarget.toUInt()
            }

            return false
        }

        suspend fun execute(wallet: Wallet, appContext: AppContext) {

            val clientConfig = appContext.clientConfig
            val sqliteManager = appContext.sqliteManager

            // testElect(clientConfig)

            wallet.coins.forEach { coin ->
                if (coin.status == CoinStatus.INITIALISED || coin.status == CoinStatus.IN_MEMPOOL || coin.status == CoinStatus.UNCONFIRMED) {
                    val depositResult = checkDeposit(coin, clientConfig, wallet.network)

                    if (depositResult != null) {
                        wallet.activities = wallet.activities.plus(depositResult.activity)
                        sqliteManager.insertBackupTxs(coin.statechainId!!, listOf(depositResult.backupTx))
                    }
                }
                else if (coin.status == CoinStatus.IN_TRANSFER) {
                    val isTransferred = checkTransfer(coin, clientConfig)

                    if (isTransferred) {
                        coin.status = CoinStatus.TRANSFERRED;
                    }
                }
                else if (coin.status == CoinStatus.WITHDRAWING) {
                    val isWithdrawn = checkWithdrawal(coin, clientConfig, wallet.network)

                    if (isWithdrawn) {
                        coin.status = CoinStatus.WITHDRAWN;
                    }
                }
            }

            sqliteManager.updateWallet(wallet)
        }
    }
}