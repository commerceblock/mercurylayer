#pragma once

#ifndef STATECHAIN_SIGN_H
#define STATECHAIN_SIGN_H

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wnon-virtual-dtor"
#pragma GCC diagnostic ignored "-Wcast-qual"
#pragma GCC diagnostic ignored "-Wfloat-equal"
#pragma GCC diagnostic ignored "-Wshadow"
#pragma GCC diagnostic ignored "-Wconversion"
#include <lib/crow_all.h>
#pragma GCC diagnostic pop

#include "../Enclave_u.h"
#include "../sealing_key_manager/sealing_key_manager.h"

namespace signature {
    crow::response get_public_nonce(sgx_enclave_id_t& enclave_id, const std::string& statechain_id, sealing_key_manager::SealingKeyManager& sealing_key_manager);
    crow::response get_partial_signature(
        sgx_enclave_id_t& enclave_id, 
        const std::string& statechain_id, 
        const int64_t negate_seckey, 
        std::vector<unsigned char>& serialized_session, 
        const sealing_key_manager::SealingKeyManager& sealing_key_manager); 
}

#endif // SEALING_KEY_MANAGER_H