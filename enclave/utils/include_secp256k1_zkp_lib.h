#pragma once

#ifndef INCLUDE_SECP256K1_ZPK_H
#define INCLUDE_SECP256K1_ZPK_H

extern "C" {
    #include "../secp256k1-zkp/include/secp256k1.h"
    #include "../secp256k1-zkp/include/secp256k1_schnorrsig.h"
    #include "../secp256k1-zkp/include/secp256k1_musig.h"

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

#endif // INCLUDE_SECP256K1_ZPK_H