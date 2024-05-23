# Use a base image that has the required GLIBC version
FROM debian:bullseye-slim as builder

# Install Rust, protobuf compiler, and library dependencies
RUN apt-get update && apt-get install -y curl build-essential protobuf-compiler libprotobuf-dev pkg-config libssl-dev
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Set the environment path for Rust
ENV PATH="/root/.cargo/bin:${PATH}"

# Create a working directory
WORKDIR /mercurylayer

RUN echo "[workspace]\nmembers = [\"server\", \"lib\"]" > ./Cargo.toml
COPY ./Cargo.lock ./Cargo.lock

# Copy the server source code
COPY ./server ./server
COPY ./lib ./lib

# Make sure to copy Cargo.lock
COPY ./server/Cargo.lock ./server/Cargo.lock

WORKDIR /mercurylayer/server

# RUN cargo build --verbose

# # Build your Rust project. Since the source files are now present,
# # the Rust compiler should be able to find and compile them.
RUN CARGO_TARGET_DIR=target  cargo build --release

# # Command to run the server by default when the container starts
CMD ["cargo", "run", "--bin", "mercury-server"]
