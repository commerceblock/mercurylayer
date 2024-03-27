mod endpoints;
mod server_config;
mod server;

#[macro_use] extern crate rocket;

use rocket::{serde::json::{Value, json}, Request, Response};
use rocket::fairing::{Fairing, Info, Kind};
use rocket::http::Header;
use server::TokenServer;

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

    let token_server = TokenServer::new().await;

    let _ = rocket::build()
        .mount("/", routes![
            endpoints::token::token_init,
            endpoints::token::token_verify,
        ])
        .register("/", catchers![
            not_found,
            internal_error, 
            bad_request,
        ])
        .manage(token_server)
        .attach(Cors)
        // .attach(MercuryPgDatabase::fairing())
        .listen(8001)
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