#include <stdio.h>
#include <stdlib.h>
#include <assert.h>
#include <string.h>

#include <secp256k1.h>
#include <secp256k1_schnorrsig.h>
#include <secp256k1_musig.h>

#include "examples_util.h"

struct signer_data {
    secp256k1_keypair keypair;
    unsigned char seckey[32];
    secp256k1_pubkey pubkey;

    secp256k1_musig_secnonce secnonce;
    secp256k1_musig_pubnonce pubnonce;

    /* only used by servers */
    unsigned char keyaggcoef[32];
    int negate_seckey;
};

static int create_keypair(const secp256k1_context* ctx, secp256k1_keypair* keypair, secp256k1_pubkey* pubkey, unsigned char* _seckey) {

    unsigned char seckey[32];

    while (1) {
        if (!fill_random(seckey, sizeof(seckey))) {
            printf("Failed to generate randomness\n");
            return 0;
        }
        if (secp256k1_keypair_create(ctx, keypair, seckey)) {
            break;
        }
    }
    if (!secp256k1_keypair_pub(ctx, pubkey, keypair)) {
        return 0;
    }

    memcpy(_seckey, seckey, sizeof(seckey));

    return 1;
}

static int create_nonces(
    const secp256k1_context* ctx,
    secp256k1_musig_secnonce* secnonce,
    secp256k1_musig_pubnonce* pubnonce, 
    const unsigned char* seckey,
    const secp256k1_pubkey* pubkey
) {
    unsigned char session_id[32];

    if (!fill_random(session_id, sizeof(session_id))) {
        printf("Failed to generate randomness\n");
        return 0;
    }

    if (!secp256k1_musig_nonce_gen(ctx, secnonce, pubnonce, session_id, seckey, pubkey, NULL, NULL, NULL)) {
        printf("Failed to generate nonce\n");
        return 0;
    }

    return 1;
}

