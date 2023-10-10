#include <stdio.h>
#include <assert.h>
#include <string.h>

#include <secp256k1.h>
#include <secp256k1_schnorrsig.h>
#include <secp256k1_musig.h>

#include "examples_util.h"

static void print_pubkey(
    const secp256k1_context* ctx, 
    const secp256k1_pubkey* pubkey,
    const char* name
) {
    unsigned char serialized_pubkey[33];
    size_t len = sizeof(serialized_pubkey);

    if (!secp256k1_ec_pubkey_serialize(ctx, serialized_pubkey, &len, pubkey, SECP256K1_EC_COMPRESSED)) {
        printf("Failed to serialize pubkey\n");
        return;
    }

    printf("%s", name);
    print_hex(serialized_pubkey, len);
    /* printf("\n"); */
}

static void print_xonly_pubkey(
    const secp256k1_context* ctx, 
    const secp256k1_xonly_pubkey* pubkey,
    const char* name
) {
    unsigned char serialized_pubkey[32];
    size_t len = sizeof(serialized_pubkey);

    if (!secp256k1_xonly_pubkey_serialize(ctx, serialized_pubkey, pubkey)) {
        printf("Failed to serialize pubkey\n");
        return;
    }

    printf("%s", name);
    print_hex(serialized_pubkey, len);
    /* printf("\n"); */
}

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

