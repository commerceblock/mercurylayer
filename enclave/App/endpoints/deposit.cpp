#include "deposit.h"

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wnon-virtual-dtor"
#pragma GCC diagnostic ignored "-Wcast-qual"
#pragma GCC diagnostic ignored "-Wfloat-equal"
#pragma GCC diagnostic ignored "-Wshadow"
#pragma GCC diagnostic ignored "-Wconversion"
#include <lib/crow_all.h>
#pragma GCC diagnostic pop

#include "../sealing_key_manager/sealing_key_manager.h"
#include <mutex>
#include "statechain/deposit.h"

namespace endpoinDeposit {
    crow::response handleGetPublicKey(const crow::request& req, sgx_enclave_id_t& enclave_id, std::mutex& mutex_enclave_id, sealing_key_manager::SealingKeyManager& sealing_key_manager) {
        if (sealing_key_manager.isSeedEmpty()) {
            return crow::response(500, "Sealing key is empty.");
        }

        auto req_body = crow::json::load(req.body);
        if (!req_body)
            return crow::response(400);

        if (req_body.count("statechain_id") == 0)
            return crow::response(400, "Invalid parameter. It must be 'statechain_id'.");

        std::string statechain_id = req_body["statechain_id"].s();

        const std::lock_guard<std::mutex> lock(mutex_enclave_id);

        return deposit::get_public_key(enclave_id, statechain_id, sealing_key_manager);
    }
} // namespace deposit
