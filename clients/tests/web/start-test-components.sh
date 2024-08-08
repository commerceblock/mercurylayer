#!/bin/bash

# Initialize variables to store process IDs
NODE_PID=""
DOCKER_PID=""

# Function to kill only our specific processes
cleanup() {
    echo "Stopping our processes..."
    [ ! -z "$NODE_PID" ] && kill $NODE_PID
    [ ! -z "$DOCKER_PID" ] && docker stop esplora-container >/dev/null 2>&1
    wait $NODE_PID 2>/dev/null
    echo "Our processes stopped."
    exit
}

# Set up trap to catch SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Run node server in the background and capture its PID
node server-regtest.cjs &
NODE_PID=$!

# Run docker command in the background without -it flags
docker run --name esplora-container -p 50002:50002 -p 8094:80 \
    --volume $PWD/data_bitcoin_regtest:/data \
    --env CORS_ALLOW='*' --rm \
    blockstream/esplora \
    /srv/explorer/run.sh bitcoin-regtest explorer &
DOCKER_PID=$!

# Wait for both processes to finish
wait $NODE_PID $DOCKER_PID
