# Mercury Enclave Server

Key share management in SGX secure enclaves. This system is designed to interact with the mercury server to provide a secure computation and storage system for generating and using shared keys for the mercury layer system. Key secrets are generated in a secure SGX enclave. The SGX-encrypted (secret) and plain (public) parts of the key share proofs are then returned to the non-secure CPU. Once generated, the SGX-encrypted secrets and public proofs are stored in a key-value store database. The secrets/proofs can later be transferred back into the enclave when needed to perform signing operations for statechain transfers.

## Intel SGX Drivers and SDK Installation

To install and setup Intel SGX drivers and SDK, follow the steps described in [Intel SGX for Linux repository](https://github.com/intel/linux-sgx).

# Prerequisite

This project requires gcc/g++ version 11.4.0 or higher.

## Build and run this application

Build and run this application as follows.

```bash
# Install libpqxx-dev 7.8.1 (C++ client API for PostgreSQ)
# Remove any other version of libpqxx-dev from the operating system if necessary
$ sudo apt remove libpqxx-dev
# It may be necessary to install `libpq-dev` first.
$ sudo apt-get install libpq-dev
# Clone libpqxx project
$ git clone https://github.com/jtv/libpqxx.git
# Change to 7.8.1 version
$ cd libpqxx && git checkout 7.8.1
# Build it
$ cd cmake && cmake .. && cmake --build .
# Install it
$ sudo cmake --install .

# Install CPR 1.10.5
# libcurl4-openssl-dev is a dependency
$ sudo apt install -y libcurl4-openssl-dev
$ git clone https://github.com/libcpr/cpr.git
# Change to 1.10.5 version
$ cd cpr && git checkout 1.10.5
$ mkdir build && cd build
$ cmake .. -DCPR_USE_SYSTEM_CURL=ON
$ cmake --build .
$ sudo cmake --install .
# creates the necessary links and cache to the most recent shared libraries 
# found in the directories specified on the command line
$ sudo ldconfig 

# Install https://github.com/ssantos21/bc-crypto-base
$ git clone https://github.com/ssantos21/bc-crypto-base
$ cd bc-crypto-base
$ ./configure 
$ make check
$ sudo make install

# Install https://github.com/ssantos21/bc-shamir
$ git clone https://github.com/ssantos21/bc-shamir
$ cd bc-shamir
$ ./configure 
$ make check
$ sudo make install

# Install https://github.com/ssantos21/bc-bip39
$ sudo apt-get install make clang
$ git clone https://github.com/ssantos21/bc-bip39
$ cd bc-bip39
$ export CC="clang-14" && ./configure
$ make check
$ sudo make install

# clone this repo
$ git clone https://github.com/commerceblock/mercurylayer
$ git checkout -b dev origin/dev
$ cd mercurylayer/enclave
# build application (SIM for simulator mode or HW for hardware mode)
$ make SGX_MODE=SIM INCLUDE_SECP256K1_ZKP=1
# run application
$ ./app
```

## More MAKE commands

After the initial build, the main project can be built without `INCLUDE_SECP256K1_ZKP=1`.
```
$ make SGX_MODE=SIM
```

To clean the project (`INCLUDE_SECP256K1_ZKP=1` can also be ommited so only the main project is cleaned).
```
$ make clean INCLUDE_SECP256K1_ZKP=1
```

This is a work in progress. Several changes to the project are expected.
