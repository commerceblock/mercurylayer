#include "sealing_key_manager.h"

#include "../../utils/strencodings.h"
#include "../database/db_manager.h"
#include "../Enclave_u.h"
#include "../utilities/utilities.h"

#include <algorithm>
#include <bc-bip39/bc-bip39.h>
#include <cassert>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <string.h>
#include <iostream>

namespace sealing_key_manager {

    utils::APIResponse SealingKeyManager::addKeyShare(sgx_enclave_id_t& enclave_id, const SealedKeyShare& new_key_share, size_t _threshold) {

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

        if (key_shares.size() == threshold) {
            // Recover seed
            auto ret = recoverSeed(enclave_id);
            if (!ret.success) {
                return ret;
            }
        }

        if (!isSeedEmpty()) {
            writeSeedToFile();
        }

        return utils::APIResponse {
            .success = true,
            .code = 0,
            .message = ""
        };
    }

    utils::APIResponse SealingKeyManager::addMnemonic(sgx_enclave_id_t& enclave_id, const std::string& mnemonic, const std::string& password, size_t index, size_t _threshold) {

        if (!isSeedEmpty()) {
            return utils::APIResponse {
                .success = false,
                .code = 400,
                .message = "Seed already exists"
            };
        }

        unsigned char* password_bytes = (unsigned char*) malloc(password.size());
        memcpy(password_bytes, password.c_str(), password.size());

        size_t max_secret_len = SECRET_SIZE;
        uint8_t xor_secret[max_secret_len];
        memset(xor_secret, 0, max_secret_len);
        size_t xor_secret_len = bip39_secret_from_mnemonics(mnemonic.c_str(), xor_secret, max_secret_len);

        assert(xor_secret_len == SECRET_SIZE);

        size_t sealed_key_share_data_size = utils::sgx_calc_sealed_data_size(0U, (uint32_t) xor_secret_len);
        char sealed_key_share_data[sealed_key_share_data_size];

        sgx_status_t ecall_ret;
        sgx_status_t status = sealed_key_from_mnemonics(
            enclave_id, &ecall_ret, 
            xor_secret, xor_secret_len,
            password_bytes, password.size(),
            sealed_key_share_data, sealed_key_share_data_size);

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

        auto sealed_key_share = SealedKeyShare();
        sealed_key_share.index = index;
        sealed_key_share.data_size = sealed_key_share_data_size;
        sealed_key_share.data = new char[sealed_key_share_data_size];

        memcpy(sealed_key_share.data, sealed_key_share_data, sealed_key_share_data_size);

        return addKeyShare(enclave_id, sealed_key_share, _threshold);
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

        size_t key_share_data_size = key_shares[0].data_size;
        size_t num_key_shares = key_shares_size;

        sealed_seed_size = utils::sgx_calc_sealed_data_size(0U, (uint32_t) SECRET_SIZE);
        sealed_seed = new char[sealed_seed_size];
        memset(sealed_seed, 0, sealed_seed_size);

        // auto all_key_shares_hex = key_to_string((unsigned char *) all_key_shares, total_size);
        // printf("all_key_shares_hex: %s\n", all_key_shares_hex.c_str());

        sgx_status_t ecall_ret;
        sgx_status_t  status = recover_seed(
            enclave_id, &ecall_ret,
            all_key_shares, total_size, 
            key_share_indexes, num_key_shares,
            key_share_data_size, threshold, SECRET_SIZE,
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

    bool SealingKeyManager::writeSeedToFile() {
        // Check if the file exists
        const std::string filename = "node.sealed_seed";
        if (std::filesystem::exists(filename)) {
            return false; // File already exists, so we don't overwrite it
        }

        if (isSeedEmpty()) {
            return false; // Sealed seed is empty
        }

        // Open file in binary mode to write
        std::ofstream file(filename, std::ios::binary | std::ios::out);
        if (!file.is_open()) {
            return false; // Failed to open file for writing
        }

        // Write sealed_seed to file
        file.write(sealed_seed, sealed_seed_size);
        bool success = file.good(); // Check if write operation was successful

        file.close();
        return success;
    }

    bool SealingKeyManager::readSeedFromFile() {
        const std::string filename = "node.sealed_seed";

        // Check if the file exists and is not empty
        if (!std::filesystem::exists(filename) || std::filesystem::is_empty(filename)) {
            return false; // File does not exist or is empty
        }

        // Open the file in binary mode
        std::ifstream file(filename, std::ios::binary | std::ios::ate);
        if (!file.is_open()) {
            return false; // Failed to open file
        }

        // Get the size of the file
        std::streamsize size = file.tellg();
        file.seekg(0, std::ios::beg); // Move to the beginning of the file

        // Allocate memory for sealed_seed
        sealed_seed = new char[size];

        // Read the contents of the file into sealed_seed
        if (!file.read(sealed_seed, size)) {
            delete[] sealed_seed; // Clean up in case of read failure
            sealed_seed = nullptr;
            return false;
        }

        // Update the size of the data read
        sealed_seed_size = static_cast<size_t>(size);
        return true;
    }

    /* bool SealingKeyManager::testSealedSeed(sgx_enclave_id_t& enclave_id) {

        if (isSeedEmpty()) {
            std::cout << "[test] seed empty" << std::endl;
            return false;
        }

        size_t raw_data_size = SECRET_SIZE;
        unsigned char* raw_data = new unsigned char[raw_data_size];
        memset(raw_data, 0, raw_data_size);

        sgx_status_t ecall_ret;
        sgx_status_t  status = unseal(
            enclave_id, &ecall_ret,
            sealed_seed, sealed_seed_size, 
            raw_data, raw_data_size);

        if (ecall_ret != SGX_SUCCESS) {
            std::cout <<  "unseal failed " << std::endl;
        }  if (status != SGX_SUCCESS) {
            std::cout <<  "unseal failed " << std::endl;
        }

        std::string raw_data_hex = key_to_string(raw_data, raw_data_size);
        std::cout << "raw_data_hex: " << raw_data_hex << std::endl;

        delete[] raw_data;

        return true;
    } */

}