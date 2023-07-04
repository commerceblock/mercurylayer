#[macro_use] extern crate rocket;

mod schema;
mod config;
mod server;
mod storage;
mod protocol;
mod error;
mod endpoints;

use rocket::{serde::json::{Value, json}, get, catch};
use server::StateChainEntity;
use storage::db::MercuryPgDatabase;

#[get("/")]
fn hello() -> &'static str {
    "Hello, world!\n"
}

#[catch(404)]
fn not_found() -> Value {
    json!("Not found!")
}

#[rocket::main]
async fn main() {
    let sc_entity = StateChainEntity::load();

    let _ = rocket::build()
        .mount("/", routes![
            hello,
            endpoints::deposit::deposit_init,
            endpoints::util::get_fees
        ])
        .register("/", catchers![
            not_found
        ])
        .attach(MercuryPgDatabase::fairing())
        .manage(sc_entity)
        .launch()
        .await;
}