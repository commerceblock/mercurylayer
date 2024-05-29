import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.arguments.convert
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject

class Deposit: CliktCommand(help = "Generates a new deposit address", name = "new-deposit-address") {

    private val walletName: String by argument(help = "Name of the wallet to create")

    private val amount: UInt by argument(help = "Statecoin amount").convert { it.toUInt() }

    private val appContext: AppContext by lazy {
        requireNotNull(currentContext.findObject() as? AppContext) {
            "ClientConfig not found in context"
        }
    }

    private suspend fun getTokenFromServer() : Token {
        val endpoint = "tokens/token_init"

        val clientConfig = appContext.clientConfig;

        val url = clientConfig.statechainEntity + "/" + endpoint;

        val httpClient = HttpClient(CIO) {
            install(ContentNegotiation) {
                json()
            }
        }

        val token: Token = httpClient.get(url).body()

        httpClient.close()

        return token
    }

    private suspend fun addTokenToWallet(wallet: Wallet) {
        val token = getTokenFromServer()
        token.confirmed = true
        wallet.tokens = wallet.tokens.plus(token)

        appContext.sqliteManager.updateWallet(wallet)
    }

    private suspend fun execute(wallet: Wallet, token: Token, amount: UInt) {

        val coin = getNewCoin(wallet)
        wallet.coins = wallet.coins.plus(coin)

        appContext.sqliteManager.updateWallet(wallet)

        val depositMsg1 = createDepositMsg1(coin, token.tokenId)

        val httpClient = HttpClient(CIO) {
            install(ContentNegotiation) {
                json()
            }
        }

        val url = appContext.clientConfig.statechainEntity + "/" + "deposit/init/pod"

        val depositMsg1Response: DepositMsg1Response = httpClient.post(url) {
            contentType(ContentType.Application.Json)
            setBody(depositMsg1)
        }.body()

        httpClient.close()

        val depositInitResult = handleDepositMsg1Response(coin, depositMsg1Response)

        coin.statechainId = depositInitResult.statechainId;
        coin.signedStatechainId = depositInitResult.signedStatechainId;
        coin.serverPubkey = depositInitResult.serverPubkey;

        val aggregatedPublicKey = createAggregatedAddress(coin, wallet.network);

        coin.amount = amount
        coin.aggregatedAddress = aggregatedPublicKey.aggregateAddress;
        coin.aggregatedPubkey = aggregatedPublicKey.aggregatePubkey;

        token.spent = true

        appContext.sqliteManager.updateWallet(wallet)

        val json = buildJsonObject {
            put("deposit_address", coin.aggregatedAddress!!)
            put("statechain_id", coin.statechainId!!)
        }

        println(Json.encodeToString(json))
    }

    override fun run() {
        val wallet = appContext.sqliteManager.loadWallet(walletName)

        runBlocking {
            addTokenToWallet(wallet)

            val foundToken = wallet.tokens.find { token -> token.confirmed && !token.spent }

            if (foundToken == null) {
                throw Exception("There is no token available")
            }

            execute(wallet, foundToken, amount)
        }
    }
}