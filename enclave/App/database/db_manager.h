#pragma once

#ifndef DB_MANAGER_H
#define DB_MANAGER_H

#include "../Enclave_u.h"
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
        std::string& statechain_id, 
        chacha20_poly1305_encrypted_data* encrypted_keypair,
        // char* sealed_keypair, size_t sealed_keypair_size,
        // char* sealed_secnonce, size_t sealed_secnonce_size,
        unsigned char* public_nonce, const size_t public_nonce_size, 
        std::string& error_message);
}

#endif // DB_MANAGER_H