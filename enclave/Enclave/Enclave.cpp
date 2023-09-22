#include "Enclave_t.h"
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "../utils/include_secp256k1_zkp_lib.h"

#include "sgx_tcrypto.h"
#include "sgx_trts.h"
#include "sgx_tseal.h"

sgx_status_t generate_new_keypair(
    unsigned char *compressed_server_pubkey, 
    size_t compressed_server_pubkey_size, 
    
    char *sealedkeypair, 
    size_t sealedkeypair_size)
{
    (void) compressed_server_pubkey_size;

    // Step 1: Open Context.
    sgx_status_t ret = SGX_ERROR_UNEXPECTED;
    sgx_ecc_state_handle_t p_ecc_handle = NULL;

    if ((ret = sgx_ecc256_open_context(&p_ecc_handle)) != SGX_SUCCESS)
    {
        ocall_print_string("\nTrustedApp: sgx_ecc256_open_context() failed !\n");
        if (p_ecc_handle != NULL)
        {
            sgx_ecc256_close_context(p_ecc_handle);
        }
        return ret;
    }

    secp256k1_context* ctx = secp256k1_context_create(SECP256K1_CONTEXT_SIGN | SECP256K1_CONTEXT_VERIFY);

    unsigned char server_privkey[32];
    memset(server_privkey, 0, 32);

    do {
        sgx_read_rand(server_privkey, 32);
    } while (!secp256k1_ec_seckey_verify(ctx, server_privkey));

    secp256k1_keypair server_keypair;

    int return_val = secp256k1_keypair_create(ctx, &server_keypair, server_privkey);
    assert(return_val);

    secp256k1_pubkey server_pubkey;
    return_val = secp256k1_keypair_pub(ctx, &server_pubkey, &server_keypair);
    assert(return_val);

    unsigned char local_compressed_server_pubkey[33];
    memset(local_compressed_server_pubkey, 0, 33);

    size_t len = sizeof(local_compressed_server_pubkey);
    return_val = secp256k1_ec_pubkey_serialize(ctx, local_compressed_server_pubkey, &len, &server_pubkey, SECP256K1_EC_COMPRESSED);
    assert(return_val);
    // Should be the same size as the size of the output, because we passed a 33 byte array.
    assert(len == sizeof(local_compressed_server_pubkey));

    memcpy(compressed_server_pubkey, local_compressed_server_pubkey, 33);

    secp256k1_context_destroy(ctx);

    // Step 3: Calculate sealed data size.
    if (sealedkeypair_size >= sgx_calc_sealed_data_size(0U, sizeof(server_keypair)))
    {
        if ((ret = sgx_seal_data(0U, NULL, sizeof(server_keypair.data), server_keypair.data, (uint32_t) sealedkeypair_size, (sgx_sealed_data_t *)sealedkeypair)) != SGX_SUCCESS)
        {
            ocall_print_string("\nTrustedApp: sgx_seal_data() failed !\n");
        }
    }
    else
    {
        ocall_print_string("\nTrustedApp: Size allocated for sealedprivkey by untrusted app is less than the required size !\n");
        ret = SGX_ERROR_INVALID_PARAMETER;
    }

    // Step 4: Close Context.
    if (p_ecc_handle != NULL)
    {
        sgx_ecc256_close_context(p_ecc_handle);
    }

    return ret;
}

sgx_status_t unseal(char* sealed, size_t sealed_size, unsigned char *raw_data, size_t raw_data_size)
{
    // silent [-Wunused-parameter] warning
    (void)sealed_size;
    (void)raw_data_size;

    sgx_status_t ret = SGX_ERROR_UNEXPECTED;

    // Step 1: Calculate sealed/encrypted data length.
    uint32_t unsealed_data_size = sgx_get_encrypt_txt_len((const sgx_sealed_data_t *)sealed);
    uint8_t *const unsealed_data = (uint8_t *)malloc(unsealed_data_size); // Check malloc return;
    if (unsealed_data == NULL)
    {
        ocall_print_string("\nTrustedApp: malloc(unsealed_data_size) failed !\n");
        if (unsealed_data != NULL)
        {
            free(unsealed_data);
        }
    }

    // Step 2: Unseal data.
    if ((ret = sgx_unseal_data((sgx_sealed_data_t *)sealed, NULL, NULL, unsealed_data, &unsealed_data_size)) != SGX_SUCCESS)
    {
        ocall_print_string("\nTrustedApp: sgx_unseal_data() failed !\n");
        if (unsealed_data != NULL)
        {
            free(unsealed_data);
        }
    }

    ret = SGX_SUCCESS;

    memcpy(raw_data, unsealed_data, raw_data_size);

    return ret;
}

