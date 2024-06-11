import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.arguments.convert
import com.github.ajalt.clikt.parameters.arguments.optional
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class Withdraw: CliktCommand(help = "Withdraw funds from a statecoin to a BTC address") {

    private val walletName: String by argument(help = "Name of the wallet")

    private val statechainId: String by argument(help = "Statechain id")

    private val toAddress: String by argument(help = "Address to send the funds")

    private val feeRate: UInt? by argument(help = "Fee Rate").convert { it.toUInt() }.optional()

    private val appContext: AppContext by lazy {
        requireNotNull(currentContext.findObject() as? AppContext) {
            "ClientConfig not found in context"
        }
    }

    private suspend fun execute() {
        val wallet = appContext.sqliteManager.loadWallet(walletName)

        CoinUpdate.execute(wallet, appContext)

        if (!validateAddress(toAddress, wallet.network)) {
            throw Exception("Invalid address")
        }

        var backupTxs = appContext.sqliteManager.getBackupTxs(statechainId)

        if (backupTxs.isEmpty()) {
            throw Exception("No backup transaction associated with this statechain ID were found")
        }

        val qtBackupTx = backupTxs.count()

        val newTxN = qtBackupTx + 1

        val coin = wallet.coins
            .filter { tx -> tx.statechainId == statechainId.toString() } // Filter coins with the specified statechainId
            .minByOrNull { tx -> tx.locktime!! } // Find the one with the lowest locktime

        if (coin == null) {
            throw Exception("No coins associated with this statechain ID were found")
        }

        if (coin.amount == null) {
            throw Exception("coin.amount is None")
        }

        if (coin.status != CoinStatus.CONFIRMED && coin.status != CoinStatus.IN_TRANSFER) {
            throw Exception("Coin status must be CONFIRMED or IN_TRANSFER to transfer it. The current status is ${coin.status}");
        }

        val infoConfig = getInfoConfig(appContext.clientConfig)

        var feeRateSatsPerByte: UInt = 0u

        if (feeRate == null) {
            feeRateSatsPerByte = if (infoConfig.feeRateSatsPerByte > appContext.clientConfig.maxFeeRate.toUInt()) {
                appContext.clientConfig.maxFeeRate.toUInt()
            } else {
                infoConfig.feeRateSatsPerByte.toUInt()
            }
        } else {
            feeRateSatsPerByte = feeRate as UInt
        }

        val signedTx = Transaction.create(
            coin,
            appContext.clientConfig,
            null,
            qtBackupTx.toUInt(),
            toAddress,
            wallet.network,
            false,
            feeRateSatsPerByte,
            infoConfig.initlock,
            infoConfig.interval
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
            txN = newTxN.toUInt(),
            tx = signedTx,
            clientPublicNonce = coin.publicNonce ?: throw Exception("publicNonce is null"),
            serverPublicNonce = coin.serverPublicNonce ?: throw Exception("serverPublicNonce is null"),
            clientPublicKey = coin.userPubkey,
            serverPublicKey = coin.serverPubkey ?: throw Exception("serverPubkey is null"),
            blindingFactor = coin.blindingFactor ?: throw Exception("blindingFactor is null")
        )

        backupTxs = backupTxs.plus(backupTx)

        appContext.sqliteManager.updateBackupTxs(coin.statechainId!!, backupTxs)

        val electrumClient = getElectrumClient(appContext.clientConfig)

        val txId = electrumClient.blockchainTransactionBroadcast(signedTx)

        electrumClient.closeConnection()

        coin.txWithdraw = txId
        coin.withdrawalAddress = toAddress
        coin.status = CoinStatus.WITHDRAWING

        val activity = createActivity(txId, coin.amount!!, "Withdraw")

        wallet.activities = wallet.activities.plus(activity)

        appContext.sqliteManager.updateWallet(wallet)

        completeWithdraw(appContext.clientConfig, coin.statechainId!!, coin.signedStatechainId!!)

        val json = buildJsonObject {
            put("txId", txId)
        }

        println(Json.encodeToString(json))
    }

    override fun run() {
        runBlocking { execute() }
    }
}