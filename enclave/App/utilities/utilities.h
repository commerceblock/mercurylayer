#pragma once

#ifndef UTILITIES_H
#define UTILITIES_H

#include <string>
#include "../Enclave_u.h"

namespace utils {

    struct APIResponse {
        bool success;
        int code;
        std::string message;
    };

    uint32_t sgx_calc_sealed_data_size(const uint32_t add_mac_txt_size, const uint32_t txt_encrypt_size);

    void initialize_encrypted_data(chacha20_poly1305_encrypted_data& encrypted_data, size_t data_len);

}

#endif // UTILS_H