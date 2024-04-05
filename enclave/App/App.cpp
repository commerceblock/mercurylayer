#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wnon-virtual-dtor"
#pragma GCC diagnostic ignored "-Wcast-qual"
#pragma GCC diagnostic ignored "-Wfloat-equal"
#pragma GCC diagnostic ignored "-Wshadow"
#pragma GCC diagnostic ignored "-Wconversion"
#include <lib/crow_all.h>
#include <lib/toml.hpp>
#pragma GCC diagnostic pop

#include <algorithm>
#include <iomanip>
#include <iostream>
#include <pqxx/pqxx>
#include <stdio.h>
#include <string.h>
#include <sstream>
#include <sys/random.h> // for testing secp256k1-zkp. Can be removed after this.

#include "../utils/include_secp256k1_zkp_lib.h"
#include "../utils/strencodings.h"
#include "utilities/utilities.h"
#include "database/db_manager.h"
#include "statechain/deposit.h"
#include "statechain/sign.h"
#include "sealing_key_manager/sealing_key_manager.h"

#include "App.h"
#include "Enclave_u.h"
#include "sgx_urts.h"
#include "sgx_tcrypto.h"

# define ENCLAVE_FILENAME "enclave.signed.so"

bool update_sealed_keypair(
    std::string& database_connection_string,
    char* sealed, size_t sealed_size, 
    unsigned char* server_public_key, size_t server_public_key_size,
    std::string& statechain_id,
    std::string& error_message) 
{
    try
    {
        pqxx::connection conn(database_connection_string);
        if (conn.is_open()) {

            std::string insert_query =
                "UPDATE generated_public_key "
                "SET sealed_keypair = $1, public_key = $2, sealed_secnonce = NULL, public_nonce = NULL "
                "WHERE statechain_id = $3;";
            pqxx::work txn2(conn);

            std::basic_string_view<std::byte> sealed_data_view(reinterpret_cast<std::byte*>(sealed), sealed_size);
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

bool load_generated_key_data(
    std::string& database_connection_string,
    std::string& statechain_id, 
    char* sealed_keypair, size_t sealed_keypair_size,
    char* sealed_secnonce, size_t sealed_secnonce_size,
    unsigned char* public_nonce, const size_t public_nonce_size, 
    std::string& error_message)
{
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

                if (!sealed_keypair_field.is_null()) {
                    auto sealed_keypair_view = sealed_keypair_field.as<std::basic_string<std::byte>>();
                    
                    if (sealed_keypair_view.size() != sealed_keypair_size) {
                        error_message = "Failed to retrieve keypair. Different size than expected !";
                        return false;
                    }

                    memcpy(sealed_keypair, sealed_keypair_view.data(), sealed_keypair_size);
                }

                if (!sealed_secnonce_field.is_null()) {
                    auto sealed_secnonce_view = sealed_secnonce_field.as<std::basic_string<std::byte>>();

                    if (sealed_secnonce_view.size() != sealed_secnonce_size) {
                        error_message = "Failed to retrieve secret nonce. Different size than expected !";
                        return false;
                    }

                    memcpy(sealed_secnonce, sealed_secnonce_view.data(), sealed_secnonce_size);
                }

                if (!public_nonce_field.is_null()) {
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

/* ocall functions (untrusted) */
void ocall_print_string(const char *str)
{
    printf("%s\n", str);
}

void ocall_print_int(const char *str, const int *number)
{
    printf("%s%d\n", str, *number);
}

void ocall_print_hex(const unsigned char** key, const int *keylen)
{
    printf("%s\n", key_to_string(*key, *keylen).c_str());
}

int SGX_CDECL main(int argc, char *argv[])
{
    (void)(argc);
    (void)(argv);

    crow::SimpleApp app;

    sgx_enclave_id_t enclave_id = 0;
    std::mutex mutex_enclave_id; // protects map_aggregate_key_data

    auto config = toml::parse_file("Settings.toml");
    auto database_connection_string = config["intel_sgx"]["database_connection_string"].as_string()->get();

    {
        const std::lock_guard<std::mutex> lock(mutex_enclave_id);

        // initialize enclave
        sgx_status_t enclave_created = sgx_create_enclave(ENCLAVE_FILENAME, SGX_DEBUG_FLAG, NULL, NULL, &enclave_id, NULL);
        if (enclave_created != SGX_SUCCESS) {
            printf("Enclave init error\n");
            return -1;
        }
    }

    sealing_key_manager::SealingKeyManager sealing_key_manager;
    if (sealing_key_manager.readSeedFromFile()) {
        std::cout << "Seed loaded" << std::endl;
    } else {
        std::cout << "Seed not loaded" << std::endl;
    }

    CROW_ROUTE(app, "/get_public_key")
        .methods("POST"_method)([&enclave_id, &mutex_enclave_id, &sealing_key_manager](const crow::request& req) {

            if (sealing_key_manager.isSeedEmpty()) {
                return crow::response(500, "Sealing key is empty.");
            }

            auto req_body = crow::json::load(req.body);
            if (!req_body)
                return crow::response(400);

            if (req_body.count("statechain_id") == 0)
                return crow::response(400, "Invalid parameter. It must be 'statechain_id'.");

            std::string statechain_id = req_body["statechain_id"].s();

            const std::lock_guard<std::mutex> lock(mutex_enclave_id);

            return deposit::get_public_key(enclave_id, statechain_id, sealing_key_manager);
    });

    CROW_ROUTE(app, "/get_public_nonce")
        .methods("POST"_method)([&enclave_id, &mutex_enclave_id, &sealing_key_manager](const crow::request& req) {

            auto req_body = crow::json::load(req.body);
            if (!req_body)
                return crow::response(400);

            if (req_body.count("statechain_id") == 0) {
                return crow::response(400, "Invalid parameters. They must be 'statechain_id'.");
            }

            std::string statechain_id = req_body["statechain_id"].s();

            const std::lock_guard<std::mutex> lock(mutex_enclave_id);

            return signature::get_public_nonce(enclave_id, statechain_id, sealing_key_manager);
    });
    
    CROW_ROUTE(app, "/get_partial_signature")
    .methods("POST"_method)([&enclave_id, &mutex_enclave_id, &sealing_key_manager](const crow::request& req) {

            auto req_body = crow::json::load(req.body);
            if (!req_body)
                return crow::response(400);

            if (req_body.count("statechain_id") == 0 || 
                req_body.count("negate_seckey") == 0 ||
                req_body.count("session") == 0) {
                return crow::response(400, "Invalid parameters. They must be 'statechain_id', 'negate_seckey' and 'session'.");
            }

            std::string statechain_id = req_body["statechain_id"].s();
            int64_t negate_seckey = req_body["negate_seckey"].i();
            std::string session_hex = req_body["session"].s();


            if (session_hex.substr(0, 2) == "0x") {
                session_hex = session_hex.substr(2);
            }

            std::vector<unsigned char> serialized_session = ParseHex(session_hex);

            if (serialized_session.size() != 133) {
                return crow::response(400, "Invalid session length. Must be 133 bytes!");
            }

            const std::lock_guard<std::mutex> lock(mutex_enclave_id);
            
            return signature::get_partial_signature(enclave_id, statechain_id, negate_seckey, serialized_session, sealing_key_manager); 
    });

    CROW_ROUTE(app,"/signature_count/<string>")
    ([&database_connection_string](std::string statechain_id){

        std::string error_message;
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
                    auto sig_count = sig_count_field.as<int>();
                    crow::json::wvalue response({{"sig_count", sig_count}});
                    return crow::response{response};
                }
            }
            conn.close();
            return crow::response(500, "Failed to retrieve signature count!");
        } else {
            return crow::response(500, "Failed to connect to the database!");
        }

    });

    CROW_ROUTE(app, "/keyupdate")
        .methods("POST"_method)([&enclave_id, &mutex_enclave_id, &database_connection_string](const crow::request& req) {

            auto req_body = crow::json::load(req.body);
            if (!req_body)
                return crow::response(400);

            if (req_body.count("statechain_id") == 0 || 
                req_body.count("t2") == 0 ||
                req_body.count("x1") == 0) {
                return crow::response(400, "Invalid parameters. They must be 'statechain_id', 't2' and 'x1'.");
            }

            std::string statechain_id = req_body["statechain_id"].s();
            std::string t2_hex = req_body["t2"].s();
            std::string x1_hex = req_body["x1"].s();

            if (t2_hex.substr(0, 2) == "0x") {
                t2_hex = t2_hex.substr(2);
            }

            std::vector<unsigned char> serialized_t2 = ParseHex(t2_hex);

            if (serialized_t2.size() != 32) {
                return crow::response(400, "Invalid t2 length. Must be 32 bytes!");
            }

            if (x1_hex.substr(0, 2) == "0x") {
                x1_hex = x1_hex.substr(2);
            }

            std::vector<unsigned char> serialized_x1 = ParseHex(x1_hex);

            if (serialized_x1.size() != 32) {
                return crow::response(400, "Invalid x1 length. Must be 32 bytes!");
            }

            size_t sealed_keypair_size = utils::sgx_calc_sealed_data_size(0U, sizeof(secp256k1_keypair));
            std::vector<char> sealed_keypair(sealed_keypair_size);  // Using a vector to manage dynamic-sized array.

            size_t sealed_secnonce_size = utils::sgx_calc_sealed_data_size(0U, sizeof(secp256k1_musig_secnonce));
            std::vector<char> sealed_secnonce(sealed_secnonce_size);  // Using a vector to manage dynamic-sized array.

            unsigned char serialized_server_pubnonce[66];

            memset(sealed_keypair.data(), 0, sealed_keypair_size);
            memset(sealed_secnonce.data(), 0, sealed_secnonce_size);

            std::string error_message;
            bool data_loaded = load_generated_key_data(
                database_connection_string,
                statechain_id,
                sealed_keypair.data(), sealed_keypair_size,
                sealed_secnonce.data(), sealed_secnonce_size,
                serialized_server_pubnonce, sizeof(serialized_server_pubnonce),
                error_message);

            if (!data_loaded) {
                error_message = "Failed to load aggregated key data: " + error_message;
                return crow::response(500, error_message);
            }

            bool is_sealed_keypair_empty = std::all_of(sealed_keypair.begin(), sealed_keypair.end(), [](char elem){ return elem == 0; });

            if (is_sealed_keypair_empty) {
                return crow::response(400, "Empty sealed keypair!");
            }

            // 1. Allocate memory for the aggregated pubkey and sealedprivkey.
            size_t new_server_pubkey_size = 33; // serialized compressed public keys are 33-byte array
            unsigned char new_server_pubkey[new_server_pubkey_size];

            size_t new_sealedkeypair_size = utils::sgx_calc_sealed_data_size(0U, sizeof(secp256k1_keypair));
            char new_sealedkeypair[new_sealedkeypair_size];

            const std::lock_guard<std::mutex> lock(mutex_enclave_id);

            sgx_status_t ecall_ret;
            sgx_status_t status = key_update(
                enclave_id, &ecall_ret, 
                sealed_keypair.data(), sealed_keypair_size,
                serialized_x1.data(), serialized_x1.size(),
                serialized_t2.data(), serialized_t2.size(),
                new_server_pubkey, new_server_pubkey_size,
                new_sealedkeypair, new_sealedkeypair_size);

            if (ecall_ret != SGX_SUCCESS) {
                return crow::response(500, "Key aggregation Ecall failed ");
            }  if (status != SGX_SUCCESS) {
                return crow::response(500, "Key aggregation failed ");
            }

            bool data_saved = update_sealed_keypair(
                database_connection_string, new_sealedkeypair, new_sealedkeypair_size, new_server_pubkey, new_server_pubkey_size, statechain_id, error_message);

            if (!data_saved) {
                error_message = "Failed to update aggregated key data: " + error_message;
                return crow::response(500, error_message);
            }

            auto new_server_seckey_hex = key_to_string(new_server_pubkey, new_server_pubkey_size);

            crow::json::wvalue result({{"server_pubkey", new_server_seckey_hex}});
            return crow::response{result};
    });

    CROW_ROUTE(app,"/delete_statechain/<string>")
        .methods("DELETE"_method)([&database_connection_string](std::string statechain_id){

        std::string error_message;
        pqxx::connection conn(database_connection_string);
        if (conn.is_open()) {

            std::string delete_comm =
                "DELETE FROM generated_public_key WHERE statechain_id = $1;";
            pqxx::work txn2(conn);

            txn2.exec_params(delete_comm, statechain_id);
            txn2.commit();

            conn.close();

            crow::json::wvalue result({{"message", "Statechain deleted."}});
            return crow::response{result};
        } else {
            return crow::response(500, "Failed to connect to the database!");
        }
    });



    CROW_ROUTE(app, "/add_mnemonic")
        .methods("POST"_method)([&enclave_id, &mutex_enclave_id, &sealing_key_manager](const crow::request& req) {

            auto req_body = crow::json::load(req.body);
            if (!req_body) {
                return crow::response(400);
            }

            if (req_body.count("mnemonic") == 0 || 
                req_body.count("index") == 0 ||
                req_body.count("threshold") == 0) {
                return crow::response(400, "Invalid parameters. They must be 'mnemonic', 'index' and 'threshold'.");
            }

            std::string mnemonic = req_body["mnemonic"].s();
            int64_t index = req_body["index"].i();
            int64_t threshold = req_body["threshold"].i();

            const std::lock_guard<std::mutex> lock(mutex_enclave_id);

            auto ret = sealing_key_manager.addMnemonic(enclave_id, mnemonic, (size_t) index, (size_t) threshold);

            if (!ret.success) {
                return crow::response(ret.code, ret.message);
            }

            crow::json::wvalue result({{"message", "OK."}});
            return crow::response{result};
    });

    CROW_ROUTE(app, "/test_decrypt_data")
        .methods("POST"_method)([&enclave_id, &mutex_enclave_id, &sealing_key_manager](const crow::request& req) {

            auto req_body = crow::json::load(req.body);
            if (!req_body)
                return crow::response(400);

            if (req_body.count("statechain_id") == 0) {
                return crow::response(400, "Invalid parameters. They must be 'statechain_id'.");
            }

            std::string statechain_id = req_body["statechain_id"].s();

            unsigned char serialized_server_pubnonce[66];

            memset(serialized_server_pubnonce, 0, sizeof(serialized_server_pubnonce));

            auto encrypted_keypair = std::make_unique<chacha20_poly1305_encrypted_data>();

            auto encrypted_secnonce = std::make_unique<chacha20_poly1305_encrypted_data>();
            encrypted_secnonce.reset();

            std::string error_message;
            bool data_loaded = db_manager::load_generated_key_data(
                statechain_id,
                encrypted_keypair,
                encrypted_secnonce,
                serialized_server_pubnonce,
                sizeof(serialized_server_pubnonce),
                error_message
            );

            // db_manager::print_encrypted_data(encrypted_keypair.get());

            unsigned char decrypted_data[encrypted_keypair->data_len];

            sgx_status_t ecall_ret;
            sgx_status_t status = test_decrypt_data(
                enclave_id, &ecall_ret,
                sealing_key_manager.sealed_seed, sealing_key_manager.sealed_seed_size,
                encrypted_keypair.get(),
                decrypted_data, sizeof(decrypted_data));

            if (ecall_ret != SGX_SUCCESS) {
                return crow::response(500, "Decrypt Data Ecall failed ");
            }  if (status != SGX_SUCCESS) {
                return crow::response(500, "Decrypt Data failed ");
            }

            // prin decrypted data
            std::string decrypted_data_hex = key_to_string(decrypted_data, sizeof(decrypted_data));
            std::cout << "Decrypted keypair: " << decrypted_data_hex << std::endl;

            crow::json::wvalue result({{"message", "OK."}});
            return crow::response{result};
    });


    app.port(18080).multithreaded().run();

    {
        const std::lock_guard<std::mutex> lock(mutex_enclave_id);
    
        // destroy the enclave
        sgx_destroy_enclave(enclave_id);
    }

    return 0;
}
