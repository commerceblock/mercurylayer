import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class NewTransferAddress: CliktCommand(help = "New transfer address for a statecoin") {

    private val walletName: String by argument(help = "Name of the wallet to create")

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
        }

        println(Json.encodeToString(json))
    }
}