# Mercury Layer

Mercury Layer is a Layer 2 protocol for Bitcoin that enables the self-custodial transfer of coins (UTXOs) without on-chain transactions. 

This repository contains the server, client and enclave implementations. The *enclave* is a trusted platform app utilising Intel SGX that stores key shares, performs partial signatures and ensures sercure key share deletion. The enclave is connected to the server which exposes a public RESTful HTTP API, and connects to a Postgres database. The client is run by the user (as a stand alone app or a WASM component) that makes HTTP requests to the server API.  

graph LR;
    Server-->Client;
    Enclave-->Server

# License

Mercury Layer is released under the terms of the GNU General Public License. See for more information https://opensource.org/licenses/GPL-3.0