sgx_status_t partial_signature(
    unsigned char* serialized_client_pubnonce, size_t serialized_client_pubnonce_size,
    unsigned char* msg, size_t msg_size,
    char* sealed_keypair, size_t sealed_keypair_size,
    unsigned char* keyagg_cache_data, size_t keyagg_cache_data_size,
    unsigned char *partial_sig_data, size_t partial_sig_data_size,
    unsigned char* server_pubnonce_data, size_t server_pubnonce_data_size) 
{
    // serialized public nonce must be 66 bytes
    assert(serialized_client_pubnonce_size == 66);

    (void) msg_size;
    (void) keyagg_cache_data_size;
    (void) partial_sig_data_size;
    (void) server_pubnonce_data_size;

    secp256k1_keypair server_keypair;
    unseal(sealed_keypair, sealed_keypair_size, server_keypair.data, sizeof(server_keypair.data));

    secp256k1_context* ctx = secp256k1_context_create(SECP256K1_CONTEXT_VERIFY);

    // step 1 - Extract server secret and public keys from keypair

    unsigned char server_seckey[32];
    int return_val = secp256k1_keypair_sec(ctx, server_seckey, &server_keypair);
    assert(return_val);

    secp256k1_pubkey server_pubkey;
    return_val = secp256k1_keypair_pub(ctx, &server_pubkey, &server_keypair);
    assert(return_val);

    // step 2 - Generate secret and public nonce

    unsigned char session_id[32];
    memset(session_id, 0, 32);
    sgx_read_rand(session_id, sizeof(session_id));

    secp256k1_musig_pubnonce server_pubnonce;
    secp256k1_musig_secnonce server_secnonce;

    return_val = secp256k1_musig_nonce_gen(ctx, &server_secnonce, &server_pubnonce, session_id, server_seckey, &server_pubkey, msg, NULL, NULL);
    assert(return_val);
    
    // step 3 - Parse client public nonce

    secp256k1_musig_pubnonce client_pubnonce;
    return_val = secp256k1_musig_pubnonce_parse(ctx, &client_pubnonce, serialized_client_pubnonce);
    assert(return_val);

    // step 4 - Generate partial signature

    secp256k1_musig_aggnonce agg_pubnonce;

    const secp256k1_musig_pubnonce *pubnonces[2];
    pubnonces[0] = &client_pubnonce;
    pubnonces[1] = &server_pubnonce;

    return_val = secp256k1_musig_nonce_agg(ctx, &agg_pubnonce, pubnonces, 2);
    assert(return_val);

    secp256k1_musig_keyagg_cache keyagg_cache;
    memcpy(keyagg_cache.data, keyagg_cache_data, sizeof(keyagg_cache.data));

    secp256k1_musig_session session;

    return_val = secp256k1_musig_nonce_process(ctx, &session, &agg_pubnonce, msg, &keyagg_cache, NULL);
    assert(return_val);

    secp256k1_musig_partial_sig partial_sig;
    
    return_val = secp256k1_musig_partial_sign(ctx, &partial_sig, &server_secnonce, &server_keypair, &keyagg_cache, &session);
    assert(return_val);

    return_val = secp256k1_musig_partial_sig_verify(ctx, &partial_sig, &server_pubnonce, &server_pubkey, &keyagg_cache, &session);
    assert(return_val);

    unsigned char serialized_server_pubnonce[66];
    return_val = secp256k1_musig_pubnonce_serialize(ctx, serialized_server_pubnonce, &server_pubnonce);
    assert(return_val);

    unsigned char serialized_partial_sig[32];
    return_val = secp256k1_musig_partial_sig_serialize(ctx,serialized_partial_sig, &partial_sig);
    assert(return_val);

    memcpy(partial_sig_data, serialized_partial_sig, sizeof(serialized_partial_sig));
    memcpy(server_pubnonce_data, serialized_server_pubnonce, sizeof(serialized_server_pubnonce));

    secp256k1_context_destroy(ctx);

    return SGX_SUCCESS;
}

