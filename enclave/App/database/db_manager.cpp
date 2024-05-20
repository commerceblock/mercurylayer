#include "db_manager.h"

#include "../../utils/strencodings.h"
#include "../Enclave_u.h"
#include "../lib/toml.hpp"
#include "../utilities/utilities.h"
#include <iostream>
#include <memory>
#include <pqxx/pqxx>
#include <string>
namespace db_manager {

    std::string getDatabaseConnectionString() {
        const char* value = std::getenv("ENCLAVE_DATABASE_URL");

        if (value == nullptr) {
            auto config = toml::parse_file("Settings.toml");
            return config["intel_sgx"]["database_connection_string"].as_string()->get();
        } else {
            return std::string(value);        
        }
    }

    // Assumes the buffer is large enough. In a real application, ensure buffer safety.
    void serialize(const chacha20_poly1305_encrypted_data* src, unsigned char* buffer, size_t* serialized_len) {
        // Copy `data_len`, `nonce`, and `mac` directly
        size_t offset = 0;
        memcpy(buffer + offset, &src->data_len, sizeof(src->data_len));
        offset += sizeof(src->data_len);

        memcpy(buffer + offset, src->nonce, sizeof(src->nonce));
        offset += sizeof(src->nonce);

        memcpy(buffer + offset, src->mac, sizeof(src->mac));
        offset += sizeof(src->mac);

        // Now copy dynamic `data`
        memcpy(buffer + offset, src->data, src->data_len);
        offset += src->data_len;

        *serialized_len = offset;
    }

    // Returns a newly allocated structure that must be freed by the caller.
    bool deserialize(const unsigned char* buffer, chacha20_poly1305_encrypted_data* dest) {

        if (!dest) return false;

        size_t offset = 0;
        memcpy(&dest->data_len, buffer + offset, sizeof(dest->data_len));
        offset += sizeof(dest->data_len);

        memcpy(dest->nonce, buffer + offset, sizeof(dest->nonce));
        offset += sizeof(dest->nonce);

        memcpy(dest->mac, buffer + offset, sizeof(dest->mac));
        offset += sizeof(dest->mac);

        dest->data = new unsigned char[dest->data_len];
        if (!dest->data) {
            return false; // NULL;
        }
        memcpy(dest->data, buffer + offset, dest->data_len);

        return true;
    }

