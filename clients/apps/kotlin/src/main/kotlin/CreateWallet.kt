import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class CreateWallet : CliktCommand(help = "Creates a new wallet") {
    private val walletName: String by argument(help = "Name of the wallet to create")

    private val appContext: AppContext by lazy {
        requireNotNull(currentContext.findObject() as? AppContext) {
            "ClientConfig not found in context"
        }
    }

    override fun run() {

        val clientConfig = appContext.clientConfig;
        val sqliteManager = appContext.sqliteManager;

        var mnemonic: String? = null

        try {
            mnemonic = generateMnemonic()
        } catch (e: MercuryException) {
            println("Failed to generate mnemonic: ${e.message}")
        }

        var infoConfig: InfoConfig? = null

        // TODO: not recommend for production. Change to use CoroutineScope or another approach
        runBlocking {
            infoConfig = getInfoConfig(clientConfig)
        }

        if (infoConfig == null) {
            println("ERROR: infoConfig is null.")
            return
        }

        val electrumClient = getElectrumClient(clientConfig)

        val blockHeader = electrumClient.blockchainHeadersSubscribe()
        val blockheight = blockHeader.height.toUInt();

        electrumClient.closeConnection()

        val notifications = false;
        val tutorials = false;

        val (electrumProtocol, electrumHost, electrumPort) = splitUrl(clientConfig.electrumServer)

        val settings = Settings(
            clientConfig.network,
            null,
            null,
            null,
            null,
            null,
            clientConfig.statechainEntity,
            null,
            electrumProtocol,
            electrumHost,
            electrumPort.toString(),
            clientConfig.electrumType,
            notifications,
            tutorials
        )

        val mutableTokenList: MutableList<Token> = mutableListOf()
        val mutableActivityList: MutableList<Activity> = mutableListOf()
        val mutableCoinList: MutableList<Coin> = mutableListOf()

        val wallet = Wallet(
            walletName,
            mnemonic!!,
            "0.0.1",
            clientConfig.statechainEntity,
            clientConfig.electrumServer,
            clientConfig.network,
            blockheight,
            infoConfig!!.initlock,
            infoConfig!!.interval,
            mutableTokenList,
            mutableActivityList,
            mutableCoinList,
            settings
        )

        sqliteManager.insertWallet(wallet);

        val json = buildJsonObject {
            put("result", "Wallet '$walletName' has been created successfully.")
        }

        println(Json.encodeToString(json))
    }
}