import com.akuleshov7.ktoml.Toml
import com.akuleshov7.ktoml.TomlInputConfig
import com.akuleshov7.ktoml.parsers.TomlParser
import com.akuleshov7.ktoml.source.decodeFromStream
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.io.File
import java.io.InputStream

@Serializable
data class ConfigData(
    @SerialName("statechain_entity")
    val statechainEntity: String,
    @SerialName("electrum_server")
    val electrumServer: String,
    @SerialName("electrum_type")
    val electrumType: String,
    @SerialName("network")
    val network: String,
    @SerialName("fee_rate_tolerance")
    val feeRateTolerance: Short,
    @SerialName("database_file")
    val databaseFile: String,
    @SerialName("confirmation_target")
    val confirmationTarget: Short,
    @SerialName("max_fee_rate")
    val maxFeeRate: Short,
)

class ClientConfig {

    val statechainEntity: String
    val electrumServer: String
    val electrumType: String
    val network: String
    val feeRateTolerance: Int
    val databaseFile: String
    val confirmationTarget: Int
    val maxFeeRate: Int

    init {
        val file = File("Settings.toml")
        if (!file.exists()) {
            throw Exception("The file 'Settings.toml' does not exist.")
        }

        val configData = Toml.decodeFromStream<ConfigData>(file.inputStream())

        statechainEntity = configData.statechainEntity
        electrumServer = configData.electrumServer
        electrumType = configData.electrumType
        network = configData.network
        feeRateTolerance = configData.feeRateTolerance.toInt()
        databaseFile = configData.databaseFile
        confirmationTarget = configData.confirmationTarget.toInt()
        maxFeeRate = configData.maxFeeRate.toInt()
    }
}