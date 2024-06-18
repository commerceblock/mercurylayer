#!/bin/bash
set -e

# Create the required directory
mkdir -p /data/db/regtest

# Execute the main process
exec "$@"
