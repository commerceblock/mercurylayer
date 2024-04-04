#include "deposit.h"

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
#include "../statechain/deposit.h"
#include "../sealing_key_manager/sealing_key_manager.h"

#include "../Enclave_u.h"

namespace deposit {
    crow::response get_public_key(sgx_enclave_id_t& enclave_id, const std::string& statechain_id, sealing_key_manager::SealingKeyManager& sealing_key_manager) {
        // 1. Allocate memory for the aggregated pubkey and sealedprivkey.
        size_t server_pubkey_size = 33; // serialized compressed public keys are 33-byte array
        unsigned char server_pubkey[server_pubkey_size];

        // new encryption scheme
        chacha20_poly1305_encrypted_data encrypted_data;
        utils::initialize_encrypted_data(encrypted_data, sizeof(secp256k1_keypair));

        std::cout << "statechain_id: " << statechain_id << std::endl;

        sgx_status_t ecall_ret;
        enclave_generate_new_keypair(enclave_id, &ecall_ret, 
            server_pubkey, server_pubkey_size, 
            sealing_key_manager.sealed_seed, sealing_key_manager.sealed_seed_size,
            &encrypted_data);

        std::string error_message;
        bool data_saved = db_manager::save_generated_public_key(encrypted_data, server_pubkey, server_pubkey_size, statechain_id, error_message);
        
        auto server_seckey_hex = key_to_string(server_pubkey, server_pubkey_size);

        if (!data_saved) {
            error_message = "Failed to save aggregated key data: " + error_message;
            return crow::response(500, error_message);
        }

        crow::json::wvalue result({{"server_pubkey", server_seckey_hex}});
        return crow::response{result};
    }
}