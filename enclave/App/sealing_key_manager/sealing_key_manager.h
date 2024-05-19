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

    struct SealedKeyShare {
        size_t index;
        char* data;
        size_t data_size;
    };

    // TODO: is this being used ?
    struct Seed {
        size_t index;
        char* sealed_data;
        size_t sealed_data_size;
    };

    struct SealingKeyManager
    {
        // This key pair is used to syncronize the keys between enclaves
        // It's ephemeral because it's only used for this purpose
        uint8_t ephemeral_exchange_public_key[32];
        size_t ephemeral_sealed_exchange_private_key_size = 0;
        char* ephemeral_sealed_exchange_private_key= nullptr;

        std::vector<sealing_key_manager::SealedKeyShare> key_shares;
        std::mutex mutex_key_shares; // protects key_shares

        size_t threshold = 0;

        size_t sealed_seed_size = 0;
        char* sealed_seed = nullptr;

        std::string getReplicationServerUrl();
        std::string getSeedDir();
        utils::APIResponse addKeyShare(sgx_enclave_id_t& enclave_id, const SealedKeyShare& key_share, size_t _threshold);
        utils::APIResponse addMnemonic(sgx_enclave_id_t& enclave_id, const std::string& mnemonic, const std::string& password, size_t index, size_t _threshold);
        utils::APIResponse recoverSeed(sgx_enclave_id_t& enclave_id);
        void generateEphemeralKeys(sgx_enclave_id_t& enclave_id);
        bool generateSecret(sgx_enclave_id_t& enclave_id);
        bool replicateSecret();
        bool addSecret(sgx_enclave_id_t& enclave_id);
        bool isSeedEmpty();
        bool writeSeedToFile();
        bool readSeedFromFile();
        // bool testSealedSeed(sgx_enclave_id_t& enclave_id);
        void listKeyShares();
    };
}

#endif // SEALING_KEY_MANAGER_H