#include "db_manager.h"

#include "../lib/toml.hpp"
#include <string>
#include <pqxx/pqxx>

namespace db_manager {

    bool add_sealed_seed(char* sealed_secret, size_t sealed_secret_size, std::string& error_message) {

        auto config = toml::parse_file("Settings.toml");
        auto database_connection_string = config["intel_sgx"]["database_connection_string"].as_string()->get();

        try
        {
            pqxx::connection conn(database_connection_string);
            if (conn.is_open()) {

                std::string create_table_query =
                    "CREATE TABLE IF NOT EXISTS seed ( "
                    "id SERIAL PRIMARY KEY, "
                    "sealed_seed BYTEA NOT NULL);";

                pqxx::work txn(conn);
                txn.exec(create_table_query);
                txn.commit();

                std::string insert_command = "INSERT INTO seed (sealed_seed) VALUES ($1);";
                pqxx::work txn2(conn);

                std::basic_string_view<std::byte> sealed_data_view(reinterpret_cast<std::byte*>(sealed_secret), sealed_secret_size);

                txn2.exec_params(insert_command, sealed_data_view);
                txn2.commit();

                conn.close();
                return true;
            } else {
                error_message = "Failed to connect to the database!";
                return false;
            }
        }
        catch (std::exception const &e)
        {
            error_message = e.what();
            return false;
        }

        return true;

    } // add_sealed_seed

    bool get_sealed_seed(char* sealed_secret, size_t sealed_secret_size, std::string& error_message) {

        auto config = toml::parse_file("Settings.toml");
        auto database_connection_string = config["intel_sgx"]["database_connection_string"].as_string()->get();

        try
        {
            pqxx::connection conn(database_connection_string);
            if (conn.is_open()) {

                std::string select_command = "SELECT sealed_seed FROM seed ORDER BY id DESC LIMIT 1;";
                pqxx::work txn(conn);

                pqxx::result result = txn.exec(select_command);

                if (result.size() == 0) {
                    error_message = "No sealed seed found!";
                    return false;
                }

                pqxx::binarystring sealed_data = result[0]["sealed_seed"].as<pqxx::binarystring>();

                if (sealed_data.size() != sealed_secret_size) {
                    error_message = "Failed to retrieve keypair. Different size than expected !";
                    return false;
                }

                std::memcpy(sealed_secret, sealed_data.data(), sealed_data.size());

                txn.commit();
                conn.close();
                return true;
            } else {
                error_message = "Failed to connect to the database!";
                return false;
            }
        }
        catch (std::exception const &e)
        {
            error_message = e.what();
            return false;
        }

        return true;

    } // get_sealed_seed
}