    bool save_generated_public_key(
        const chacha20_poly1305_encrypted_data& encrypted_keypair, 
        unsigned char* server_public_key, size_t server_public_key_size,
        const std::string& statechain_id,
        std::string& error_message) {

        auto database_connection_string = getDatabaseConnectionString();

        try
        {
            pqxx::connection conn(database_connection_string);
            if (conn.is_open()) {

                std::string create_table_query =
                    "CREATE TABLE IF NOT EXISTS generated_public_key ( "
                    "id SERIAL PRIMARY KEY, "
                    "statechain_id varchar(50), "
                    "sealed_keypair BYTEA, "
                    "sealed_secnonce BYTEA, "
                    "public_nonce BYTEA, "
                    "public_key BYTEA UNIQUE, "
                    "sig_count INTEGER DEFAULT 0);";

                pqxx::work txn(conn);
                txn.exec(create_table_query);
                txn.commit();


                size_t serialized_len = 0;

                size_t bufferSize = sizeof(encrypted_keypair.data_len) + sizeof(encrypted_keypair.nonce) + sizeof(encrypted_keypair.mac) + encrypted_keypair.data_len;
                unsigned char* buffer = (unsigned char*) malloc(bufferSize);

                if (!buffer) {
                    error_message = "Failed to allocate memory for serialization!";
                    return false;
                }

                serialize(&encrypted_keypair, buffer, &serialized_len);
                assert(serialized_len == bufferSize);

                std::basic_string_view<std::byte> sealed_data_view(reinterpret_cast<std::byte*>(buffer), bufferSize);
                std::basic_string_view<std::byte> public_key_data_view(reinterpret_cast<std::byte*>(server_public_key), server_public_key_size);

                std::string insert_query =
                    "INSERT INTO generated_public_key (sealed_keypair, public_key, statechain_id) VALUES ($1, $2, $3);";
                pqxx::work txn2(conn);

                txn2.exec_params(insert_query, sealed_data_view, public_key_data_view, statechain_id);
                txn2.commit();

                conn.close();
                return true;

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
    }

    bool load_generated_key_data(
        const std::string& statechain_id, 
        std::unique_ptr<chacha20_poly1305_encrypted_data>& encrypted_keypair,
        std::unique_ptr<chacha20_poly1305_encrypted_data>& encrypted_secnonce,
        unsigned char* public_nonce, const size_t public_nonce_size, 
        std::string& error_message)
    {
        auto database_connection_string = getDatabaseConnectionString();

        try
        {
            pqxx::connection conn(database_connection_string);
            if (conn.is_open()) {

                std::string sealed_keypair_query =
                    "SELECT sealed_keypair, sealed_secnonce, public_nonce FROM generated_public_key WHERE statechain_id = $1;";

                pqxx::nontransaction ntxn(conn);

                conn.prepare("load_generated_key_data_query", sealed_keypair_query);

                pqxx::result result = ntxn.exec_prepared("load_generated_key_data_query", statechain_id);

                if (!result.empty()) {
                    auto sealed_keypair_field = result[0]["sealed_keypair"];
                    auto sealed_secnonce_field = result[0]["sealed_secnonce"];
                    auto public_nonce_field = result[0]["public_nonce"];

                    if (sealed_keypair_field.is_null()) {
                        encrypted_keypair.reset();
                    } else if (encrypted_keypair != nullptr) {
                        auto sealed_keypair_view = sealed_keypair_field.as<std::basic_string<std::byte>>();

                        std::vector<unsigned char> sealed_keypair(sealed_keypair_view.size());
                        memcpy(sealed_keypair.data(), sealed_keypair_view.data(), sealed_keypair_view.size());

                        if (!deserialize(sealed_keypair.data(), encrypted_keypair.get())) {
                            error_message = "Failed to deserialize keypair!";
                            return false;
                        }
                    }

                    if (sealed_secnonce_field.is_null()) {
                        encrypted_secnonce.reset();
                    } else if (encrypted_secnonce != nullptr) {
                        auto sealed_secnonce_view = sealed_secnonce_field.as<std::basic_string<std::byte>>();

                        std::vector<unsigned char> sealed_secnonce(sealed_secnonce_view.size());
                        memcpy(sealed_secnonce.data(), sealed_secnonce_view.data(), sealed_secnonce_view.size());

                        if (!deserialize(sealed_secnonce.data(), encrypted_secnonce.get())) {
                            error_message = "Failed to deserialize keypair!";
                            return false;
                        }
                    } 

                    if (!public_nonce_field.is_null() && public_nonce != nullptr) {
                        auto public_nonce_view = public_nonce_field.as<std::basic_string<std::byte>>();

                        if (public_nonce_view.size() != public_nonce_size) {
                            error_message = "Failed to retrieve public nonce. Different size than expected !";
                            return false;
                        }

                        memcpy(public_nonce, public_nonce_view.data(), public_nonce_size);
                    }
                }
                else {
                    error_message = "Failed to retrieve keypair. No data found !";
                    return false;
                }

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
    }

    bool update_sealed_secnonce(
        const std::string& statechain_id, 
        unsigned char* serialized_server_pubnonce, const size_t serialized_server_pubnonce_size, 
        const chacha20_poly1305_encrypted_data& encrypted_secnonce, 
        std::string& error_message) 
    {
        auto database_connection_string = getDatabaseConnectionString();

        try
        {
            pqxx::connection conn(database_connection_string);
            if (conn.is_open()) {

                size_t serialized_len = 0;

                size_t bufferSize = sizeof(encrypted_secnonce.data_len) + sizeof(encrypted_secnonce.nonce) + sizeof(encrypted_secnonce.mac) + encrypted_secnonce.data_len;
                unsigned char* buffer = (unsigned char*) malloc(bufferSize);

                if (!buffer) {
                    error_message = "Failed to allocate memory for serialization!";
                    return false;
                }

                serialize(&encrypted_secnonce, buffer, &serialized_len);
                assert(serialized_len == bufferSize);

                std::basic_string_view<std::byte> sealed_secnonce_view(reinterpret_cast<std::byte*>(buffer), bufferSize);
                std::basic_string_view<std::byte> serialized_server_pubnonce_view(reinterpret_cast<std::byte*>(serialized_server_pubnonce), serialized_server_pubnonce_size);

                std::string updated_query =
                    "UPDATE generated_public_key SET public_nonce = $1, sealed_secnonce = $2 WHERE statechain_id = $3";
                pqxx::work txn(conn);

                txn.exec_params(updated_query, serialized_server_pubnonce_view, sealed_secnonce_view, statechain_id);
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
    }

    bool update_sig_count(const std::string& statechain_id) 
    {
        auto database_connection_string = getDatabaseConnectionString();

        try
        {
            pqxx::connection conn(database_connection_string);
            if (conn.is_open()) {

                std::string update_query =
                    "UPDATE generated_public_key SET sig_count = sig_count + 1 WHERE statechain_id = $1;";
                pqxx::work txn(conn);

                txn.exec_params(update_query, statechain_id);
                txn.commit();

                conn.close();
                return true;
            } else {
                return false;
            }
        }
        catch (std::exception const &e)
        {
            return false;
        }
    }

    bool signature_count(const std::string& statechain_id, int& sig_count) {

        auto database_connection_string = getDatabaseConnectionString();

        try
        {
            pqxx::connection conn(database_connection_string);
            if (conn.is_open()) {

                std::string sig_count_query =
                    "SELECT sig_count FROM generated_public_key WHERE statechain_id = $1;";
            
                pqxx::nontransaction ntxn(conn);

                conn.prepare("sig_count_query", sig_count_query);

                pqxx::result result = ntxn.exec_prepared("sig_count_query", statechain_id);

                if (!result.empty()) {
                    auto sig_count_field = result[0]["sig_count"];
                    if (!sig_count_field.is_null()) {
                        sig_count = sig_count_field.as<int>();
                        return true;
                    }
                }
                
                conn.close();
                return true;
            } else {
                return false;
            }
        }
        catch (std::exception const &e)
        {
            return false;
        }
    }

    bool update_sealed_keypair(
        const chacha20_poly1305_encrypted_data& encrypted_keypair, 
        unsigned char* server_public_key, size_t server_public_key_size,
        const std::string& statechain_id,
        std::string& error_message) 
    {
        auto database_connection_string = getDatabaseConnectionString();

        try
        {
            pqxx::connection conn(database_connection_string);
            if (conn.is_open()) {

                std::string insert_query =
                    "UPDATE generated_public_key "
                    "SET sealed_keypair = $1, public_key = $2, sealed_secnonce = NULL, public_nonce = NULL "
                    "WHERE statechain_id = $3;";
                pqxx::work txn2(conn);

                size_t serialized_len = 0;

                size_t bufferSize = sizeof(encrypted_keypair.data_len) + sizeof(encrypted_keypair.nonce) + sizeof(encrypted_keypair.mac) + encrypted_keypair.data_len;
                unsigned char* buffer = (unsigned char*) malloc(bufferSize);

                if (!buffer) {
                    error_message = "Failed to allocate memory for serialization!";
                    return false;
                }

                serialize(&encrypted_keypair, buffer, &serialized_len);
                assert(serialized_len == bufferSize);

                std::basic_string_view<std::byte> sealed_data_view(reinterpret_cast<std::byte*>(buffer), bufferSize);
                std::basic_string_view<std::byte> public_key_data_view(reinterpret_cast<std::byte*>(server_public_key), server_public_key_size);

                txn2.exec_params(insert_query, sealed_data_view, public_key_data_view, statechain_id);
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
    }

    bool delete_statechain(const std::string& statechain_id) {
        auto database_connection_string = getDatabaseConnectionString();

        std::string error_message;
        pqxx::connection conn(database_connection_string);
        if (conn.is_open()) {

            std::string delete_comm =
                "DELETE FROM generated_public_key WHERE statechain_id = $1;";
            pqxx::work txn2(conn);

            txn2.exec_params(delete_comm, statechain_id);
            txn2.commit();

            conn.close();

            return true;
        } else {
            return false;
        }
    }
}