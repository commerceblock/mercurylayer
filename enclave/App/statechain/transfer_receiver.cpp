#include "transfer_receiver.h"

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wnon-virtual-dtor"
#pragma GCC diagnostic ignored "-Wcast-qual"
#pragma GCC diagnostic ignored "-Wfloat-equal"
#pragma GCC diagnostic ignored "-Wshadow"
#pragma GCC diagnostic ignored "-Wconversion"
#include <lib/crow_all.h>
#pragma GCC diagnostic pop

#include "../../utils/strencodings.h"
#include "../../utils/include_secp256k1_zkp_lib.h"
#include "../database/db_manager.h"
#include "../Enclave_u.h"
#include "../sealing_key_manager/sealing_key_manager.h"

namespace transfer_receiver {
    crow::response keyupdate(
        sgx_enclave_id_t& enclave_id, 
        const std::string& statechain_id, 
        std::vector<unsigned char>& serialized_t2,
        std::vector<unsigned char>& serialized_x1,
        const sealing_key_manager::SealingKeyManager& sealing_key_manager)
    {
        auto old_encrypted_keypair = std::make_unique<chacha20_poly1305_encrypted_data>();
        
        // the secret nonce is not used here
        auto encrypted_secnonce = std::make_unique<chacha20_poly1305_encrypted_data>();
        encrypted_secnonce.reset();

        unsigned char serialized_server_pubnonce[66];
        memset(serialized_server_pubnonce, 0, sizeof(serialized_server_pubnonce));

        std::string error_message;
        bool data_loaded = db_manager::load_generated_key_data(
            statechain_id,
            old_encrypted_keypair,
            encrypted_secnonce,
            nullptr,
            0,
            error_message
        );

        if (!data_loaded) {
            error_message = "Failed to load aggregated key data: " + error_message;
            return crow::response(500, error_message);
        }

        if (old_encrypted_keypair == nullptr) {
            return crow::response(400, "Empty encrypted keypair!");
        }

        // 1. Allocate memory for the aggregated pubkey and sealedprivkey.
        size_t new_server_pubkey_size = 33; // serialized compressed public keys are 33-byte array
        unsigned char new_server_pubkey[new_server_pubkey_size];

        auto new_encrypted_keypair = std::make_unique<chacha20_poly1305_encrypted_data>();

        sgx_status_t ecall_ret;
        sgx_status_t status = enclave_key_update(
            enclave_id, &ecall_ret, 
            sealing_key_manager.sealed_seed, sealing_key_manager.sealed_seed_size,
            old_encrypted_keypair.get(),
            serialized_x1.data(), serialized_x1.size(),
            serialized_t2.data(), serialized_t2.size(),
            new_server_pubkey, new_server_pubkey_size,
            new_encrypted_keypair.get());

        if (ecall_ret != SGX_SUCCESS) {
            return crow::response(500, "Enclave key update Ecall failed ");
        }  if (status != SGX_SUCCESS) {
            return crow::response(500, "Enclave key update failed ");
        }

        bool data_saved = db_manager::update_sealed_keypair(
            *new_encrypted_keypair, 
            new_server_pubkey, new_server_pubkey_size,
            statechain_id, 
            error_message);

        if (!data_saved) {
            error_message = "Failed to update aggregated key data: " + error_message;
            return crow::response(500, error_message);
        }

        auto new_server_seckey_hex = key_to_string(new_server_pubkey, new_server_pubkey_size);

        crow::json::wvalue result({{"server_pubkey", new_server_seckey_hex}});
        return crow::response{result};
    }
}