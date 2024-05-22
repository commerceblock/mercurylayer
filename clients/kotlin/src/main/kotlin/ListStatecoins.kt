import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.*

class ListStatecoins: CliktCommand(help = "List all wallet' statecoins") {

    private val walletName: String by argument(help = "Name of the wallet to create")

    private val appContext: AppContext by lazy {
        requireNotNull(currentContext.findObject() as? AppContext) {
            "ClientConfig not found in context"
        }
    }

    override fun run() {

        // TODO: not recommend for production. Change to use CoroutineScope or another approach
        runBlocking {
            val wallet = appContext.sqliteManager.loadWallet(walletName)

            CoinUpdate.execute(wallet, appContext)

            val resultJson = buildJsonObject {
                putJsonArray("coins") {
                    wallet.coins.forEach { coin ->
                        add(buildJsonObject {
                            put("statechain_id", coin.statechainId ?: "Empty")
                            put("amount", coin.amount.toString())
                            put("status", coin.status.toString())
                            put("deposit_address", coin.aggregatedAddress ?: "Empty")
                            put("statechain_address", coin.address ?: "Empty")
                            put("locktime", coin.locktime.toString())
                        })
                    }
                }
            }

            val prettyJsonString = Json { prettyPrint = true }.encodeToString(JsonObject.serializer(), resultJson)
            println(prettyJsonString)
        }
    }
}