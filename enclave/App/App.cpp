#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wnon-virtual-dtor"
#pragma GCC diagnostic ignored "-Wcast-qual"
#pragma GCC diagnostic ignored "-Wfloat-equal"
#pragma GCC diagnostic ignored "-Wshadow"
#pragma GCC diagnostic ignored "-Wconversion"
#include <lib/crow_all.h>
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

#include "App.h"
#include "Enclave_u.h"
#include "sgx_urts.h"
#include "sgx_tcrypto.h"

# define ENCLAVE_FILENAME "enclave.signed.so"

// extracted from sdk/tseal/tSeal_util.cpp
uint32_t sgx_calc_sealed_data_size(const uint32_t add_mac_txt_size, const uint32_t txt_encrypt_size) 
{
    if(add_mac_txt_size > UINT32_MAX - txt_encrypt_size)
        return UINT32_MAX;
    uint32_t payload_size = add_mac_txt_size + txt_encrypt_size; //Calculate the payload size

    if(payload_size > UINT32_MAX - sizeof(sgx_sealed_data_t))
        return UINT32_MAX;
    return (uint32_t)(sizeof(sgx_sealed_data_t) + payload_size);
}


bool save_generated_public_key(
    char* sealed, size_t sealed_size, 
    unsigned char* server_public_key, size_t server_public_key_size,
    std::string& statechain_id,
    std::string& error_message) 
{
    try
    {
         pqxx::connection conn("postgresql://postgres:postgres@localhost/sgx");
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

            std::basic_string_view<std::byte> sealed_data_view(reinterpret_cast<std::byte*>(sealed), sealed_size);
            std::basic_string_view<std::byte> public_key_data_view(reinterpret_cast<std::byte*>(server_public_key), server_public_key_size);

            std::string insert_query =
                "INSERT INTO generated_public_key (sealed_keypair, public_key, statechain_id) VALUES ($1, $2, $3);";
            pqxx::work txn2(conn);

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
    std::string& statechain_id, 
    char* sealed_keypair, size_t sealed_keypair_size,
    char* sealed_secnonce, size_t sealed_secnonce_size,
    unsigned char* public_nonce, const size_t public_nonce_size, 
    std::string& error_message)
{
    try
    {
        pqxx::connection conn("postgresql://postgres:postgres@localhost/sgx");
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

bool update_sealed_secnonce(
    std::string& statechain_id, 
    unsigned char* serialized_server_pubnonce, const size_t serialized_server_pubnonce_size, 
    char* sealed_secnonce, size_t sealed_secnonce_size,
    std::string& error_message)
{
    try
    {
        pqxx::connection conn("postgresql://postgres:postgres@localhost/sgx");
        if (conn.is_open()) {

            std::basic_string_view<std::byte> sealed_secnonce_data_view(reinterpret_cast<std::byte*>(sealed_secnonce), sealed_secnonce_size);
            std::basic_string_view<std::byte> serialized_server_pubnonce_view(reinterpret_cast<std::byte*>(serialized_server_pubnonce), serialized_server_pubnonce_size);

            std::string updated_query =
                "UPDATE generated_public_key SET public_nonce = $1, sealed_secnonce = $2 WHERE statechain_id = $3";
            pqxx::work txn(conn);

            txn.exec_params(updated_query, serialized_server_pubnonce_view, sealed_secnonce_data_view, statechain_id);
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

bool save_aggregated_key_data(
    char* sealed, size_t sealed_size, 
    unsigned char* aggregated_pubkey, size_t aggregated_pubkey_size,
    unsigned char* keyagg_cache, size_t keyagg_cache_size,
    std::string& error_message) 
{
    try
    {
        pqxx::connection conn("postgresql://postgres:postgres@localhost/sgx");
        if (conn.is_open()) {

            std::string create_table_query =
                "CREATE TABLE IF NOT EXISTS aggregated_key_data ( "
                "id SERIAL PRIMARY KEY, "
                "sealed_keypair BYTEA, "
                "aggregated_key BYTEA, "
                "cache BYTEA);";

            pqxx::work txn(conn);
            txn.exec(create_table_query);
            txn.commit();

            std::basic_string_view<std::byte> sealed_data_view(reinterpret_cast<std::byte*>(sealed), sealed_size);
            std::basic_string_view<std::byte> aggregated_pubkey_data_view(reinterpret_cast<std::byte*>(aggregated_pubkey), aggregated_pubkey_size);
            std::basic_string_view<std::byte> keyagg_cache_data_view(reinterpret_cast<std::byte*>(keyagg_cache), keyagg_cache_size);

            std::string insert_query =
                "INSERT INTO aggregated_key_data (sealed_keypair, aggregated_key, cache) VALUES ($1, $2, $3);";
            pqxx::work txn2(conn);

            txn2.exec_params(insert_query, sealed_data_view, aggregated_pubkey_data_view, keyagg_cache_data_view);
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

bool load_aggregated_key_data(
    unsigned char* aggregated_pubkey, size_t aggregated_pubkey_size, 
    char* sealed_keypair, size_t sealed_keypair_size,
    unsigned char* keyagg_cache, size_t keyagg_cache_size,
    std::string& error_message) {
    try
    {
        pqxx::connection conn("postgresql://postgres:postgres@localhost/sgx");
        if (conn.is_open()) {

            std::basic_string_view<std::byte> aggregated_pubkey_data_view(reinterpret_cast<std::byte*>(aggregated_pubkey), aggregated_pubkey_size);

            std::string sealed_keypair_query =
                "SELECT sealed_keypair, cache FROM aggregated_key_data WHERE aggregated_key = $1;";
            
            pqxx::nontransaction ntxn(conn);

            conn.prepare("sealed_keypair_query", sealed_keypair_query);

            pqxx::result result = ntxn.exec_prepared("sealed_keypair_query", aggregated_pubkey_data_view);

            if (!result.empty()) {
                auto sealed_keypair_view = result[0]["sealed_keypair"].as<std::basic_string<std::byte>>();
                auto cache_view = result[0]["cache"].as<std::basic_string<std::byte>>();

                if (sealed_keypair_view.size() != sealed_keypair_size) {
                    error_message = "Failed to retrieve keypair. Different size than expected !";
                    return false;
                }

                if (cache_view.size() != keyagg_cache_size) {
                    error_message = "Failed to retrieve cache. Different size than expected !";
                    return false;
                }

                memcpy(sealed_keypair, sealed_keypair_view.data(), sealed_keypair_size);
                memcpy(keyagg_cache, cache_view.data(), keyagg_cache_size);
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

bool update_sig_count(std::string& statechain_id) {
    try
    {
        pqxx::connection conn("postgresql://postgres:postgres@localhost/sgx");
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

    {
        const std::lock_guard<std::mutex> lock(mutex_enclave_id);

        // initialize enclave
        sgx_status_t enclave_created = sgx_create_enclave(ENCLAVE_FILENAME, SGX_DEBUG_FLAG, NULL, NULL, &enclave_id, NULL);
        if (enclave_created != SGX_SUCCESS) {
            printf("Enclave init error\n");
            return -1;
        }
    }

    CROW_ROUTE(app, "/get_public_key")
        .methods("POST"_method)([&enclave_id, &mutex_enclave_id](const crow::request& req) {

            auto req_body = crow::json::load(req.body);
            if (!req_body)
                return crow::response(400);

            if (req_body.count("statechain_id") == 0)
                return crow::response(400, "Invalid parameter. It must be 'client_pubkey'.");

            std::string statechain_id = req_body["statechain_id"].s();

            // 1. Allocate memory for the aggregated pubkey and sealedprivkey.
            size_t server_pubkey_size = 33; // serialized compressed public keys are 33-byte array
            unsigned char server_pubkey[server_pubkey_size];

            size_t sealedprivkey_size = sgx_calc_sealed_data_size(0U, sizeof(secp256k1_keypair));
            char sealedprivkey[sealedprivkey_size];

            const std::lock_guard<std::mutex> lock(mutex_enclave_id);

            sgx_status_t ecall_ret;
            sgx_status_t status = generate_new_keypair(
                enclave_id, &ecall_ret, 
                server_pubkey, server_pubkey_size,
                sealedprivkey, sealedprivkey_size);

            if (ecall_ret != SGX_SUCCESS) {
                return crow::response(500, "Key aggregation Ecall failed ");
            }  if (status != SGX_SUCCESS) {
                return crow::response(500, "Key aggregation failed ");
            }

            auto server_seckey_hex = key_to_string(server_pubkey, server_pubkey_size);

            std::string error_message;
            bool data_saved = save_generated_public_key(
                // sealedprivkey.data(), sealedprivkey.size(), server_pubkey, server_pubkey_size, error_message);
                sealedprivkey, sealedprivkey_size, server_pubkey, server_pubkey_size, statechain_id, error_message);

            if (!data_saved) {
                error_message = "Failed to save aggregated key data: " + error_message;
                return crow::response(500, error_message);
            }

            crow::json::wvalue result({{"server_pubkey", server_seckey_hex}});
            return crow::response{result};

    });

    CROW_ROUTE(app, "/get_public_nonce")
        .methods("POST"_method)([&enclave_id, &mutex_enclave_id](const crow::request& req) {

            auto req_body = crow::json::load(req.body);
            if (!req_body)
                return crow::response(400);

            if (req_body.count("statechain_id") == 0) {
                return crow::response(400, "Invalid parameters. They must be 'statechain_id'.");
            }

            std::string statechain_id = req_body["statechain_id"].s();

            size_t sealed_keypair_size = sgx_calc_sealed_data_size(0U, sizeof(secp256k1_keypair));
            std::vector<char> sealed_keypair(sealed_keypair_size);  // Using a vector to manage dynamic-sized array.

            size_t sealed_secnonce_size = sgx_calc_sealed_data_size(0U, sizeof(secp256k1_musig_secnonce));
            std::vector<char> sealed_secnonce(sealed_secnonce_size);  // Using a vector to manage dynamic-sized array.

            unsigned char serialized_server_pubnonce[66];

            memset(sealed_keypair.data(), 0, sealed_keypair_size);
            memset(sealed_secnonce.data(), 0, sealed_secnonce_size);

            // std::cout << "sealed_keypair.data 1:  " << key_to_string(reinterpret_cast<unsigned char*>(sealed_keypair.data()), sealed_keypair_size) << std::endl;
            // std::cout << "sealed_secnonce.data 1: " << key_to_string(reinterpret_cast<unsigned char*>(sealed_secnonce.data()), sealed_secnonce_size) << std::endl;

            std::string error_message;
            bool data_loaded = load_generated_key_data(
                statechain_id,
                sealed_keypair.data(), sealed_keypair_size,
                sealed_secnonce.data(), sealed_secnonce_size,
                serialized_server_pubnonce, sizeof(serialized_server_pubnonce),
                error_message);

            if (!data_loaded) {
                error_message = "Failed to load aggregated key data: " + error_message;
                return crow::response(500, error_message);
            }

            memset(sealed_secnonce.data(), 0, sealed_secnonce_size);
            memset(serialized_server_pubnonce, 0, sizeof(serialized_server_pubnonce));
            
            sgx_status_t ecall_ret;
            sgx_status_t status = generate_nonce(
                enclave_id, &ecall_ret, 
                sealed_keypair.data(), sealed_keypair_size,
                sealed_secnonce.data(), sealed_secnonce_size,
                serialized_server_pubnonce, sizeof(serialized_server_pubnonce));

            if (ecall_ret != SGX_SUCCESS) {
                return crow::response(500, "Generate Nonce Ecall failed ");
            }  if (status != SGX_SUCCESS) {
                return crow::response(500, "Generate Nonce failed ");
            }

            bool data_saved = update_sealed_secnonce(
                statechain_id,
                serialized_server_pubnonce, sizeof(serialized_server_pubnonce),
                sealed_secnonce.data(), sealed_secnonce_size,
                error_message
            );

            if (!data_saved) {
                error_message = "Failed to save sealed secret nonce: " + error_message;
                return crow::response(500, error_message);
            }

            auto serialized_server_pubnonce_hex = key_to_string(serialized_server_pubnonce, sizeof(serialized_server_pubnonce));

            crow::json::wvalue result({{"server_pubnonce", serialized_server_pubnonce_hex}});
            return crow::response{result};
    });

    CROW_ROUTE(app, "/get_partial_signature")
        .methods("POST"_method)([&enclave_id, &mutex_enclave_id](const crow::request& req) {

            auto req_body = crow::json::load(req.body);
            if (!req_body)
                return crow::response(400);

            if (req_body.count("statechain_id") == 0 || 
                req_body.count("keyaggcoef") == 0 ||
                req_body.count("negate_seckey") == 0 ||
                req_body.count("session") == 0) {
                return crow::response(400, "Invalid parameters. They must be 'statechain_id', 'keyaggcoef', 'negate_seckey' and 'session'.");
            }

            std::string statechain_id = req_body["statechain_id"].s();
            std::string keyaggcoef_hex = req_body["keyaggcoef"].s();
            int64_t negate_seckey = req_body["negate_seckey"].i();
            std::string session_hex = req_body["session"].s();

            if (keyaggcoef_hex.substr(0, 2) == "0x") {
                keyaggcoef_hex = keyaggcoef_hex.substr(2);
            }

            if (session_hex.substr(0, 2) == "0x") {
                session_hex = session_hex.substr(2);
            }

            std::vector<unsigned char> serialized_keyaggcoef = ParseHex(keyaggcoef_hex);

            if (serialized_keyaggcoef.size() != 32) {
                return crow::response(400, "Invalid keyaggcoef length. Must be 32 bytes!");
            }

            std::vector<unsigned char> serialized_session = ParseHex(session_hex);

            if (serialized_session.size() != 133) {
                return crow::response(400, "Invalid session length. Must be 133 bytes!");
            }

            size_t sealed_keypair_size = sgx_calc_sealed_data_size(0U, sizeof(secp256k1_keypair));
            std::vector<char> sealed_keypair(sealed_keypair_size);  // Using a vector to manage dynamic-sized array.

            size_t sealed_secnonce_size = sgx_calc_sealed_data_size(0U, sizeof(secp256k1_musig_secnonce));
            std::vector<char> sealed_secnonce(sealed_secnonce_size);  // Using a vector to manage dynamic-sized array.

            unsigned char serialized_server_pubnonce[66];

            memset(sealed_keypair.data(), 0, sealed_keypair_size);
            memset(sealed_secnonce.data(), 0, sealed_secnonce_size);
            memset(serialized_server_pubnonce, 0, sizeof(serialized_server_pubnonce));

            std::string error_message;
            bool data_loaded = load_generated_key_data(
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
            bool is_sealed_secnonce_empty = std::all_of(sealed_secnonce.begin(), sealed_secnonce.end(), [](char elem){ return elem == 0; });

            if (is_sealed_keypair_empty || is_sealed_secnonce_empty) {
                return crow::response(400, "Empty sealed keypair or sealed secnonce!");
            }

            unsigned char serialized_partial_sig[32];

            sgx_status_t ecall_ret;
            sgx_status_t status = get_partial_signature(
                enclave_id, &ecall_ret, 
                sealed_keypair.data(), sealed_keypair_size,
                sealed_secnonce.data(), sealed_secnonce_size,
                serialized_keyaggcoef.data(), serialized_keyaggcoef.size(),
                (int) negate_seckey,
                serialized_session.data(), serialized_session.size(),
                serialized_server_pubnonce, sizeof(serialized_server_pubnonce),
                serialized_partial_sig, sizeof(serialized_partial_sig));

            if (ecall_ret != SGX_SUCCESS) {
                return crow::response(500, "Generate Signature Ecall failed ");
            }  if (status != SGX_SUCCESS) {
                return crow::response(500, "Generate Signature failed ");
            }

            bool sig_count_updated = update_sig_count(statechain_id);
            if (!sig_count_updated) {
                return crow::response(500, "Failed to update signature count!");
            }

            auto partial_sig_hex = key_to_string(serialized_partial_sig, sizeof(serialized_partial_sig));

            crow::json::wvalue result({{"partial_sig", partial_sig_hex}});
            return crow::response{result};
    });

    CROW_ROUTE(app,"/signature_count/<string>")
    ([](std::string statechain_id){

        std::string error_message;
        pqxx::connection conn("postgresql://postgres:postgres@localhost/sgx");
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

    app.port(18080).multithreaded().run();

    {
        const std::lock_guard<std::mutex> lock(mutex_enclave_id);
    
        // destroy the enclave
        sgx_destroy_enclave(enclave_id);
    }

    return 0;
}
