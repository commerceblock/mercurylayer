mod endpoints;
mod server_config;
mod server;

#[macro_use] extern crate rocket;

use endpoints::utils;
use rocket::{serde::json::{Value, json}, Request};
use server::StateChainEntity;

#[catch(500)]
fn internal_error() -> Value {
    json!("Internal server error")
}

#[catch(400)]
fn bad_request() -> Value {
    json!("Bad request")
}

#[catch(404)]
fn not_found(req: &Request) -> Value {
    json!(format!("Not found! Unknown route '{}'.", req.uri()))
}

#[rocket::main]
async fn main() {

    server_config::ServerConfig::load();

    let statechain_entity = StateChainEntity::new().await;

    sqlx::migrate!("./migrations")
        .run(&statechain_entity.pool)
        .await
        .unwrap();

    let _ = rocket::build()
        .mount("/", routes![
            endpoints::deposit::post_deposit,
            endpoints::sign::sign_first,
            endpoints::sign::sign_second,
            endpoints::transfer_sender::transfer_sender,
            endpoints::transfer_sender::transfer_update_msg,
            endpoints::transfer_receiver::get_msg_addr,
            utils::info_config,
            utils::statechain_info,
        ])
        .register("/", catchers![
            not_found,
            internal_error, 
            bad_request,
        ])
        .manage(statechain_entity)
        // .attach(MercuryPgDatabase::fairing())
        .launch()
        .await;
}