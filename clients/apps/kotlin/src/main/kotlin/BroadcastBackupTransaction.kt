import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.arguments.convert
import com.github.ajalt.clikt.parameters.arguments.optional
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class BroadcastBackupTransaction: CliktCommand(help = "Broadcast a backup transaction via CPFP") {

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

        val backupTxs = appContext.sqliteManager.getBackupTxs(statechainId)

        // val backupTx = if (backupTxs.isEmpty()) null else backupTxs.maxByOrNull { it.txN }

        val coinsWithStatechainId = wallet.coins.filter { it.statechainId == statechainId }

        if (coinsWithStatechainId.isEmpty()) {
            throw Exception("There is no coin for the statechain id $statechainId")
        }

        val coin = coinsWithStatechainId.sortedBy { it.locktime }.first()

        if (coin.status != CoinStatus.CONFIRMED && coin.status != CoinStatus.IN_TRANSFER) {
            throw Exception("Coin status must be CONFIRMED or IN_TRANSFER to transfer it. The current status is ${coin.status}");
        }

        var backupTx: BackupTx?  = null

        try {
            backupTx = latestBackupTxPaysToUserPubkey(backupTxs, coin, wallet.network)
        } catch (e: Exception) {
            println("Error: ${e.message}")
            return
        }

        var feeRateSatsPerByte = feeRate

        if (feeRateSatsPerByte == null) {
            val infoConfig = getInfoConfig(appContext.clientConfig)
            feeRateSatsPerByte = infoConfig.feeRateSatsPerByte.toUInt()
        }

        val cpfpTx = createCpfpTx(backupTx, coin, toAddress, feeRateSatsPerByte.toULong(), wallet.network);

        val electrumClient = getElectrumClient(appContext.clientConfig)

        val backupTxTxid = electrumClient.blockchainTransactionBroadcast(backupTx.tx)

        val cpfpTxTxid = electrumClient.blockchainTransactionBroadcast(cpfpTx)

        electrumClient.closeConnection()

        coin.txCpfp = cpfpTxTxid
        coin.withdrawalAddress = toAddress
        coin.status = CoinStatus.WITHDRAWING

        appContext.sqliteManager.updateWallet(wallet)

        completeWithdraw(appContext.clientConfig, coin.statechainId!!, coin.signedStatechainId!!)

        val json = buildJsonObject {
            put("backupTx", backupTxTxid)
            put("cpfpTx", cpfpTxTxid)
        }

        println(Json.encodeToString(json))
    }

    override fun run() {
        runBlocking { execute() }
    }
}