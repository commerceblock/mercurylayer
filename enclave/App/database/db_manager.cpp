#include "db_manager.h"

#include "../Enclave_u.h"
#include "../lib/toml.hpp"
#include "../../utils/strencodings.h"
#include <iostream>
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
    bool deserialize(const unsigned char* buffer, size_t serialized_len, chacha20_poly1305_encrypted_data* dest) {

        // chacha20_poly1305_encrypted_data* dest = new chacha20_poly1305_encrypted_data;
        // if (!dest) return NULL;

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
        // offset += dest->data_len; // Not needed unless you're reading more data after this

        // return dest;
        return true;
    }

    void print_encrypted_data(const chacha20_poly1305_encrypted_data* data) {
        std::cout << "data_len: " << data->data_len << std::endl;
        std::cout << "nonce: " << key_to_string(data->nonce, sizeof(data->nonce)) << std::endl;
        std::cout << "mac: " << key_to_string(data->mac, sizeof(data->mac)) << std::endl;
        std::cout << "data: " << key_to_string(data->data, data->data_len) << std::endl;
    }

    bool save_generated_public_key(
        const chacha20_poly1305_encrypted_data& encrypted_keypair, 
        unsigned char* server_public_key, size_t server_public_key_size,
        std::string& statechain_id,
        std::string& error_message) {

            auto config = toml::parse_file("Settings.toml");
            auto database_connection_string = config["intel_sgx"]["database_connection_string"].as_string()->get();

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

                    /* auto buffer_hex = key_to_string(buffer, serialized_len);

                    std::cout << "---- " << std::endl;
                    print_encrypted_data(&encrypted_keypair);
                    std::cout << "---- " << std::endl;
                    std::cout << "buffer: " << buffer_hex << std::endl;

                    // chacha20_poly1305_encrypted_data* dest = new chacha20_poly1305_encrypted_keypair;
                    auto dest = std::make_unique<chacha20_poly1305_encrypted_data>();
                    bool res = deserialize(buffer, serialized_len, dest.get());

                    std::cout << "---- " << std::endl;
                    std::cout << "res: " << res << std::endl;
                    print_encrypted_data(dest.get());

                    free(buffer); */

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
}