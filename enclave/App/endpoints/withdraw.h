#pragma once

#ifndef ENDPOINT_WITHDRAW_H
#define ENDPOINT_WITHDRAW_H

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wnon-virtual-dtor"
#pragma GCC diagnostic ignored "-Wcast-qual"
#pragma GCC diagnostic ignored "-Wfloat-equal"
#pragma GCC diagnostic ignored "-Wshadow"
#pragma GCC diagnostic ignored "-Wconversion"
#include <lib/crow_all.h>
#pragma GCC diagnostic pop

#include "../sealing_key_manager/sealing_key_manager.h"

namespace endpointWithdraw {
    crow::response handleWithdraw(const std::string& statechain_id);
} // namespace endpointWithdraw

#endif // ENDPOINT_WITHDRAW_H