use std::{fmt, io::Cursor};

use rocket::{Response, http::{ContentType}, Request, response};
use schemars::JsonSchema;
use serde::{Serialize, Deserialize};
use rocket::response::Responder;

/// DB error types
#[derive(Debug, Serialize, Deserialize, JsonSchema, Clone)]
pub enum DBErrorType {
    /// No identifier
    NoDataForID,
    /// No update made
    UpdateFailed,
    // Connection to db failed
    ConnectionFailed,
}
impl DBErrorType {
    fn as_str(&self) -> &'static str {
        match *self {
            DBErrorType::NoDataForID => "No data for identifier.",
            DBErrorType::UpdateFailed => "No update made.",
            DBErrorType::ConnectionFailed => "Connection failed.",
        }
    }
}

/// State Entity library specific errors
#[derive(Debug, Serialize, Deserialize, JsonSchema, Clone)]
pub enum SEError {
    /// Generic error from string error message
    Generic(String),
    /// Athorisation failed
    AuthError,
    /// Error in co-signing
    SigningError(String),
    /// DB error no ID found
    DBError(DBErrorType, String),
    /// DB error no data in column for ID
    // DBErrorWC(DBErrorType, String, Column),
    /// Inherit errors from Util
    SharedLibError(String),
    /// Inherit errors from Monotree
    SMTError(String),
    /// Swap error
    SwapError(String),
    /// Try again error
    TryAgain(String),
    /// Batch transfer timeout
    TransferBatchEnded(String),
    /// Lockbox error
    LockboxError(String),
    /// Rate limit error
    RateLimitError(String),
}

// impl Responder<'static> for SEError {
//     fn respond_to(self, _: &Request) -> ::std::result::Result<Response<'static>, Status> {
//         Response::build()
//             .header(ContentType::JSON)
//             .sized_body(Cursor::new(format!("{}", self)))
//             .ok()
//     }
// }

impl fmt::Display for SEError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match *self {
            SEError::Generic(ref e) => write!(f, "Error: {}", e),
            SEError::AuthError => write!(f, "Authentication Error: User authorisation failed"),
            SEError::DBError(ref e, ref id) => write!(f, "DB Error: {} (id: {})", e.as_str(), id),
            // SEError::DBErrorWC(ref e, ref id, ref col) => write!(
            //     f,
            //     "DB Error: {} (id: {} col: {})",
            //     e.as_str(),
            //     id,
            //     col.to_string()
            // ),
            SEError::SigningError(ref e) => write!(f, "Signing Error: {}", e),
            SEError::SharedLibError(ref e) => write!(f, "SharedLibError Error: {}", e),
            SEError::SMTError(ref e) => write!(f, "SMT Error: {}", e),
            SEError::SwapError(ref e) => write!(f, "Swap Error: {}", e),
            SEError::TryAgain(ref e) => write!(f, "Error: try again: {}", e),
            SEError::TransferBatchEnded(ref e) => write!(f, "Error: Transfer batch ended. {}", e),
            SEError::LockboxError(ref e) => write!(f, "Lockbox Error: {}", e),
            SEError::RateLimitError(ref e) => write!(f, "Error: Not available until {} due to rate limit", e),
        }
    }
}

impl<'r> Responder<'r, 'static> for SEError {
    fn respond_to(self, _: &'r Request<'_>) -> response::Result<'static> {
        let body = format!("{}", self);
        let cursor = Cursor::new(body.clone());

        Response::build()
            .header(ContentType::JSON)
            .sized_body(body.len(), cursor)
            .ok()
    }
}