sgx_status_t generate_nonce(
    char* sealed_keypair, size_t sealed_keypair_size,
    char* sealed_secnonce, size_t sealed_secnonce_size,
    unsigned char* server_pubnonce_data, size_t server_pubnonce_data_size)
{
    // TODO: replace with assert
    (void) sealed_keypair_size;
    (void) sealed_secnonce_size;
    (void) server_pubnonce_data_size;

    secp256k1_keypair server_keypair;
    unseal(sealed_keypair, sealed_keypair_size, server_keypair.data, sizeof(server_keypair.data));

    secp256k1_context* ctx = secp256k1_context_create(SECP256K1_CONTEXT_VERIFY);

    // step 1 - Extract server secret and public keys from keypair

    unsigned char server_seckey[32];
    int return_val = secp256k1_keypair_sec(ctx, server_seckey, &server_keypair);
    assert(return_val);

    secp256k1_pubkey server_pubkey;
    return_val = secp256k1_keypair_pub(ctx, &server_pubkey, &server_keypair);
    assert(return_val);

    // step 2 - Generate secret and public nonce

    unsigned char session_id[32];
    memset(session_id, 0, 32);
    sgx_read_rand(session_id, sizeof(session_id));

    secp256k1_musig_pubnonce server_pubnonce;
    secp256k1_musig_secnonce server_secnonce;

    return_val = secp256k1_musig_nonce_gen(ctx, &server_secnonce, &server_pubnonce, session_id, server_seckey, &server_pubkey, NULL, NULL, NULL);
    assert(return_val);

    // step 3 - Seal secret nonce

    sgx_status_t ret = SGX_ERROR_UNEXPECTED;

    if (sealed_secnonce_size >= sgx_calc_sealed_data_size(0U, sizeof(server_secnonce.data)))
    {
        if ((ret = sgx_seal_data(0U, NULL, sizeof(server_secnonce.data), server_secnonce.data, (uint32_t) sealed_secnonce_size, (sgx_sealed_data_t *)sealed_secnonce)) != SGX_SUCCESS)
        {
            ocall_print_string("\nTrustedApp: sgx_seal_data() failed !\n");
        }
    }
    else
    {
        ocall_print_string("\nTrustedApp: Size allocated for sealedprivkey by untrusted app is less than the required size !\n");
        ret = SGX_ERROR_INVALID_PARAMETER;
    }

    unsigned char serialized_server_pubnonce[66];
    return_val = secp256k1_musig_pubnonce_serialize(ctx, serialized_server_pubnonce, &server_pubnonce);
    assert(return_val);

    memcpy(server_pubnonce_data, serialized_server_pubnonce, sizeof(serialized_server_pubnonce));

    secp256k1_context_destroy(ctx);

    return ret;
    
}

sgx_status_t get_partial_signature(
    char* sealed_keypair, size_t sealed_keypair_size,
    char* sealed_secnonce, size_t sealed_secnonce_size,
    unsigned char* keyaggcoef, size_t keyaggcoef_size,
    int negate_seckey,
    unsigned char* session_data, size_t session_data_size,
    unsigned char* serialized_server_pubnonce, size_t serialized_server_pubnonce_size,
    unsigned char *partial_sig_data, size_t partial_sig_data_size)
{
    (void) partial_sig_data;
    (void) partial_sig_data_size;
    (void) serialized_server_pubnonce_size;
    (void) keyaggcoef_size;
    // step 0 - Unseal sealed keypair

    secp256k1_keypair server_keypair;
    unseal(sealed_keypair, sealed_keypair_size, server_keypair.data, sizeof(server_keypair.data));

    secp256k1_context* ctx = secp256k1_context_create(SECP256K1_CONTEXT_VERIFY);

    // step 1 - Extract server secret and public keys from keypair

    unsigned char server_seckey[32];
    int return_val = secp256k1_keypair_sec(ctx, server_seckey, &server_keypair);
    assert(return_val);

    secp256k1_pubkey server_pubkey;
    return_val = secp256k1_keypair_pub(ctx, &server_pubkey, &server_keypair);
    assert(return_val);

    // step 2 - Unseal sealed sealed_secnonce

    secp256k1_musig_secnonce server_secnonce;
    unseal(sealed_secnonce, sealed_secnonce_size, server_secnonce.data, sizeof(server_secnonce.data));

    secp256k1_musig_session session;
    memcpy(session.data, session_data, session_data_size);

    secp256k1_musig_pubnonce server_pubnonce;
    secp256k1_musig_pubnonce_parse(ctx, &server_pubnonce, serialized_server_pubnonce);

    secp256k1_musig_partial_sig partial_sig;

    return_val = secp256k1_blinded_musig_partial_sign(ctx, &partial_sig, &server_secnonce, &server_keypair, &session, keyaggcoef, negate_seckey);
    assert(return_val);

    unsigned char serialized_partial_sig[32];
    memset(serialized_partial_sig, 0, 32);
    assert(sizeof(serialized_partial_sig) == partial_sig_data_size);

    return_val = secp256k1_musig_partial_sig_serialize(ctx,serialized_partial_sig, &partial_sig);
    assert(return_val);   

    memcpy(partial_sig_data, serialized_partial_sig, sizeof(serialized_partial_sig));

    secp256k1_context_destroy(ctx);
    
    return SGX_SUCCESS;
}