#include "sealing_key_manager.h"

#include "../../utils/strencodings.h"
#include "../database/db_manager.h"
#include "../Enclave_u.h"
#include "../utilities/utilities.h"

#include <algorithm>
#include <bc-bip39/bc-bip39.h>
#include <cstring>
#include <string.h>
#include <iostream>

namespace sealing_key_manager {

    utils::APIResponse SealingKeyManager::addKeyShare(sgx_enclave_id_t& enclave_id, const KeyShare& new_key_share, size_t _threshold) {

        if (threshold == 0) {
            threshold = _threshold;
        } else if (threshold != _threshold) {
            return utils::APIResponse {
                .success = false,
                .code = 400,
                .message = "Threshold mismatch"
            };
        }

        for (const auto& key_share : key_shares) {
            if (key_share.index == new_key_share.index) {
                return utils::APIResponse {
                    .success = false,
                    .code = 400,
                    .message = "Index already used"
                };
            }
        }

        for (const auto& key_share : key_shares) {
            if (key_share.data_size == new_key_share.data_size && std::memcmp(key_share.data, new_key_share.data, key_share.data_size) == 0) {
                return utils::APIResponse {
                    .success = false,
                    .code = 400,
                    .message = "Key share already exists"
                };
            }
        }

        std::lock_guard<std::mutex> lock(mutex_key_shares);
        key_shares.push_back(new_key_share);

        listKeyShares();

        if (key_shares.size() == threshold) {
            // Recover seed
            auto ret = recoverSeed(enclave_id);
            if (!ret.success) {
                return ret;
            }
        }

        if (!isSeedEmpty()) {
            std::string error_message;
            auto ret = db_manager::add_sealed_seed(sealed_seed, sealed_seed_size, error_message);
            if (!ret) {
                return utils::APIResponse {
                    .success = false,
                    .code = 500,
                    .message = error_message
                };
            }
        }

        return utils::APIResponse {
            .success = true,
            .code = 0,
            .message = ""
        };
    }

    utils::APIResponse SealingKeyManager::addMnemonic(sgx_enclave_id_t& enclave_id, const std::string& mnemonic, size_t index, size_t _threshold) {

        size_t max_secret_len = SECRET_SIZE;
        uint8_t secret[max_secret_len];
        memset(secret, 0, max_secret_len);
        size_t secret_len = bip39_secret_from_mnemonics(mnemonic.c_str(), secret, max_secret_len);

        // const auto key_share = KeyShare {
        //     .index = index,
        //     .data = (char *) secret,
        //     .data_size = secret_len
        // };

        auto key_share = KeyShare();
        key_share.index = index;
        key_share.data_size = secret_len;
        key_share.data =  new char[secret_len];

        memcpy(key_share.data, secret, secret_len);

        auto secret_hex = key_to_string((unsigned char *) secret, secret_len);

        printf("secret_hex: %s\n", secret_hex.c_str());

        return addKeyShare(enclave_id, key_share, _threshold);

        // auto secret_hex = key_to_string((unsigned char *) secret, secret_len);

        // printf("secret_hex: %s\n", secret_hex.c_str());
    }

    void SealingKeyManager::listKeyShares() {
        // std::lock_guard<std::mutex> lock(mutex_key_shares);
        for (const auto& key_share : key_shares) {
            auto key_share_data_hex = key_to_string((unsigned char *) key_share.data, key_share.data_size);

            printf("Key share: %s index: %zu\n", key_share_data_hex.c_str(), key_share.index);
        }
    }

    bool SealingKeyManager::isSeedEmpty() {
        auto is_null = sealed_seed == nullptr;
        bool is_seed_empty = std::all_of(sealed_seed, sealed_seed + sealed_seed_size, [](unsigned char c) {
            return c == 0;
        });
        return is_null || is_seed_empty;
    }

    utils::APIResponse SealingKeyManager::recoverSeed(sgx_enclave_id_t& enclave_id) {

        // Calculate the total size needed for all sealed_data
        size_t total_size = 0;
        for (const auto& ks : key_shares) {
            total_size += ks.data_size;
        }

        // Allocate memory for all_key_shares
        char* all_key_shares = new char[total_size];

        size_t key_shares_size = key_shares.size();

        // Allocate memory for key_share_indexes
        uint8_t key_share_indexes[key_shares_size];

        // Fill the arrays
        size_t current_position = 0;
        for (size_t i = 0; i < key_shares_size; ++i) {

            // Copy sealed_data into all_key_shares
            memcpy(all_key_shares + current_position, key_shares[i].data, key_shares[i].data_size);
            current_position += key_shares[i].data_size;

            // Fill key_share_indexes
            key_share_indexes[i] = (uint8_t) key_shares[i].index;
        }

        // auto all_key_shares_hex = key_to_string((unsigned char *) all_key_shares, total_size);

        // printf("all key shares: %s \n", all_key_shares_hex.c_str());

        // for (size_t i = 0; i < key_shares_size; ++i) {
        //     printf("key_share_indexes[%zu]: %u\n", i, key_share_indexes[i]);
        // }

        size_t key_share_data_size = key_shares[0].data_size;
        size_t num_key_shares = key_shares_size;

        sealed_seed_size = utils::sgx_calc_sealed_data_size(0U, (uint32_t) SECRET_SIZE);
        sealed_seed = new char[sealed_seed_size];
        memset(sealed_seed, 0, sealed_seed_size);

        sgx_status_t ecall_ret;
        sgx_status_t  status = recover_seed(
            enclave_id, &ecall_ret,
            all_key_shares, total_size, 
            key_share_indexes, num_key_shares,
            key_share_data_size, threshold,
            sealed_seed, sealed_seed_size);

        if (ecall_ret != SGX_SUCCESS) {
            return utils::APIResponse {
                    .success = false,
                    .code = 500,
                    .message = "Recove Seed Ecall failed "
                };
        }  if (status != SGX_SUCCESS) {
            return utils::APIResponse {
                    .success = false,
                    .code = 500,
                    .message = "Recove Seed failed "
                };
        }

        return utils::APIResponse {
            .success = true,
            .code = 0,
            .message = ""
        };

    }

}