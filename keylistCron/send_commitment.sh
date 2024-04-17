#!/bin/bash

# Fetch keylist JSON from the provided URL
KEYLIST_URL="https://api.mercurywallet.io/info/keylist"
KEYLIST_JSON=$(curl -sSL "$KEYLIST_URL")

# Check if the GET request was successful
if [[ $? -ne 0 ]]; then
  echo "Error: Failed to retrieve keylist JSON from $KEYLIST_URL"
  exit 1
fi

# Calculate SHA256 hash of the keylist JSON
KEYLIST_HASH=$(echo "$KEYLIST_JSON" | sha256sum | awk '{print $1}')

# Define mainstay slot URL
MAINSTAY_URL="https://testnet.mainstay.xyz/ctrl/sendcommitment"

# Attestation data
POSITION="3"
TOKEN="0972e199-6cf8-4164-8445-235528b6afa5"

# Construct the POST request body
PAYLOAD="{
  \"position\": \"$POSITION\",
  \"token\": \"$TOKEN\",
  \"commitment\": \"$KEYLIST_HASH\"
}"

# Send POST request to mainstay slot
curl --header "Content-Type: application/json" --request POST --data "$PAYLOAD" "$MAINSTAY_URL"

# Check if the POST request was successful
if [[ $? -ne 0 ]]; then
  echo "Error: Failed to send attestation data to $MAINSTAY_URL"
  exit 1
fi

echo "Keylist $KEYLIST_HASH attestation completed successfully!"
