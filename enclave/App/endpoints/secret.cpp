#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wnon-virtual-dtor"
#pragma GCC diagnostic ignored "-Wcast-qual"
#pragma GCC diagnostic ignored "-Wfloat-equal"
#pragma GCC diagnostic ignored "-Wshadow"
#pragma GCC diagnostic ignored "-Wconversion"
#include <lib/crow_all.h>
#pragma GCC diagnostic pop

#include "../../utils/strencodings.h"
#include "../sealing_key_manager/sealing_key_manager.h"

namespace endpointSecret {
    crow::response handleAddMnemonic(const crow::request& req, sgx_enclave_id_t& enclave_id, std::mutex& mutex_enclave_id, sealing_key_manager::SealingKeyManager& sealing_key_manager) {

        auto req_body = crow::json::load(req.body);
        if (!req_body) {
            return crow::response(400);
        }

        if (req_body.count("mnemonic") == 0 || 
            req_body.count("password") == 0 || 
            req_body.count("index") == 0 ||
            req_body.count("threshold") == 0) {
            return crow::response(400, "Invalid parameters. They must be 'mnemonic', 'password', 'index' and 'threshold'.");
        }

        std::string mnemonic = req_body["mnemonic"].s();
        std::string password = req_body["password"].s();
        int64_t index = req_body["index"].i();
        int64_t threshold = req_body["threshold"].i();

        const std::lock_guard<std::mutex> lock(mutex_enclave_id);

        auto ret = sealing_key_manager.addMnemonic(enclave_id, mnemonic, password, (size_t) index, (size_t) threshold);

        if (!ret.success) {
            return crow::response(ret.code, ret.message);
        }

        crow::json::wvalue result({{"message", "OK."}});
        return crow::response{result};
    }

    crow::response handleAddSecret(const crow::request& req, sgx_enclave_id_t& enclave_id, std::mutex& mutex_enclave_id, sealing_key_manager::SealingKeyManager& sealing_key_manager) {

        auto req_body = crow::json::load(req.body);
        if (!req_body) {
            return crow::response(400);
        }

        if (req_body.count("encrypted_secret_key") == 0 || 
            req_body.count("sender_public_key") == 0) {
            return crow::response(400, "Invalid parameters. They must be 'encrypted_secret_key', 'sender_public_key'.");
        }

        const std::lock_guard<std::mutex> lock(mutex_enclave_id);

        auto isKeyAdded = sealing_key_manager.addSecret(enclave_id);

        if (!isKeyAdded) {
            return crow::response(400, "Seed already exists. Cannot add a new secret.");
        }

        crow::json::wvalue result({{"message", "Secret added successfully."}});
        return crow::response{result};
    }

    crow::response getEphemeralPublicKey(sealing_key_manager::SealingKeyManager& sealing_key_manager) {

        if (!sealing_key_manager.isSeedEmpty()) {
            return crow::response(401, "Seed already exists. No need for replication.");
        }

        auto public_key_hex = key_to_string(sealing_key_manager.ephemeral_exchange_public_key, sizeof(sealing_key_manager.ephemeral_exchange_public_key));

        crow::json::wvalue result({{"ephemeral_public_key", public_key_hex}});
        return crow::response{result};
    }
} // namespace endpointSecret