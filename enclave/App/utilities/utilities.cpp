#include "utilities.h"

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wnon-virtual-dtor"
#pragma GCC diagnostic ignored "-Wcast-qual"
#pragma GCC diagnostic ignored "-Wfloat-equal"
#pragma GCC diagnostic ignored "-Wshadow"
#pragma GCC diagnostic ignored "-Wconversion"
#include <lib/toml.hpp>
#pragma GCC diagnostic pop

#include "sgx_tseal.h"
#include "../Enclave_u.h"

namespace utils {

    // extracted from sdk/tseal/tSeal_util.cpp
    uint32_t sgx_calc_sealed_data_size(const uint32_t add_mac_txt_size, const uint32_t txt_encrypt_size) 
    {
        if(add_mac_txt_size > UINT32_MAX - txt_encrypt_size)
            return UINT32_MAX;
        uint32_t payload_size = add_mac_txt_size + txt_encrypt_size; //Calculate the payload size

        if(payload_size > UINT32_MAX - sizeof(sgx_sealed_data_t))
            return UINT32_MAX;
        return (uint32_t)(sizeof(sgx_sealed_data_t) + payload_size);
    }

    void initialize_encrypted_data(chacha20_poly1305_encrypted_data& encrypted_data, size_t data_len) {

        // initialize encrypted_data
        encrypted_data.data_len = data_len;
        encrypted_data.data = new unsigned char[encrypted_data.data_len];
        memset(encrypted_data.data, 0, encrypted_data.data_len);

        memset(encrypted_data.mac, 0, sizeof(encrypted_data.mac));
        memset(encrypted_data.nonce, 0, sizeof(encrypted_data.nonce));
    }

    uint16_t convertStringToUint16(const char* value) {
        if (value == nullptr) {
            throw std::invalid_argument("Value not set");
        }

        // Use strtol to convert the string to a long integer
        char* end;
        errno = 0; // To distinguish success/failure after the call
        long int port = std::strtol(value, &end, 10);

        // Check for various possible errors
        if (errno != 0) {
            throw std::runtime_error(std::strerror(errno));
        }
        if (end == value) {
            throw std::invalid_argument("No digits were found");
        }
        if (*end != '\0') {
            throw std::invalid_argument("Extra characters found after the number");
        }
        if (port < 0 || port > static_cast<long int>(std::numeric_limits<uint16_t>::max())) {
            throw std::out_of_range("Value out of range for uint16_t");
        }

        return static_cast<uint16_t>(port);
    }

    uint16_t convertInt64ToUint16(int64_t value) {
        if (value < 0 || value > static_cast<int64_t>(std::numeric_limits<uint16_t>::max())) {
            throw std::out_of_range("Value out of range for uint16_t");
        }
        return static_cast<uint16_t>(value);
    }

    uint16_t getEnclavePort() {
        const char* value = std::getenv("ENCLAVE_PORT");

        if (value == nullptr) {
            auto config = toml::parse_file("Settings.toml");
            int64_t server_port = config["intel_sgx"]["enclave_port"].as_integer()->get();
            return convertInt64ToUint16(server_port);
        } else {
            return convertStringToUint16(value);
        }
    }
    
} // namespace utils