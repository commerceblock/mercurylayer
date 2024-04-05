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
#include "statechain/transfer_receiver.h"
#include "sealing_key_manager/sealing_key_manager.h"

#include "App.h"
#include "Enclave_u.h"
#include "sgx_urts.h"
#include "sgx_tcrypto.h"

# define ENCLAVE_FILENAME "enclave.signed.so"

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
    ([](std::string statechain_id){

        return signature::signature_count(statechain_id);

    });

    CROW_ROUTE(app, "/keyupdate")
        .methods("POST"_method)([&enclave_id, &mutex_enclave_id, &sealing_key_manager](const crow::request& req) {

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

            return transfer_receiver::keyupdate(
                enclave_id, 
                statechain_id, 
                serialized_t2,
                serialized_x1,
                sealing_key_manager
            );
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
    
    app.port(18080).multithreaded().run();

    {
        const std::lock_guard<std::mutex> lock(mutex_enclave_id);
    
        // destroy the enclave
        sgx_destroy_enclave(enclave_id);
    }

    return 0;
}
