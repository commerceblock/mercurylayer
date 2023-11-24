#include "remote-attestation.h"

#include <iostream>
#include <limits.h>

#include "Enclave_u.h"

// Needed to call untrusted key exchange library APIs, i.e. sgx_ra_proc_msg2.
// #include "sgx_ukey_exchange.h"

// Needed to create enclave and do ecall.
#include "sgx_urts.h"

// Needed to query extended epid group id.
#include "sgx_uae_epid.h"
#include "sgx_uae_quote_ex.h"

#ifndef SAFE_FREE
#define SAFE_FREE(ptr) {if (NULL != (ptr)) {free(ptr); (ptr) = NULL;}}
#endif

// Some utility functions to output some of the data structures passed between
// the ISV app and the remote attestation service provider.
void PRINT_BYTE_ARRAY(FILE *file, void *mem, uint32_t len)
{
    if(!mem || !len)
    {
        fprintf(file, "\n( null )\n");
        return;
    }
    uint8_t *array = (uint8_t *)mem;
    fprintf(file, "%u bytes:\n{\n", len);
    uint32_t i = 0;
    for(i = 0; i < len - 1; i++)
    {
        fprintf(file, "0x%x, ", array[i]);
        if(i % 8 == 7) fprintf(file, "\n");
    }
    fprintf(file, "0x%x ", array[i]);
    fprintf(file, "\n}\n");
}

/* Enum for all possible message types between the ISV app and
 * the ISV SP. Requests and responses in the remote attestation
 * sample.
 */
typedef enum _ra_msg_type_t
{
     TYPE_RA_MSG0,
     TYPE_RA_MSG1,
     TYPE_RA_MSG2,
     TYPE_RA_MSG3,
     TYPE_RA_ATT_RESULT,
}ra_msg_type_t;

typedef struct _ra_samp_request_header_t{
    uint8_t  type;     /* set to one of ra_msg_type_t*/
    uint32_t size;     /*size of request body*/
    uint8_t  align[3];
    uint8_t body[];
}ra_samp_request_header_t;

int ExecuteRemoteAttestation() {
    std::cout << "Execute" << std::endl;

    ra_samp_request_header_t *p_msg0_full = NULL;

    sgx_ra_context_t context = INT_MAX;
    sgx_enclave_id_t enclave_id = 0;
    sgx_status_t status = SGX_SUCCESS;
    FILE* OUTPUT = stdout;

    int ret = 0;

    uint32_t extended_epid_group_id = 0;
    ret = sgx_get_extended_epid_group_id(&extended_epid_group_id);
    if (SGX_SUCCESS != ret)
    {
        ret = -1;
        fprintf(OUTPUT, "\nError, call sgx_get_extended_epid_group_id fail [%s].",
            __FUNCTION__);
        return ret;
    }
    fprintf(OUTPUT, "\nCall sgx_get_extended_epid_group_id success.");

    p_msg0_full = (ra_samp_request_header_t*) malloc(sizeof(ra_samp_request_header_t) + sizeof(uint32_t));
    if (NULL == p_msg0_full)
    {
        ret = -1;
        goto CLEANUP;
    }
    p_msg0_full->type = TYPE_RA_MSG0;
    p_msg0_full->size = sizeof(uint32_t);

    *(uint32_t*)((uint8_t*)p_msg0_full + sizeof(ra_samp_request_header_t)) = extended_epid_group_id;
    {

        fprintf(OUTPUT, "\nMSG0 body generated -\n");

        PRINT_BYTE_ARRAY(OUTPUT, p_msg0_full->body, p_msg0_full->size);

    }
    // The ISV application sends msg0 to the SP.
    // The ISV decides whether to support this extended epid group id.
    fprintf(OUTPUT, "\nSending msg0 to remote attestation service provider.\n");


    CLEANUP:
        // Clean-up
        // Need to close the RA key state.
        if(INT_MAX != context)
        {
            int ret_save = ret;
            ret = enclave_ra_close(enclave_id, &status, context);
            if(SGX_SUCCESS != ret || status)
            {
                ret = -1;
                fprintf(OUTPUT, "\nError, call enclave_ra_close fail [%s].",
                        __FUNCTION__);
            }
            else
            {
                // enclave_ra_close was successful, let's restore the value that
                // led us to this point in the code.
                ret = ret_save;
            }
            fprintf(OUTPUT, "\nCall enclave_ra_close success.");
        }

        sgx_destroy_enclave(enclave_id);

        SAFE_FREE(p_msg0_full);

    return ret;
}