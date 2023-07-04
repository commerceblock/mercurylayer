use diesel::{Insertable, PgConnection, RunQueryDsl};
use rand::Rng;
use serde::Deserialize;
use shared::structs::{DepositMsg1, UserID};
use uuid::Uuid;

use crate::{storage::db::MercuryPgDatabase, error, schema, server::StateChainEntity};

/// StateChain Deposit protocol trait
#[async_trait]
pub trait Deposit {
    /// API: Initiliase deposit protocol:
    ///     - Generate and return shared wallet ID
    ///     - Can do auth or other DoS mitigation here
    async fn deposit_init(&self, db: MercuryPgDatabase, deposit_msg1: DepositMsg1) -> Result<UserID, error::SEError>;
}

#[derive(Deserialize, Insertable, Clone)]
#[diesel(table_name = schema::usersession)]
struct NewUserSession {
    id: Uuid, 
    authentication: String,
    proofkey: String,
    challenge: String,
}

fn create_user_session(db: &mut PgConnection, new_user_session: &NewUserSession) {

    diesel::insert_into(schema::usersession::table)
        .values(new_user_session)
        .execute(db)
        .expect("Error saving new user session");
}

fn create_lockbox_item(db: &mut PgConnection, user_id: &Uuid) {

    #[derive(Deserialize, Insertable, Clone)]
    #[diesel(table_name = schema::lockbox)]
    struct NewLockboxItem {
        id: Uuid
    }

    let new_lockbox_item = NewLockboxItem { id: user_id.clone() };

    diesel::insert_into(schema::lockbox::table)
        .values(new_lockbox_item)
        .execute(db)
        .expect("Error saving new lockbox item");
}

fn create_challenge() -> String {
    let mut rng = rand::thread_rng();
    let challenge_bytes = rng.gen::<[u8; 16]>();
    // let challenge = hex::encode(challenge_bytes);
    hex::encode(challenge_bytes)
}

#[async_trait]
impl Deposit for StateChainEntity {
    async fn deposit_init(&self, db: MercuryPgDatabase, deposit_msg1: DepositMsg1) -> Result<UserID, error::SEError> {
        let user_id = Uuid::new_v4();

        let new_user_session = NewUserSession { 
            id: user_id.clone(),
            authentication: deposit_msg1.auth.to_string(),
            proofkey: deposit_msg1.proof_key.to_string(),
            challenge: create_challenge()
        };

        let challenge = new_user_session.challenge.clone();

        db.run(move |c| { create_user_session(c, &new_user_session) }).await;
        db.run(move |c| { create_lockbox_item(c, &user_id) }).await;

        Ok(UserID {id: user_id, challenge: Some(challenge)})
    }
}