int sign_and_verify(secp256k1_context* ctx, const size_t _server_count) {

    const size_t server_count = _server_count;

    struct signer_data client_data;

    struct signer_data *server_data;

    const secp256k1_pubkey **pubkeys_ptr;

    secp256k1_xonly_pubkey aggregate_xonly_pubkey;

    secp256k1_musig_keyagg_cache cache;

    const secp256k1_musig_pubnonce **pubnonces;

    secp256k1_musig_aggnonce agg_pubnonce;

    unsigned char blinding_factor[32];

    unsigned char msg[32];

    secp256k1_musig_session session;

    secp256k1_musig_partial_sig *partial_sig;

    const secp256k1_musig_partial_sig **partial_sig_arg;

    unsigned char agg_sig[64];

    size_t i;

    int result = 0;

    server_data = malloc(server_count * sizeof(struct signer_data));

    pubkeys_ptr = malloc((server_count + 1) * sizeof(secp256k1_pubkey*));

    pubnonces = malloc((server_count + 1) * sizeof(secp256k1_musig_pubnonce*));

    partial_sig = malloc((server_count + 1) * sizeof(secp256k1_musig_partial_sig));

    partial_sig_arg = malloc((server_count + 1) * sizeof(secp256k1_musig_partial_sig*));

    if (!fill_random(msg, sizeof(msg))) {
        printf("Failed to generate randomness\n");
        goto cleanup;
    }

    if (!create_keypair(ctx, &client_data.keypair, &client_data.pubkey, client_data.seckey)) {
        printf("fail\n");
        printf("Failed to generate client keypair\n");
        goto cleanup;
    }

    pubkeys_ptr[0] = &client_data.pubkey;

    for (i = 0; i < server_count; i++)
    {
        if (!create_keypair(ctx, &server_data[i].keypair, &server_data[i].pubkey, server_data[i].seckey)) {
            printf("fail\n");
            printf("Failed to generate server %d keypair\n", (int) i);
            goto cleanup;
        }

        pubkeys_ptr[i+1] = &server_data[i].pubkey;
    }

    if (!secp256k1_musig_pubkey_agg(ctx, NULL, &aggregate_xonly_pubkey, &cache, pubkeys_ptr, server_count + 1)) {
        printf("fail\n");
        printf("Failed to generate aggregated x-only public key\n");
        goto cleanup;
    }

    if (!create_nonces(ctx, &client_data.secnonce, &client_data.pubnonce,  client_data.seckey, &client_data.pubkey)) {
        printf("fail\n");
        printf("Failed to generate client nonce\n");
        goto cleanup;
    }

    pubnonces[0] = &client_data.pubnonce;

    for (i = 0; i < server_count; i++)
    {
        if (!create_nonces(ctx, &server_data[i].secnonce, &server_data[i].pubnonce,  server_data[i].seckey, &server_data[i].pubkey)) {
            printf("fail\n");
            printf("Failed to generate server %d nonce\n", (int) i);
            goto cleanup;
        }

        pubnonces[i+1] = &server_data[i].pubnonce;
    }

    if (!secp256k1_musig_nonce_agg(ctx, &agg_pubnonce, pubnonces, server_count + 1)) {
        printf("fail\n");
        printf("Failed to aggregate public nonces\n");
        goto cleanup;
    }

    if (!fill_random(blinding_factor, sizeof(blinding_factor))) {
        printf("fail\n");
        printf("Failed to generate randomness\n");
        goto cleanup;
    }

    if (!secp256k1_blinded_musig_nonce_process(ctx, &session, &agg_pubnonce, msg, &cache, NULL, blinding_factor)) {
        printf("fail\n");
        printf("Failed to create session context\n");
        goto cleanup;
    }

    if (!secp256k1_musig_partial_sign(ctx, &partial_sig[0], &client_data.secnonce, &client_data.keypair, &cache, &session)) {
        printf("fail\n");
        printf("Client failed to sign message\n");
        goto cleanup;
    }   

    if (!secp256k1_musig_partial_sig_verify(ctx, &partial_sig[0], &client_data.pubnonce, &client_data.pubkey, &cache, &session)) {
        printf("fail\n");
        printf("Failed to verify client partial signature\n");
        goto cleanup;
    }

    for (i = 0; i < server_count; i++)
    {
        if (!secp256k1_musig_get_keyaggcoef_and_negation_seckey(ctx, server_data[i].keyaggcoef, &server_data[i].negate_seckey, &cache, &server_data[i].pubkey)) {
            printf("fail\n");
            printf("Failed to calculate server %d key aggregation coefficient\n", (int) i);
            goto cleanup;
        }

         if (!secp256k1_blinded_musig_partial_sign(ctx, &partial_sig[i + 1], &server_data[i].secnonce, &server_data[i].keypair, &session, server_data[i].keyaggcoef, server_data[i].negate_seckey)) {
            printf("fail\n");
            printf("Server %d  failed to sign message\n", (int) i);
            goto cleanup;
        }

        if (!secp256k1_musig_partial_sig_verify(ctx, &partial_sig[i + 1], &server_data[i].pubnonce, &server_data[i].pubkey, &cache, &session)) {
            printf("fail\n");
            printf("Failed to verify server %d partial signature\n", (int) i);
            goto cleanup;
        }
    }

     for (i = 0; i < (server_count + 1); i++) {
        partial_sig_arg[i] = &partial_sig[i];
    }

    if (!secp256k1_musig_partial_sig_agg(ctx, agg_sig, &session, partial_sig_arg, server_count + 1)) {
        printf("fail\n");
        printf("Failed to aggregate partial signatures\n");
        goto cleanup;
    }

    if (!secp256k1_schnorrsig_verify(ctx, agg_sig, msg, 32, &aggregate_xonly_pubkey)) {
        printf("SCHNORRSIG VERIFY FAILED\n");
        goto cleanup;
    } else {
        result = 1;
        goto cleanup;
    }

cleanup:
    free(server_data);
    free(pubkeys_ptr);
    free(pubnonces);
    free(partial_sig);
    free(partial_sig_arg);
    return result;
}

int main(void) {

    secp256k1_context* ctx;
    int i;

    ctx = secp256k1_context_create(SECP256K1_CONTEXT_NONE);

    for (i = 5; i <= 50000; i *= 10) {
        printf("Signing with %d servers...\t\t\t\t", i);
        if (!sign_and_verify(ctx, i)) {
            printf("fail\n");
            printf("Failed to sign and verify\n");
            return 0;
        } else {
            printf("ok\n");
        }
    }
    secp256k1_context_destroy(ctx);
    return 0;

}