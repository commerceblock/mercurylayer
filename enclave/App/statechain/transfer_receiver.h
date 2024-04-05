#pragma once

#ifndef STATECHAIN_TRANSFER_RECEIVER_H
#define STATECHAIN_TRANSFER_RECEIVER_H

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

namespace transfer_receiver {
    crow::response keyupdate(
        sgx_enclave_id_t& enclave_id, 
        const std::string& statechain_id, 
        std::vector<unsigned char>& serialized_t2,
        std::vector<unsigned char>& serialized_x1,
        const sealing_key_manager::SealingKeyManager& sealing_key_manager
    );
}

#endif // STATECHAIN_TRANSFER_RECEIVER_H