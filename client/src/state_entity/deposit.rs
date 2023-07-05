use bitcoin::{PublicKey, network};
use curv::elliptic::curves::ECPoint;
use sha3::Sha3_256;
use digest::Digest;

use crate::{wallet::wallet::Wallet, utils::{error::{CError, WalletErrorType}, helpers::{FEE, to_bitcoin_public_key, tx_funding_build}}};

use super::api::{get_statechain_fee_info, session_init};

/// Deposit coins into state entity. Returns shared_key_id, statechain_id, funding txid,
/// signed backup tx, back up transacion data and proof_key
pub fn deposit(
    wallet: &mut Wallet,
    amount: &u64,
) -> Result<(), CError> {
    // Get state entity fee info
    let se_fee_info = get_statechain_fee_info(&wallet.client_shim)?;

    // Ensure funds cover fees before initiating protocol
    if FEE + se_fee_info.deposit as u64 >= *amount {
        return Err(CError::WalletError(WalletErrorType::NotEnoughFunds));
    }

    //calculate SE fee amount from rate
    let deposit_fee = (amount * se_fee_info.deposit as u64) / 10000 as u64;
    let withdraw_fee = (amount * se_fee_info.withdraw as u64) / 10000 as u64;

    // Greedy coin selection.
    let (inputs, addrs, amounts) =
        wallet.coin_selection_greedy(&(amount + deposit_fee + FEE))?;

    // Generate proof key
    let proof_key = wallet.se_proof_keys.get_new_key()?;

    // Init. session - Receive shared wallet ID
    let shared_key_id = session_init(&wallet.client_shim, &proof_key.to_string())?;

    println!("shared_key_id: {:?}", shared_key_id);

    // generate solution for the PoW challenge
    let challenge = match shared_key_id.challenge {
        Some(c) => c,
        None => return Err(CError::Generic(String::from("missing pow challenge from server"))),
    };

    let difficulty = 4 as usize;
    let mut counter = 0;
    let zeros = String::from_utf8(vec![b'0'; difficulty]).unwrap();
    
    let mut hasher = Sha3_256::new();

    loop {
        // write input message
        hasher.update(&format!("{}:{:x}", challenge, counter).as_bytes());
        // read hash digest
        let result = hasher.finalize_reset();
        // convert hash result to hex string
        let result_str = hex::encode(result);
        // check if result has enough leading zeros
        if result_str[..difficulty] == zeros {
            break;
        };
        // increment counter and try again
        counter += 1

    }

    let solution = format!("{:x}", counter);

    println!("solution: {}", solution);

/*
    // 2P-ECDSA with state entity to create a Shared key
    let shared_key = wallet.gen_shared_key(&shared_key_id.id, amount, solution)?;

    // Create funding tx

    let pk = shared_key.share.public.q.clone().into_raw().underlying_ref().to_owned().unwrap(); // co-owned key address to send funds to (P_addr)
    let p_addr = bitcoin::Address::p2wpkh(&to_bitcoin_public_key(pk), wallet.get_bitcoin_network())?;
    let change_addr = wallet.keys.get_new_address()?.0.to_string();
    let change_amount = amounts.iter().sum::<u64>() - amount - deposit_fee - FEE;

    let tx_0 = tx_funding_build(
        &inputs,
        &p_addr.to_string(),
        amount,
        &deposit_fee,
        &se_fee_info.address,
        &change_addr,
        &change_amount,
        wallet.get_bitcoin_network(),
    )?;

    let tx_funding_signed = wallet.sign_tx(
        &tx_0,
        &(0..inputs.len()).collect(), // inputs to sign are all inputs is this case
        &addrs,
    );

    //get initial locktime
    let chaintip_height = wallet.get_tip_header()?;
    println!("Deposit: Got current best block height: {}", chaintip_height);
    let init_locktime: u32 = (chaintip_height as u32) + (se_fee_info.initlock as u32);
    println!("Deposit: Set initial locktime: {}", init_locktime.to_string());
*/

    Ok(())
}