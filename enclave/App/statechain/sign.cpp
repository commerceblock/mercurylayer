#include "sign.h"

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

namespace signature {
    crow::response get_public_nonce(sgx_enclave_id_t& enclave_id, const std::string& statechain_id, sealing_key_manager::SealingKeyManager& sealing_key_manager) {

        auto encrypted_keypair = std::make_unique<chacha20_poly1305_encrypted_data>();

        // the secret nonce is not defined yet
        auto encrypted_secnonce = std::make_unique<chacha20_poly1305_encrypted_data>();
        encrypted_secnonce.reset();

        std::string error_message;
        bool data_loaded = db_manager::load_generated_key_data(
            statechain_id,
            encrypted_keypair,
            encrypted_secnonce,
            nullptr,
            0,
            error_message
        );

        assert(encrypted_secnonce == nullptr);

        if (!data_loaded) {
            error_message = "Failed to load aggregated key data: " + error_message;
            return crow::response(500, error_message);
        }

        unsigned char serialized_server_pubnonce[66];
        memset(serialized_server_pubnonce, 0, sizeof(serialized_server_pubnonce));

        encrypted_secnonce = std::make_unique<chacha20_poly1305_encrypted_data>();
        utils::initialize_encrypted_data(*encrypted_secnonce, sizeof(secp256k1_musig_secnonce));

        sgx_status_t ecall_ret;
        sgx_status_t status = enclave_generate_nonce(
            enclave_id, &ecall_ret, 
            sealing_key_manager.sealed_seed, sealing_key_manager.sealed_seed_size,
            encrypted_keypair.get(),
            encrypted_secnonce.get(),
            serialized_server_pubnonce, sizeof(serialized_server_pubnonce));

        if (ecall_ret != SGX_SUCCESS) {
            return crow::response(500, "Generate Nonce Ecall failed ");
        }  if (status != SGX_SUCCESS) {
            return crow::response(500, "Generate Nonce failed ");
        }

        bool data_saved = db_manager::update_sealed_secnonce(
            statechain_id,
            serialized_server_pubnonce, sizeof(serialized_server_pubnonce),
            *encrypted_secnonce,
            error_message
        );

        if (!data_saved) {
            error_message = "Failed to save sealed secret nonce: " + error_message;
            return crow::response(500, error_message);
        }

        auto serialized_server_pubnonce_hex = key_to_string(serialized_server_pubnonce, sizeof(serialized_server_pubnonce));

        crow::json::wvalue result({{"server_pubnonce", serialized_server_pubnonce_hex}});
        return crow::response{result};
    }

    crow::response get_partial_signature(
        sgx_enclave_id_t& enclave_id, 
        const std::string& statechain_id, 
        const int64_t negate_seckey, 
        std::vector<unsigned char>& serialized_session, 
        const sealing_key_manager::SealingKeyManager& sealing_key_manager) 
    {

        auto encrypted_keypair = std::make_unique<chacha20_poly1305_encrypted_data>();
        auto encrypted_secnonce = std::make_unique<chacha20_poly1305_encrypted_data>();

        unsigned char serialized_server_pubnonce[66];
        memset(serialized_server_pubnonce, 0, sizeof(serialized_server_pubnonce));

        std::string error_message;
        bool data_loaded = db_manager::load_generated_key_data(
            statechain_id,
            encrypted_keypair,
            encrypted_secnonce,
            serialized_server_pubnonce,
            sizeof(serialized_server_pubnonce),
            error_message
        );

        if (encrypted_secnonce == nullptr) {
            std::cout << "Failed to load encrypted_secnonce" << std::endl;
        } else {
            std::cout << "Loaded encrypted_secnonce" << std::endl;
        }

        if (!data_loaded) {
            error_message = "Failed to load aggregated key data: " + error_message;
            return crow::response(500, error_message);
        }

        bool is_sealed_keypair_empty = encrypted_keypair == nullptr;
        bool is_sealed_secnonce_empty = encrypted_secnonce == nullptr;


        if (is_sealed_keypair_empty || is_sealed_secnonce_empty) {
            return crow::response(400, "Empty sealed keypair or sealed secnonce!");
        }

        unsigned char serialized_partial_sig[32];

        sgx_status_t ecall_ret;
        sgx_status_t status = enclave_partial_signature(
            enclave_id, &ecall_ret,
            sealing_key_manager.sealed_seed, sealing_key_manager.sealed_seed_size,
            encrypted_keypair.get(),
            encrypted_secnonce.get(),
            (int) negate_seckey,
            serialized_session.data(), serialized_session.size(),
            serialized_server_pubnonce, sizeof(serialized_server_pubnonce),
            serialized_partial_sig, sizeof(serialized_partial_sig));

        if (ecall_ret != SGX_SUCCESS) {
            return crow::response(500, "Enclave Generate Signature Ecall failed ");
        }  if (status != SGX_SUCCESS) {
            return crow::response(500, "Enclave Generate Signature failed ");
        }

        bool sig_count_updated = db_manager::update_sig_count(statechain_id);
        if (!sig_count_updated) {
            return crow::response(500, "Failed to update signature count!");
        }

        auto partial_sig_hex = key_to_string(serialized_partial_sig, sizeof(serialized_partial_sig));

        crow::json::wvalue result({{"partial_sig", partial_sig_hex}});
        return crow::response{result};

    }
}