import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.option
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.UUID

class NewTransferAddress: CliktCommand(help = "New transfer address for a statecoin") {

    private val walletName: String by argument(help = "Name of the wallet to create")

    private val generateBatchId: Boolean by option("-b", "--generate-batch-id",
        help = "Generate a batch ID for the transfer").flag(default = false)

    private val appContext: AppContext by lazy {
        requireNotNull(currentContext.findObject() as? AppContext) {
            "ClientConfig not found in context"
        }
    }

    override fun run() {
        val wallet = appContext.sqliteManager.loadWallet(walletName)

        val coin = getNewCoin(wallet)
        wallet.coins = wallet.coins.plus(coin)

        appContext.sqliteManager.updateWallet(wallet)

        val json = buildJsonObject {
            put("transfer-address", coin.address)
            if (generateBatchId) {
                put("batch-id", UUID.randomUUID().toString())
            }
        }

        val prettyJsonString = Json { prettyPrint = true }.encodeToString(JsonObject.serializer(), json)
        println(prettyJsonString)
    }
}