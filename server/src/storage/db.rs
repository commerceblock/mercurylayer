use diesel::PgConnection;
use rocket_sync_db_pools::database;

#[database("mercury_pg_db")]
pub struct MercuryPgDatabase(PgConnection);