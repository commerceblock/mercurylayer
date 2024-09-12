# Mercury Layer Token Server

Mercury layer token server is a RESTful HTTP service exposing an API for the creation and validation of mercury layer access tokens. The server connects to the main mercury layer database to create and update `token_id` entries and verify payments with the external payment processor. 

# Running

1. Set the Postgres `db_user`, `db_password`, `db_host`, `db_port` and `db_name` properties in `Setting.toml`.
2. Set the payment processor URL and API key in `Setting.toml`.
3. `cargo run`
