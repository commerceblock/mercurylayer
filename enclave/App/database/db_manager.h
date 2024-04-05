#pragma once

#ifndef DB_MANAGER_H
#define DB_MANAGER_H

#include "../Enclave_u.h"
#include <memory>
#include <string>

namespace db_manager {

    /*
    // Remove these 2 functions. Sealed seeds should be stored in the file system.
    bool add_sealed_seed(char* sealed_secret, size_t sealed_secret_size, std::string& error_message);
    bool get_sealed_seed(char* sealed_secret, size_t sealed_secret_size, std::string& error_message);
    */

    bool save_generated_public_key(
        const chacha20_poly1305_encrypted_data& encrypted_data, 
        unsigned char* server_public_key, size_t server_public_key_size,
        const std::string& statechain_id,
        std::string& error_message);

    // Remove after finished
    void print_encrypted_data(const chacha20_poly1305_encrypted_data* data);

    bool load_generated_key_data(
        const std::string& statechain_id, 
        std::unique_ptr<chacha20_poly1305_encrypted_data>& encrypted_keypair,
        std::unique_ptr<chacha20_poly1305_encrypted_data>& encrypted_secnonce,
        unsigned char* public_nonce, const size_t public_nonce_size, 
        std::string& error_message);

    bool update_sealed_secnonce(
        const std::string& statechain_id, 
        unsigned char* serialized_server_pubnonce, const size_t serialized_server_pubnonce_size, 
        const chacha20_poly1305_encrypted_data& encrypted_secnonce, 
        std::string& error_message);

    bool update_sig_count(const std::string& statechain_id);

    bool signature_count(const std::string& statechain_id, int& sig_count);
}

#endif // DB_MANAGER_H