int test_sign_verify(
    secp256k1_context* ctx,

    const secp256k1_keypair *client_keypair,
    const unsigned char *client_seckey,
    const  secp256k1_pubkey *client_pubkey,

    const secp256k1_keypair *server_keypair,
    const  unsigned char *server_seckey,
    const secp256k1_pubkey *server_pubkey

) {
    /* Client data */
    secp256k1_musig_secnonce client_secnonce;
    secp256k1_musig_pubnonce client_pubnonce;

    secp256k1_musig_partial_sig client_partial_sig;

    /* Server data */
    secp256k1_musig_secnonce server_secnonce;
    secp256k1_musig_pubnonce server_pubnonce;

    secp256k1_musig_session server_session;

    secp256k1_musig_partial_sig server_partial_sig;

    /* Shared data */
    const secp256k1_pubkey *pubkeys_ptr[2];

    secp256k1_pubkey aggregate_pubkey;
    secp256k1_xonly_pubkey aggregate_xonly_pubkey;

    secp256k1_pubkey output_pubkey;

    unsigned char blinding_factor[32];

    unsigned char msg[32] = "9f86d081884c7d659a2feaa0c55ad015";

    const secp256k1_musig_pubnonce *pubnonces[2];

    secp256k1_musig_aggnonce agg_pubnonce;

    secp256k1_musig_session session;

    int negate_seckey = 0;

    const secp256k1_musig_partial_sig *partial_sigs[2];

    unsigned char sig[64];

    int parity_acc = 0;

    unsigned char tweak32[32] = "this could be a taproot tweak..";

    unsigned char out_tweak32[32];

    memset(out_tweak32, 0, sizeof(out_tweak32));

    printf("Generate the aggregated x-only public key ...\t");
    pubkeys_ptr[0] = client_pubkey;
    pubkeys_ptr[1] = server_pubkey;

    memset(&aggregate_pubkey, 0, sizeof(aggregate_pubkey));

    if (!secp256k1_ec_pubkey_combine(ctx, &aggregate_pubkey, pubkeys_ptr, 2)) {
        printf("fail\n");
        printf("Failed to generate aggregated public key\n");
        return 0;
    }

    memcpy(&output_pubkey, &aggregate_pubkey, sizeof(aggregate_pubkey));

    if (!secp256k1_xonly_pubkey_from_pubkey(ctx, &aggregate_xonly_pubkey, NULL, &aggregate_pubkey)) {
        printf("fail\n");
        printf("Failed to generate aggregated x-only public key\n");
        return 0;
    }

    /* print_pubkey(ctx, &aggregate_xonly_pubkey, "Agg Key 1: "); */

    printf("ok\n");

    printf("Creating client and server nonces ...\t\t");

    memset(&client_secnonce, 0, sizeof(client_secnonce));
    memset(&client_pubnonce, 0, sizeof(client_pubnonce));

    memset(&server_secnonce, 0, sizeof(server_secnonce));
    memset(&server_pubnonce, 0, sizeof(server_pubnonce));  

    if (!create_nonces(ctx, &client_secnonce, &client_pubnonce,  client_seckey, client_pubkey)) {
        printf("fail\n");
        printf("Failed to generate client nonce\n");
        return 0;
    }

    if (!create_nonces(ctx, &server_secnonce, &server_pubnonce,  server_seckey, server_pubkey)) {
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

    printf("Tweaking ...\t\t\t\t\t");

    if (!secp256k1_blinded_musig_pubkey_xonly_tweak_add(ctx, &output_pubkey, &parity_acc, &aggregate_pubkey, tweak32, out_tweak32)) {
        printf("fail\n");
        printf("Failed to tweak aggregate public key\n");
        return 0;
    }

    if (!secp256k1_xonly_pubkey_from_pubkey(ctx, &aggregate_xonly_pubkey, NULL, &output_pubkey)) {
        printf("fail\n");
        printf("Failed to generate aggregated x-only public key\n");
        return 0;
    }

    printf("ok\n");

    printf("Creating session context ...\t\t\t");

    if (!secp256k1_blinded_musig_nonce_process_without_keyaggcoeff(ctx, &session, &agg_pubnonce, msg, &output_pubkey, NULL, blinding_factor, out_tweak32)) {
        printf("fail\n");
        printf("Failed to create session context\n");
        return 0;
    }  

    printf("ok\n");

    printf("Signing message ...\t\t\t\t");

    memcpy(&server_session, &session, sizeof(session));

    if (!secp256k1_musig_negate_seckey(ctx, &output_pubkey, parity_acc, &negate_seckey)) {
        printf("fail\n");
        printf("Failed to calculate server key aggregation coefficient\n");
        return 0;
    }

    if (!secp256k1_blinded_musig_partial_sign_without_keyaggcoeff(ctx, &client_partial_sig, &client_secnonce, client_keypair, &session, negate_seckey)) {
        printf("fail\n");
        printf("Server failed to sign message\n");
        return 0;
    }

    if (!secp256k1_blinded_musig_remove_fin_nonce_from_session(ctx, &server_session)) {
        printf("fail\n");
        printf("Failed to remove final nonce from session\n");
        return 0;
    }

    if (!secp256k1_blinded_musig_partial_sign_without_keyaggcoeff(ctx, &server_partial_sig, &server_secnonce, server_keypair, &server_session, negate_seckey)) {
        printf("fail\n");
        printf("Server failed to sign message\n");
        return 0;
    }

    printf("ok\n");

    printf("Verifying partial signatures ...\t\t");

    if (!secp256k1_blinded_musig_partial_sig_verify(ctx, &client_partial_sig, &client_pubnonce, client_pubkey, &output_pubkey, &session, parity_acc)) {
        printf("fail\n");
        printf("Failed to verify client partial signature\n");
        return 0;
    }

    if (!secp256k1_blinded_musig_partial_sig_verify(ctx, &server_partial_sig, &server_pubnonce, server_pubkey, &output_pubkey, &session, parity_acc)) {
        printf("fail\n");
        printf("Failed to verify server partial signature\n");
        return 0;
    }

    printf("ok\n");

    printf("Aggregate partial signatures ...\t\t");

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

int test_key_update(
    secp256k1_context* ctx,

    const unsigned char *client_seckey,
    const  secp256k1_pubkey *client_pubkey,

    const  unsigned char *server_seckey,
    const secp256k1_pubkey *server_pubkey
) {
    secp256k1_keypair new_client_keypair;
    unsigned char new_client_seckey[32];
    secp256k1_pubkey new_client_pubkey;

    unsigned char x1[32];
    unsigned char t1[32];
    unsigned char t2[32];

    unsigned char new_server_seckey[32];
    secp256k1_pubkey new_server_pubkey;

    secp256k1_pubkey aggregate_pubkey;
    secp256k1_pubkey new_aggregate_pubkey;

    const secp256k1_pubkey *pubkeys_ptr[2];

    int return_val;

    pubkeys_ptr[0] = client_pubkey;
    pubkeys_ptr[1] = server_pubkey;

    if (!secp256k1_ec_pubkey_combine(ctx, &aggregate_pubkey, pubkeys_ptr, 2)) {
        printf("fail\n");
        printf("Failed to generate aggregated public key\n");
        return 0;
    }    

    while (1) {
        if (!fill_random(x1, sizeof(x1))) {
            printf("Failed to generate randomness\n");
            return 0;
        }
        break;
    }

    memcpy(t1, client_seckey, 32);
    /* sender: t1 = privkey + x1 */
    return_val = secp256k1_ec_seckey_tweak_add(ctx, t1, x1);
    assert(return_val);

    memset(&new_client_keypair, 0, sizeof(new_client_keypair));
    memset(&new_client_seckey, 0, sizeof(new_client_seckey));
    memset(&new_client_pubkey, 0, sizeof(new_client_pubkey));

    if (!create_keypair(ctx, &new_client_keypair, &new_client_pubkey, new_client_seckey)) {
        printf("fail\n");
        printf("Failed to generate client keypair\n");
        return 0;
    }

    /* t2 = t1 - privkey */
    memcpy(t2, new_client_seckey, sizeof(new_client_seckey));
    return_val = secp256k1_ec_seckey_negate(ctx, t2);
    assert(return_val);
    return_val = secp256k1_ec_seckey_tweak_add(ctx, t2, t1);
    assert(return_val);

    memcpy(new_server_seckey, server_seckey, 32);

    /* enclave_privkey = enclave_privkey + t2 - x1 */
    return_val = secp256k1_ec_seckey_tweak_add(ctx, new_server_seckey, t2);
    assert(return_val);
    return_val = secp256k1_ec_seckey_negate(ctx, x1);
    return_val = secp256k1_ec_seckey_tweak_add(ctx, new_server_seckey, x1);
    assert(return_val);

    return_val = secp256k1_ec_pubkey_create(ctx, &new_server_pubkey, new_server_seckey);
    assert(return_val);

    pubkeys_ptr[0] = &new_client_pubkey;
    pubkeys_ptr[1] = &new_server_pubkey;

    if (!secp256k1_ec_pubkey_combine(ctx, &new_aggregate_pubkey, pubkeys_ptr, 2)) {
        printf("fail\n");
        printf("Failed to generate aggregated public key\n");
        return 0;
    }

    print_pubkey(ctx, &aggregate_pubkey, "Old Agg Key: ");
    print_pubkey(ctx, &new_aggregate_pubkey, "New Agg Key: ");
    
    return_val = memcmp(&aggregate_pubkey, &new_aggregate_pubkey, sizeof(aggregate_pubkey));
    assert(return_val == 0);

    return 1;
}

int main(void) {
    secp256k1_context* ctx;
    int result_verify;
    
    secp256k1_keypair client_keypair;
    unsigned char client_seckey[32];
    secp256k1_pubkey client_pubkey;

    secp256k1_keypair server_keypair;
    unsigned char server_seckey[32];
    secp256k1_pubkey server_pubkey;

    ctx = secp256k1_context_create(SECP256K1_CONTEXT_NONE);

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
        return 1;
    }

    if (!create_keypair(ctx, &server_keypair, &server_pubkey, server_seckey)) {
        printf("fail\n");
        printf("Failed to generate server keypair\n");
        return 1;
    }

    printf("ok\n");

    result_verify = test_sign_verify(ctx,
        &client_keypair, client_seckey, &client_pubkey,
        &server_keypair, server_seckey, &server_pubkey
    );
    if (!result_verify) {
        printf("Signature failed\n");
        return 1;
    } else {
        printf("Signature succeeded\n");
    }

    result_verify = test_key_update(ctx, client_seckey, &client_pubkey, server_seckey, &server_pubkey);

    if (!result_verify) {
        printf("Key Update failed\n");
        return 1;
    } else {
        printf("Key Update succeeded\n");
    }

    secp256k1_context_destroy(ctx);
    return 0;
}