#include "transfer_receiver.h"

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wnon-virtual-dtor"
#pragma GCC diagnostic ignored "-Wcast-qual"
#pragma GCC diagnostic ignored "-Wfloat-equal"
#pragma GCC diagnostic ignored "-Wshadow"
#pragma GCC diagnostic ignored "-Wconversion"
#include <lib/crow_all.h>
#pragma GCC diagnostic pop

#include "../sealing_key_manager/sealing_key_manager.h"
#include "../../utils/strencodings.h"
#include <mutex>
#include "statechain/transfer_receiver.h"

namespace endpointTransferReceiver {
    crow::response handleKeyUpdate(const crow::request& req, sgx_enclave_id_t& enclave_id, std::mutex& mutex_enclave_id, sealing_key_manager::SealingKeyManager& sealing_key_manager) {

        if (sealing_key_manager.isSeedEmpty()) {
            return crow::response(500, "Sealing key is empty.");
        }

        auto req_body = crow::json::load(req.body);
        if (!req_body)
            return crow::response(400);

        if (req_body.count("statechain_id") == 0 || 
            req_body.count("t2") == 0 ||
            req_body.count("x1") == 0) {
            return crow::response(400, "Invalid parameters. They must be 'statechain_id', 't2' and 'x1'.");
        }

        std::string statechain_id = req_body["statechain_id"].s();
        std::string t2_hex = req_body["t2"].s();
        std::string x1_hex = req_body["x1"].s();

        if (t2_hex.substr(0, 2) == "0x") {
            t2_hex = t2_hex.substr(2);
        }

        std::vector<unsigned char> serialized_t2 = ParseHex(t2_hex);

        if (serialized_t2.size() != 32) {
            return crow::response(400, "Invalid t2 length. Must be 32 bytes!");
        }

        if (x1_hex.substr(0, 2) == "0x") {
            x1_hex = x1_hex.substr(2);
        }

        std::vector<unsigned char> serialized_x1 = ParseHex(x1_hex);

        if (serialized_x1.size() != 32) {
            return crow::response(400, "Invalid x1 length. Must be 32 bytes!");
        }
        
        const std::lock_guard<std::mutex> lock(mutex_enclave_id);

        return transfer_receiver::keyupdate(
            enclave_id, 
            statechain_id, 
            serialized_t2,
            serialized_x1,
            sealing_key_manager
        );
    }
} // namespace endpointTransferReceiver