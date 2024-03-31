#pragma once

#ifndef SEALING_KEY_MANAGER_H
#define SEALING_KEY_MANAGER_H

#include <cstddef>
#include <mutex>
#include <vector>

#include "../Enclave_u.h"
#include "../utilities/utilities.h"

const size_t SECRET_SIZE = 32;

namespace sealing_key_manager {

    struct KeyShare {
        size_t index;
        char* data;
        size_t data_size;
    };

    struct Seed {
        size_t index;
        char* sealed_data;
        size_t sealed_data_size;
    };

    struct SealingKeyManager
    {
        std::vector<sealing_key_manager::KeyShare> key_shares;
        std::mutex mutex_key_shares; // protects key_shares

        size_t threshold = 0;

        size_t sealed_seed_size = 0;
        char* sealed_seed = nullptr;

        utils::APIResponse addKeyShare(sgx_enclave_id_t& enclave_id, const KeyShare& key_share, size_t _threshold);
        utils::APIResponse addMnemonic(sgx_enclave_id_t& enclave_id, const std::string& mnemonic, size_t index, size_t _threshold);
        utils::APIResponse recoverSeed(sgx_enclave_id_t& enclave_id);
        bool isSeedEmpty();
        bool writeSeedToFile();
        bool readSeedFromFile();
        // bool testSealedSeed(sgx_enclave_id_t& enclave_id);
        void listKeyShares();
    };
    

    

}

#endif // SEALING_KEY_MANAGER_H