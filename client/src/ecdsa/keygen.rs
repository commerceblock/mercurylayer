use curv::{elliptic::curves::{Scalar, Secp256k1}, BigInt};
use kms::ecdsa::two_party::MasterKey2;
use shared::structs::{Protocol, KeyGenReply1, KeyGenMsg1, KeyGenMsg2, KeyGenReply2};
use uuid::Uuid;
use zk_paillier::zkproofs::SALT_STRING;

use crate::{utils::{client_shim::ClientShim, error::CError, requests}, wallet::shared_key::SharedKey};

const KG_PATH_PRE: &str = "ecdsa/keygen";

pub fn get_master_key_repeat_keygen(
    shared_key_id: &Uuid,
    client_shim: &ClientShim,
    secret_key: &Scalar<Secp256k1>,
    value: &u64,
    protocol: Protocol,
    solution: String,
    kg_reps: u32
) -> Result<SharedKey, CError> {

    let mut key_gen_reply_1: KeyGenReply1;
    let mut master_key: MasterKey2;
    let mut n_reps = 0;

    loop {
        println!("HERE 1");
        key_gen_reply_1 = requests::postb(
            client_shim,
            &format!("{}/first", KG_PATH_PRE),
            KeyGenMsg1 {
                shared_key_id: *shared_key_id,
                protocol, 
                solution: Some(solution.clone())
            },
        )?;

        let (kg_party_two_first_message, kg_ec_key_pair_party2) =
            MasterKey2::key_gen_first_message_predefined(secret_key);

        let key_gen_msg2 = KeyGenMsg2 {
            shared_key_id: *shared_key_id,
            dlog_proof: kg_party_two_first_message.d_log_proof,
        };

        println!("HERE 2");
        let kg_party_one_second_message: KeyGenReply2 = requests::postb(
            client_shim,
            &format!("{}/second", KG_PATH_PRE),
            key_gen_msg2,
        )?;
        println!("HERE 3");

        let (_, party_two_paillier) = MasterKey2::key_gen_second_message(
            &key_gen_reply_1.msg,
            &kg_party_one_second_message.msg,
            SALT_STRING
        )?;

        master_key = MasterKey2::set_master_key(
            &BigInt::from(0),
            &kg_ec_key_pair_party2,
            &kg_party_one_second_message.msg
                .ecdh_second_message
                .comm_witness
                .public_share,
            &party_two_paillier,
        );

        n_reps = n_reps + 1;
        if n_reps > kg_reps {
            break;
        }        
    }

    Ok(SharedKey {
        id: key_gen_reply_1.user_id,
        share: master_key,
        value: value.to_owned(),
        statechain_id: None,
        tx_backup_psm: None,
        proof_key: None,
        // smt_proof: None,
        unspent: true,
        funding_txid: String::default(),
        previous_txs: vec![],
    })

}