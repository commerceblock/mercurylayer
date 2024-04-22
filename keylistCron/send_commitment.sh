#!/bin/bash

# Fetch keylist JSON from the provided URL
KEYLIST_URL="http://45.77.225.72:32450/info/keylist"
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

# Connect to the database and save the keylist JSON
PG_COMMAND="psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -c \"INSERT INTO keylist (json_data) VALUES ('$KEYLIST_JSON');\""

# Execute the PostgreSQL command
eval "$PG_COMMAND"

# Check if the command was successful
if [[ $? -ne 0 ]]; then
  echo "Error: Failed to save keylist JSON to the database"
  exit 1
fi

echo "Keylist JSON saved to the database successfully!"
