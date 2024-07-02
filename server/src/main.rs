mod endpoints;
mod server_config;
mod server;
mod database;

#[macro_use] extern crate rocket;

use endpoints::utils;
use rocket::{serde::json::{Value, json}, Request, Response};
use rocket::fairing::{Fairing, Info, Kind};
use rocket::http::Header;
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
            endpoints::deposit::get_token,
            endpoints::deposit::token_init,
            endpoints::sign::sign_first,
            endpoints::sign::sign_second,
            endpoints::lightning_latch::paymenthash,
            endpoints::transfer_sender::transfer_sender,
            endpoints::transfer_sender::transfer_update_msg,
            endpoints::transfer_receiver::get_msg_addr,
            endpoints::transfer_receiver::statechain_info,
            endpoints::transfer_receiver::transfer_unlock,
            endpoints::transfer_receiver::transfer_receiver,
            endpoints::withdraw::withdraw_complete,
            utils::info_config,
            utils::info_keylist,
            all_options,
        ])
        .register("/", catchers![
            not_found,
            internal_error, 
            bad_request,
        ])
        .manage(statechain_entity)
        .attach(Cors)
        // .attach(MercuryPgDatabase::fairing())
        .launch()
        .await;
}


/// Catches all OPTION requests in order to get the CORS related Fairing triggered.
#[options("/<_..>")]
fn all_options() {
    /* Intentionally left empty */
}

pub struct Cors;

#[rocket::async_trait]
impl Fairing for Cors {
    fn info(&self) -> Info {
        Info {
            name: "Cross-Origin-Resource-Sharing Fairing",
            kind: Kind::Response,
        }
    }

    async fn on_response<'r>(&self, _request: &'r Request<'_>, response: &mut Response<'r>) {
        response.set_header(Header::new("Access-Control-Allow-Origin", "*"));
        response.set_header(Header::new(
            "Access-Control-Allow-Methods",
            "POST, PATCH, PUT, DELETE, HEAD, OPTIONS, GET",
        ));
        response.set_header(Header::new("Access-Control-Allow-Headers", "*"));
        response.set_header(Header::new("Access-Control-Allow-Credentials", "true"));
    }
}
