use std::fmt;

use bitcoin::{Transaction, TxIn, TxOut, absolute::LockTime, secp256k1};
use curv::{BigInt, arithmetic::One, cryptographic_primitives::proofs::sigma_dlog::DLogProof};
use kms::ecdsa::two_party::party1;
use multi_party_ecdsa::protocols::two_party_ecdsa::lindell_2017::party_one;
use schemars::JsonSchema;
use secp256k1::PublicKey;
use serde::{Serialize, Deserialize};
use sha2::Sha256;
use uuid::Uuid;

use super::util::transaction_serialise;

/// Statechain entity operating information
/// This struct is returned containing information on operating requirements
/// of the statechain entity which must be conformed with in the protocol.
#[derive(Serialize, Deserialize, JsonSchema, Debug)]
#[schemars(example = "Self::example")]
pub struct StateEntityFeeInfoAPI {
    /// The Bitcoin address that the SE fee must be paid to
    pub address: String, // Receive address for fee payments
    /// The deposit fee, which is specified as a proportion of the deposit amount in basis points
    pub deposit: i64,    // basis points
    /// The withdrawal fee, which is specified as a proportion of the deposit amount in basis points
    pub withdraw: u64,   // basis points
    /// The decementing nLocktime (block height) interval enforced for backup transactions
    pub interval: u32,   // locktime decrement interval in blocks
    /// The initial nLocktime from the current blockheight for the first backup
    pub initlock: u32,   // inital backup locktime
    /// The minumum wallet version required
    pub wallet_version: String,
    /// Message to display to all wallet users on startup
    pub wallet_message: String,
}

impl StateEntityFeeInfoAPI{
    pub fn example() -> Self{
        Self{
            address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq".to_string(),
            deposit: 0,
            withdraw: 300,
            interval: 144,
            initlock: 14400,
            wallet_version: "0.4.65".to_string(),
            wallet_message: "Warning".to_string(),
        }
    }
}

impl fmt::Display for StateEntityFeeInfoAPI {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "Fee address: {},\nDeposit fee rate: {}\nWithdrawal fee rate: {}\nLock interval: {}\nInitial lock: {}",
            self.address, self.deposit, self.withdraw, self.interval, self.initlock
        )
    }
}

// schema struct for Uuid
#[derive(JsonSchema)]
#[schemars(remote = "Uuid")]
pub struct UuidDef(String);

#[derive(Serialize, Deserialize, JsonSchema, Debug, Clone, PartialEq, Default)]
pub struct UserID {
    #[schemars(with = "UuidDef")]
    pub id: Uuid,
    pub challenge: Option<String>,
}


#[derive(Serialize, Deserialize, JsonSchema, Debug)]
pub struct DepositMsg1 {
    pub auth: String,
    pub proof_key: String,
}

/// State Entity protocols
#[derive(Serialize, Deserialize, JsonSchema, Debug, Clone, Copy, PartialEq)]
pub enum Protocol {
    Deposit,
    Transfer,
    Withdraw,
}
#[derive(JsonSchema)]
#[schemars(remote = "PK")]
pub struct PKDef(Vec<u8>);

#[derive(Serialize, Deserialize, JsonSchema, Debug, Clone, PartialEq)]
pub struct PrepareSignTxMsg {
    /// The shared key ID
    #[schemars(with = "UuidDef")]
    pub shared_key_ids: Vec<Uuid>,
    /// Purpose: "TRANSFER", "TRANSFER-BATCH" or "WITHDRAW"
    pub protocol: Protocol,
    /// Hex encoding of the unsigned transaction
    pub tx_hex: String,
    /// Vector of the transaction input public keys
    #[schemars(with = "PKDef")]
    pub input_addrs: Vec<PublicKey>, // pub keys being spent from
    /// Vector of input amounts
    pub input_amounts: Vec<u64>,
    /// Proof public key
    pub proof_key: Option<String>,
}

impl Default for PrepareSignTxMsg {
    fn default() -> Self {
        let default_tx = Transaction {
            version: i32::default(),
            lock_time: LockTime::ZERO,
            input: Vec::<TxIn>::default(),
            output: Vec::<TxOut>::default(),
        };

        Self {
            shared_key_ids: Vec::<Uuid>::default(),
            protocol: Protocol::Transfer,

        tx_hex: transaction_serialise(&default_tx),
            input_addrs: Vec::<PublicKey>::default(),
            input_amounts: Vec::<u64>::default(),
            proof_key: None,
        }
    }
}

impl PrepareSignTxMsg {
    pub fn example() -> Self{
        Self{
            shared_key_ids: vec![Uuid::new_v4()],
            protocol: Protocol::Deposit,
            tx_hex: "02000000011333183ddf384da83ed49296136c70d206ad2b19331bf25d390e69b222165e370000000000feffffff0200e1f5050000000017a914a860f76561c85551594c18eecceffaee8c4822d787F0C1A4350000000017a914d8b6fcc85a383261df05423ddf068a8987bf0287878c000000".to_string(),
            input_addrs: Vec::<PublicKey>::default(),
            input_amounts: vec![100000],
            proof_key: Some("02a95498bdde2c8c4078f01840b3bc8f4ae5bb1a90b880a621f50ce221bce3ddbe".to_string()),
        }
    }
}

#[derive(Serialize, Deserialize, JsonSchema, Debug)]
pub struct KeyGenMsg1 {
    #[schemars(with = "UuidDef")]
    pub shared_key_id: Uuid,
    pub protocol: Protocol,
    pub solution: Option<String>,
}

#[derive(JsonSchema)]
#[schemars(remote = "party_one::KeyGenFirstMsg")]
pub struct KeyGenFirstMsgDef(String);

#[derive(Serialize, Deserialize, JsonSchema, Debug, Clone)]
#[schemars(example = "Self::example")]
pub struct KeyGenReply1 {
    #[schemars(with = "UuidDef")]
    pub user_id: Uuid,
    #[schemars(with = "KeyGenFirstMsgDef")]
    pub msg: party_one::KeyGenFirstMsg,
}

impl KeyGenReply1 {
    pub fn example() -> Self {
        Self{
            user_id: Uuid::default(),
            msg: party_one::KeyGenFirstMsg{
                    pk_commitment: BigInt::one(),
                    zk_pok_commitment: BigInt::one(),
                }
        }
    }
}

// schema information structs for openAPI/swagger
#[derive(JsonSchema)]
#[schemars(remote = "DLogProof")]
pub struct DLogProofDef(String);

#[derive(Serialize, Deserialize, JsonSchema, Debug)]
pub struct KeyGenMsg2 {
    #[schemars(with = "UuidDef")]
    pub shared_key_id: Uuid,
    #[schemars(with = "DLogProofDef")]
    pub dlog_proof: DLogProof<curv::elliptic::curves::Secp256k1, Sha256>,
}

#[derive(JsonSchema)]
#[schemars(remote = "party1::KeyGenParty1Message2")]
pub struct KeyGenParty1Message2Def(String);

#[derive(Serialize, Deserialize, JsonSchema, Debug)]
pub struct KeyGenReply2 {
    #[schemars(with = "KeyGenParty1Message2Def")]
    pub msg: party1::KeyGenParty1Message2,
}
