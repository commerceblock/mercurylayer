// @generated automatically by Diesel CLI.

diesel::table! {
    lockbox (id) {
        id -> Uuid,
        lock_box -> Nullable<Int8>,
    }
}

diesel::table! {
    usersession (id) {
        id -> Uuid,
        statechainid -> Nullable<Uuid>,
        authentication -> Nullable<Varchar>,
        s2 -> Nullable<Varchar>,
        s1pubkey -> Nullable<Varchar>,
        sighash -> Nullable<Varchar>,
        withdrawscsig -> Nullable<Varchar>,
        txwithdraw -> Nullable<Varchar>,
        proofkey -> Nullable<Varchar>,
        txbackup -> Nullable<Varchar>,
        masterpublic -> Nullable<Varchar>,
        sharedpublic -> Nullable<Varchar>,
        challenge -> Nullable<Varchar>,
    }
}

diesel::allow_tables_to_appear_in_same_query!(
    lockbox,
    usersession,
);
