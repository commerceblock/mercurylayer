#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wnon-virtual-dtor"
#pragma GCC diagnostic ignored "-Wcast-qual"
#pragma GCC diagnostic ignored "-Wfloat-equal"
#pragma GCC diagnostic ignored "-Wshadow"
#pragma GCC diagnostic ignored "-Wconversion"
#include <lib/crow_all.h>
#pragma GCC diagnostic pop

#include "../database/db_manager.h"
#include "../sealing_key_manager/sealing_key_manager.h"

namespace endpointWithdraw {
    crow::response handleWithdraw(const std::string& statechain_id) {

        if (db_manager::delete_statechain(statechain_id)) {
            return crow::response(200, "Statechain deleted.");
        } else {
            return crow::response(500, "Failed to connect to the database and delete statechain.");
        }        

    }
} // namespace endpointWithdraw