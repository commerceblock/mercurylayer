#include "utilities.h"

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
    
} // namespace utils