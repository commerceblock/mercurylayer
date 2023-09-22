#include <stdio.h>
#include <assert.h>
#include <string.h>

#include <secp256k1.h>
#include <secp256k1_schnorrsig.h>
#include <secp256k1_musig.h>

#include "examples_util.h"

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

int test_sign_verify(secp256k1_context* ctx) {
    /* Client data */
    secp256k1_keypair client_keypair;
    unsigned char client_seckey[32];
    secp256k1_pubkey client_pubkey;

    secp256k1_musig_secnonce client_secnonce;
    secp256k1_musig_pubnonce client_pubnonce;

    /* Server data */
    secp256k1_keypair server_keypair;
    unsigned char server_seckey[32];
    secp256k1_pubkey server_pubkey;

    secp256k1_musig_secnonce server_secnonce;
    secp256k1_musig_pubnonce server_pubnonce;

    /* Shared data */
    const secp256k1_pubkey *pubkeys_ptr[2];

    secp256k1_xonly_pubkey aggregate_xonly_pubkey;
    secp256k1_musig_keyagg_cache cache;

    unsigned char msg[32] = "9f86d081884c7d659a2feaa0c55ad015";

    const secp256k1_musig_pubnonce *pubnonces[2];

    secp256k1_musig_aggnonce agg_pubnonce;

    secp256k1_musig_session session;

    unsigned char blinding_factor[32];

    /* secp256k1_musig_session blinded_session; */

    const secp256k1_musig_partial_sig *partial_sigs[2];

    /* unsigned char blinded_challenge[32]; */

    secp256k1_musig_partial_sig client_partial_sig;

    secp256k1_musig_partial_sig server_partial_sig;

    unsigned char keyaggcoef[32];

    int negate_seckey;

    unsigned char sig[64];

    /* Start Execution */  

    printf("Creating client and server key pairs ...\t");

    memset(&client_keypair, 0, sizeof(client_keypair));
    memset(&client_pubkey, 0, sizeof(client_pubkey));
    memset(&client_seckey, 0, sizeof(client_seckey));

    memset(&server_keypair, 0, sizeof(server_keypair));
    memset(&server_seckey, 0, sizeof(server_seckey));
    memset(&server_pubkey, 0, sizeof(server_pubkey));

    if (!create_keypair(ctx, &client_keypair, &client_pubkey, client_seckey)) {
        printf("fail\n");
        printf("Failed to generate client keypair\n");
        return 0;
    }

    if (!create_keypair(ctx, &server_keypair, &server_pubkey, server_seckey)) {
        printf("fail\n");
        printf("Failed to generate server keypair\n");
        return 0;
    }

    printf("ok\n");

    printf("Generate the aggregated x-only public key ...\t");
    pubkeys_ptr[0] = &client_pubkey;
    pubkeys_ptr[1] = &server_pubkey;

    memset(&aggregate_xonly_pubkey, 0, sizeof(aggregate_xonly_pubkey));

    if (!secp256k1_musig_pubkey_agg(ctx, NULL, &aggregate_xonly_pubkey, &cache, pubkeys_ptr, 2)) {
        printf("fail\n");
        printf("Failed to generate aggregated x-only public key\n");
        return 0;
    }

    printf("ok\n");

    printf("Creating client and server nonces ...\t\t");

    memset(&client_secnonce, 0, sizeof(client_secnonce));
    memset(&client_pubnonce, 0, sizeof(client_pubnonce));

    memset(&server_secnonce, 0, sizeof(server_secnonce));
    memset(&server_pubnonce, 0, sizeof(server_pubnonce));  

    if (!create_nonces(ctx, &client_secnonce, &client_pubnonce,  client_seckey, &client_pubkey)) {
        printf("fail\n");
        printf("Failed to generate client nonce\n");
        return 0;
    }

    if (!create_nonces(ctx, &server_secnonce, &server_pubnonce,  server_seckey, &server_pubkey)) {
        printf("fail\n");
        printf("Failed to generate server nonce\n");
        return 0;
    }

    printf("ok\n");

    printf("Aggregating the public nonces ...\t\t");

    pubnonces[0] = &server_pubnonce;
    pubnonces[1] = &client_pubnonce;

    if (!secp256k1_musig_nonce_agg(ctx, &agg_pubnonce, pubnonces, 2)) {
        printf("fail\n");
        printf("Failed to aggregate public nonces\n");
        return 0;
    }

    printf("ok\n");

    printf("Generating random blinding factor ...\t\t");

    if (!fill_random(blinding_factor, sizeof(blinding_factor))) {
        printf("fail\n");
        printf("Failed to generate randomness\n");
        return 0;
    }

    printf("ok\n");

    printf("Creating session context ...\t\t\t");

    if (!secp256k1_blinded_musig_nonce_process(ctx, &session, &agg_pubnonce, msg, &cache, NULL, blinding_factor)) {
        printf("fail\n");
        printf("Failed to create session context\n");
        return 0;
    }  

    printf("ok\n");

    printf("Signing message ...\t\t\t\t");

    if (!secp256k1_musig_get_keyaggcoef_and_negation_seckey(ctx, keyaggcoef, &negate_seckey, &cache, &server_pubkey)) {
        printf("fail\n");
        printf("Failed to calculate server key aggregation coefficient\n");
        return 0;
    }

    if (!secp256k1_musig_partial_sign(ctx, &client_partial_sig, &client_secnonce, &client_keypair, &cache, &session)) {
        printf("fail\n");
        printf("Client failed to sign message\n");
        return 0;
    }

    if (!secp256k1_blinded_musig_partial_sign(ctx, &server_partial_sig, &server_secnonce, &server_keypair, &session, keyaggcoef, negate_seckey)) {
        printf("fail\n");
        printf("Server failed to sign message\n");
        return 0;
    }

    if (!secp256k1_musig_partial_sig_verify(ctx, &client_partial_sig, &client_pubnonce, &client_pubkey, &cache, &session)) {
        printf("fail\n");
        printf("Failed to verify client partial signature\n");
        return 0;
    }

    if (!secp256k1_musig_partial_sig_verify(ctx, &server_partial_sig, &server_pubnonce, &server_pubkey, &cache, &session)) {
        printf("fail\n");
        printf("Failed to verify server partial signature\n");
        return 0;
    }

    partial_sigs[0] = &client_partial_sig;
    partial_sigs[1] = &server_partial_sig;

    if (!secp256k1_musig_partial_sig_agg(ctx, sig, &session, partial_sigs, 2)) {
        printf("fail\n");
        printf("Failed to aggregate partial signatures\n");
        return 0;
    }

    printf("ok\n");

    printf("Verifying signature ...\t\t\t\t");

    if (!secp256k1_schnorrsig_verify(ctx, sig, msg, 32, &aggregate_xonly_pubkey)) {
        printf("fail\n");
        printf("Failed to verify signature\n");
        return 0;
    } else {
        printf("ok\n");
        return 1;
    }    
}

int main(void) {
    secp256k1_context* ctx;
    int result_verify = 1;

    ctx = secp256k1_context_create(SECP256K1_CONTEXT_NONE);

    result_verify = test_sign_verify(ctx);
    if (!result_verify) {
        printf("Execution failed\n");
        return 1;
    } else {
        printf("Execution succeeded\n");
    }
 
    secp256k1_context_destroy(ctx);
    return 0;
}
