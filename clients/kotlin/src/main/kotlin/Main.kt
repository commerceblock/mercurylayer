import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.context
import com.github.ajalt.clikt.core.subcommands

import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.serialization.kotlinx.json.*
import org.electrumj.ElectrumClient
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

fun createActivity(utxo: String, amount: UInt, action: String): Activity {
    val date = ZonedDateTime.now() // This will get the current date and time in UTC
    val isoString = date.format(DateTimeFormatter.ISO_ZONED_DATE_TIME) // Converts the date to an ISO 8601 string

    return Activity(
        utxo = utxo,
        amount = amount,
        action = action,
        date = isoString
    )
}

fun splitUrl(electrumServerUrl: String): Triple<String, String, Int> {
    val protocolEndIndex = electrumServerUrl.indexOf("://")
    if (protocolEndIndex == -1) throw IllegalArgumentException("Invalid URL: Protocol delimiter not found")

    val protocol = electrumServerUrl.substring(0, protocolEndIndex)
    val remainder = electrumServerUrl.substring(protocolEndIndex + 3)

    val colonIndex = remainder.lastIndexOf(':')
    if (colonIndex == -1) throw IllegalArgumentException("Invalid URL: Port delimiter not found")

    val host = remainder.substring(0, colonIndex)
    val port = remainder.substring(colonIndex + 1).toIntOrNull()
        ?: throw IllegalArgumentException("Invalid URL: Port is not an integer")

    return Triple(protocol, host, port)
}

fun getElectrumClient(clientConfig: ClientConfig): ElectrumClient{

    val (protocol, host, port) = splitUrl(clientConfig.electrumServer)

    val electrumClient = ElectrumClient(host, port)

    var isSecure = false

    if (protocol == "ssl") {
        isSecure = true
    }

    electrumClient.openConnection(isSecure)

    return electrumClient;
}

suspend fun getInfoConfig(clientConfig: ClientConfig): InfoConfig {
    val endpoint = "info/config"

    // TODO: add support to Tor

    val url = clientConfig.statechainEntity + "/" + endpoint;

    // val client = HttpClient(CIO)
    val httpClient = HttpClient(CIO) {
        install(ContentNegotiation) {
            json()
        }
    }

    val serverConfig: ServerConfig = httpClient.get(url).body()

    httpClient.close()

    val electrumClient = getElectrumClient(clientConfig)

    var feeRateBtcPerKb = electrumClient.blockchainEstimatefee(3);

    if (feeRateBtcPerKb <= 0.0) {
        feeRateBtcPerKb = 0.00001;
    }

    val feeRateSatsPerByte = (feeRateBtcPerKb * 100000.0).toULong();

    electrumClient.closeConnection()

    return InfoConfig(
        serverConfig.initlock,
        serverConfig.interval,
        feeRateSatsPerByte
    )
}

data class AppContext(
    val clientConfig: ClientConfig,
    val sqliteManager: SqliteManager
)

//TIP To <b>Run</b> code, press <shortcut actionId="Run"/> or
// click the <icon src="AllIcons.Actions.Execute"/> icon in the gutter.
class MainCommand : CliktCommand() {
    private val clientConfig = ClientConfig()
    private val sqliteManager = SqliteManager(clientConfig)

    init {

        context {
            obj = AppContext(clientConfig, sqliteManager)
        }
    }

    override fun run() = Unit // Main command does nothing on its own
}

fun main(args: Array<String>) = MainCommand()
    .subcommands(
        CreateWallet(),
        Deposit(),
        ListStatecoins(),
        Withdraw(),
        BroadcastBackupTransaction(),
        NewTransferAddress(),
        TransferSend(),
        TransferReceive()
    )
    .main(args)
