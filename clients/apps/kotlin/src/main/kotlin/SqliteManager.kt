import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import java.sql.DriverManager

class SqliteManager(clientConfig: ClientConfig) {

    private val databaseUrl = "jdbc:sqlite:" + clientConfig.databaseFile

    init {
        createDatabase()
    }

    private fun createDatabase() {
        DriverManager.getConnection(databaseUrl).use { conn ->
            conn.createStatement().use { statement ->
                statement.execute("CREATE TABLE IF NOT EXISTS wallet (wallet_name TEXT NOT NULL UNIQUE, wallet_json TEXT NOT NULL)")
                statement.execute("CREATE TABLE IF NOT EXISTS backup_txs (statechain_id TEXT NOT NULL, txs TEXT NOT NULL)")
            }
        }
    }

    fun insertWallet(wallet: Wallet) {

        val walletJson = Json.encodeToString(Wallet.serializer(), wallet)

        DriverManager.getConnection(databaseUrl).use { conn ->
            conn.prepareStatement("INSERT INTO wallet (wallet_name, wallet_json) VALUES (?, ?)").use { statement ->
                statement.setString(1, wallet.name)
                statement.setString(2, walletJson)
                statement.executeUpdate()
            }
        }
    }

    fun loadWallet(walletName: String) : Wallet {
        DriverManager.getConnection(databaseUrl).use { conn ->
            conn.prepareStatement("SELECT wallet_json FROM wallet WHERE wallet_name = ?").use { statement ->
                statement.setString(1, walletName)
                val rs = statement.executeQuery()
                if (rs.next()) {
                    val walletJson = rs.getString("wallet_json");
                    val wallet = Json.decodeFromString(Wallet.serializer(), walletJson)
                    return wallet
                } else {
                    throw InternalException("Wallet $walletName not found !")
                }
            }
        }
    }

    fun updateWallet(wallet: Wallet) {

        val walletJson = Json.encodeToString(Wallet.serializer(), wallet)

        DriverManager.getConnection(databaseUrl).use { conn ->
            conn.prepareStatement("UPDATE wallet SET wallet_json = ? WHERE wallet_name = ?").use { statement ->
                statement.setString(1, walletJson)
                statement.setString(2, wallet.name)
                statement.executeUpdate()
            }
        }
    }

    fun insertBackupTxs(statechainId: String, listBackupTx: List<BackupTx>) {

        val listBackupTxJson = Json.encodeToString(ListSerializer(BackupTx.serializer()), listBackupTx)

        DriverManager.getConnection(databaseUrl).use { conn ->
            conn.prepareStatement("INSERT INTO backup_txs (statechain_id, txs) VALUES (?, ?)").use { statement ->
                statement.setString(1, statechainId)
                statement.setString(2, listBackupTxJson)
                statement.executeUpdate()
            }
        }
    }

    fun getBackupTxs(statechainId: String): List<BackupTx> {
        DriverManager.getConnection(databaseUrl).use { conn ->
            conn.prepareStatement("SELECT txs FROM backup_txs WHERE statechain_id = ?").use { statement ->
                statement.setString(1, statechainId)
                val rs = statement.executeQuery()
                if (rs.next()) {
                    val txsJson = rs.getString("txs");
                    val backupTxs = Json.decodeFromString(ListSerializer(BackupTx.serializer()), txsJson)
                    return backupTxs
                } else {
                    throw InternalException("StatechainId $statechainId not found !")
                }
            }
        }
    }

    fun updateBackupTxs(statechainId: String, listBackupTx: List<BackupTx>) {

        val listBackupTxJson = Json.encodeToString(ListSerializer(BackupTx.serializer()), listBackupTx)

        DriverManager.getConnection(databaseUrl).use { conn ->
            conn.prepareStatement("UPDATE backup_txs SET txs = ? WHERE statechain_id = ?").use { statement ->
                statement.setString(1, listBackupTxJson)
                statement.setString(2, statechainId)
                statement.executeUpdate()
            }
        }
    }

    fun insertOrUpdateBackupTxs(statechainId: String, listBackupTx: List<BackupTx>) {

        DriverManager.getConnection(databaseUrl).use { conn ->
            conn.prepareStatement("DELETE FROM backup_txs WHERE statechain_id = ?").use { statement ->
                statement.setString(1, statechainId)
                statement.executeUpdate()
            }

            val listBackupTxJson = Json.encodeToString(ListSerializer(BackupTx.serializer()), listBackupTx)

            conn.prepareStatement("INSERT INTO backup_txs (statechain_id, txs) VALUES (?, ?)").use { statement ->
                statement.setString(1, statechainId)
                statement.setString(2, listBackupTxJson)
                statement.executeUpdate()
            }
        }

    }
}