#include "../Enclave_u.h"
#include "../sealing_key_manager/sealing_key_manager.h"

namespace deposit {
    void get_public_nonce(sgx_enclave_id_t& enclave_id, const std::string& statechain_id, sealing_key_manager::SealingKeyManager& sealing_key_manager) {

        size_t sealed_keypair_size = sizeof(secp256k1_keypair);
        std::vector<char> sealed_keypair(sealed_keypair_size);  // Using a vector to manage dynamic-sized array.

        size_t sealed_secnonce_size = sizeof(secp256k1_musig_secnonce);
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

        memset(sealed_secnonce.data(), 0, sealed_secnonce_size);
        memset(serialized_server_pubnonce, 0, sizeof(serialized_server_pubnonce));
    }
}