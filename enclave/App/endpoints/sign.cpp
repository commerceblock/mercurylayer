#include "sign.h"

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
#include "statechain/sign.h"

namespace endpointSignature {
    crow::response handleGetPublicNonce(const crow::request& req, sgx_enclave_id_t& enclave_id, std::mutex& mutex_enclave_id, sealing_key_manager::SealingKeyManager& sealing_key_manager) {

        if (sealing_key_manager.isSeedEmpty()) {
            return crow::response(500, "Sealing key is empty.");
        }

        auto req_body = crow::json::load(req.body);
        if (!req_body)
            return crow::response(400);

        if (req_body.count("statechain_id") == 0) {
            return crow::response(400, "Invalid parameters. They must be 'statechain_id'.");
        }

        std::string statechain_id = req_body["statechain_id"].s();

        const std::lock_guard<std::mutex> lock(mutex_enclave_id);

        return signature::get_public_nonce(enclave_id, statechain_id, sealing_key_manager);
    }

    crow::response handleGetPartialSignature(const crow::request& req, sgx_enclave_id_t& enclave_id, std::mutex& mutex_enclave_id, sealing_key_manager::SealingKeyManager& sealing_key_manager) {

        if (sealing_key_manager.isSeedEmpty()) {
            return crow::response(500, "Sealing key is empty.");
        }

        auto req_body = crow::json::load(req.body);
        if (!req_body)
            return crow::response(400);

        if (req_body.count("statechain_id") == 0 || 
            req_body.count("negate_seckey") == 0 ||
            req_body.count("session") == 0) {
            return crow::response(400, "Invalid parameters. They must be 'statechain_id', 'negate_seckey' and 'session'.");
        }

        std::string statechain_id = req_body["statechain_id"].s();
        int64_t negate_seckey = req_body["negate_seckey"].i();
        std::string session_hex = req_body["session"].s();


        if (session_hex.substr(0, 2) == "0x") {
            session_hex = session_hex.substr(2);
        }

        std::vector<unsigned char> serialized_session = ParseHex(session_hex);

        if (serialized_session.size() != 133) {
            return crow::response(400, "Invalid session length. Must be 133 bytes!");
        }

        const std::lock_guard<std::mutex> lock(mutex_enclave_id);
        
        return signature::get_partial_signature(enclave_id, statechain_id, negate_seckey, serialized_session, sealing_key_manager); 
    }

    crow::response signatureCount(const std::string& statechain_id) {
        return signature::signature_count(statechain_id);
    }
} // namespace deposit
