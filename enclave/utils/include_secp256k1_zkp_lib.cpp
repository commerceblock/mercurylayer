#include <cstdlib> // For abort()

extern "C" {
    #include "include_secp256k1_zkp_lib.h"

    void secp256k1_default_illegal_callback_fn(const char* str, void* data) {
        (void)str;
        (void)data;
        abort();
    }

    void secp256k1_default_error_callback_fn(const char* str, void* data) {
        (void)str;
        (void)data;
        abort();
    }
}