#[derive(Debug, Clone)]
pub struct ClientShim {
    pub client: reqwest::blocking::Client,
    pub endpoint: String,
}

impl ClientShim {
    pub fn new(endpoint: &str) -> Self {
        ClientShim {
            client: reqwest::blocking::Client::new(),
            endpoint: endpoint.to_string(),
        }
    }
}