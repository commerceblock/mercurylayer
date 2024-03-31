#pragma once

#ifndef DB_MANAGER_H
#define DB_MANAGER_H

#include <string>

namespace db_manager {

    // Remove these 2 functions. Sealed seeds should be stored in the file system.
    bool add_sealed_seed(char* sealed_secret, size_t sealed_secret_size, std::string& error_message);
    bool get_sealed_seed(char* sealed_secret, size_t sealed_secret_size, std::string& error_message);
}

#endif // DB_MANAGER_H