#pragma once

#ifndef STATECHAIN_DEPOSIT_H
#define STATECHAIN_DEPOSIT_H

#include "../Enclave_u.h"
#include "../sealing_key_manager/sealing_key_manager.h"

namespace deposit {
    void get_public_nonce(sgx_enclave_id_t& enclave_id, const std::string& statechain_id, sealing_key_manager::SealingKeyManager& sealing_key_manager);
}

#endif // SEALING_KEY_MANAGER_H