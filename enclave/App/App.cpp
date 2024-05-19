#include "App.h"

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wnon-virtual-dtor"
#pragma GCC diagnostic ignored "-Wcast-qual"
#pragma GCC diagnostic ignored "-Wfloat-equal"
#pragma GCC diagnostic ignored "-Wshadow"
#pragma GCC diagnostic ignored "-Wconversion"
#include <lib/crow_all.h>
#include <lib/toml.hpp>
#pragma GCC diagnostic pop
#include <lib/CLI11.hpp>

#include <algorithm>
#include <iomanip>
#include <iostream>
#include <stdio.h>
#include <string.h>
#include <sstream>
#include <sys/random.h> // for testing secp256k1-zkp. Can be removed after this.

#include "../utils/include_secp256k1_zkp_lib.h"
#include "../utils/strencodings.h"
#include "utilities/utilities.h"
#include "database/db_manager.h"
#include "sealing_key_manager/sealing_key_manager.h"

#include "endpoints/deposit.h"
#include "endpoints/secret.h"
#include "endpoints/sign.h"
#include "endpoints/transfer_receiver.h"
#include "endpoints/withdraw.h"

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

bool start_server(sgx_enclave_id_t& enclave_id, std::mutex& mutex_enclave_id, sealing_key_manager::SealingKeyManager& sealing_key_manager)
{
    crow::SimpleApp app;

    CROW_ROUTE(app, "/get_public_key")
        .methods("POST"_method)([&enclave_id, &mutex_enclave_id, &sealing_key_manager](const crow::request& req) {
            return endpoinDeposit::handleGetPublicKey(req, enclave_id, mutex_enclave_id, sealing_key_manager);
    });

    CROW_ROUTE(app, "/get_public_nonce")
        .methods("POST"_method)([&enclave_id, &mutex_enclave_id, &sealing_key_manager](const crow::request& req) {
            return endpointSignature::handleGetPublicNonce(req, enclave_id, mutex_enclave_id, sealing_key_manager);            
    });
    
    CROW_ROUTE(app, "/get_partial_signature")
        .methods("POST"_method)([&enclave_id, &mutex_enclave_id, &sealing_key_manager](const crow::request& req) {
            return endpointSignature::handleGetPartialSignature(req, enclave_id, mutex_enclave_id, sealing_key_manager);
    });

    CROW_ROUTE(app,"/signature_count/<string>")
    ([](std::string statechain_id){
        return endpointSignature::signatureCount(statechain_id);
    });

    CROW_ROUTE(app, "/keyupdate")
        .methods("POST"_method)([&enclave_id, &mutex_enclave_id, &sealing_key_manager](const crow::request& req) {
            return endpointTransferReceiver::handleKeyUpdate(req, enclave_id, mutex_enclave_id, sealing_key_manager);
    });

    CROW_ROUTE(app,"/delete_statechain/<string>")
        .methods("DELETE"_method)([](std::string statechain_id){
            return endpointWithdraw::handleWithdraw(statechain_id);
    });

    CROW_ROUTE(app, "/add_mnemonic")
        .methods("POST"_method)([&enclave_id, &mutex_enclave_id, &sealing_key_manager](const crow::request& req) {
            return endpointSecret::handleAddMnemonic(req, enclave_id, mutex_enclave_id, sealing_key_manager);
    });

    CROW_ROUTE(app, "/get_ephemeral_public_key")
    ([&sealing_key_manager](){
        return endpointSecret::getEphemeralPublicKey(sealing_key_manager);
    });

    CROW_ROUTE(app, "/add_secret")
        .methods("POST"_method)([&enclave_id, &mutex_enclave_id, &sealing_key_manager](const crow::request& req) {
            return endpointSecret::handleAddSecret(req, enclave_id, mutex_enclave_id, sealing_key_manager);
    });

    uint16_t server_port = 0;

    try {
        server_port = utils::getEnclavePort();
    } catch (const std::exception& e) {
        std::cerr << "Error enclave port: " << e.what() << std::endl;
        return false;
    }
    
    app.port(server_port).multithreaded().run();

    return true;
}

int SGX_CDECL main(int argc, char *argv[])
{
    CLI::App app{"Lockbox Server"};
    app.set_version_flag("--version", std::string("0.0.1"));

    bool replicate_key = false;
    bool generate_new_secret = false;

    // Add the options to the app
    app.add_flag("-r,--replicate-key", replicate_key, "Replicate key");
    app.add_flag("-g,--generate-new-secret", generate_new_secret, "Generate a new secret");

    // Parse the arguments
    CLI11_PARSE(app, argc, argv);

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

    sealing_key_manager::SealingKeyManager sealing_key_manager;
    if (sealing_key_manager.readSeedFromFile()) {
        std::cout << "Seed loaded" << std::endl;
    } else {
        std::cout << "Seed not loaded" << std::endl;
    }

    try {
        sealing_key_manager.generateEphemeralKeys(enclave_id);
    } catch (const std::runtime_error& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }

    if (generate_new_secret) {
        const std::lock_guard<std::mutex> lock(mutex_enclave_id);
        
        try {
            if (sealing_key_manager.generateSecret(enclave_id)) {
                std::cout << "New secret sucessfully generated." << std::endl;
            } else {
                std::cout << "Seed already exists. A new secret won't be generated." << std::endl;
            }

        } catch (const std::runtime_error& e) {
            std::cerr << "Error: " << e.what() << std::endl;
            return 2;
        }
    }

    if (replicate_key) {
        sealing_key_manager.replicateSecret();
    }

    if (!start_server(enclave_id, mutex_enclave_id, sealing_key_manager)) {
        std::cerr << "Error starting server." << std::endl;
        return 3;
    }

    {
        const std::lock_guard<std::mutex> lock(mutex_enclave_id);
    
        // destroy the enclave
        sgx_destroy_enclave(enclave_id);
    }

    return 0;
}
