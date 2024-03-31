#pragma once

#ifndef UTILITIES_H
#define UTILITIES_H

#include <string>

namespace utils {

    struct APIResponse {
        bool success;
        int code;
        std::string message;
    };

    uint32_t sgx_calc_sealed_data_size(const uint32_t add_mac_txt_size, const uint32_t txt_encrypt_size);

}

#endif // UTILS_H