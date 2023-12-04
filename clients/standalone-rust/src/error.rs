use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum CError {
    /// Generic error from string error message
    Generic(String)
}