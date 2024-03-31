#include "utilities.h"

#include "sgx_tseal.h"

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
    
} // namespace utils