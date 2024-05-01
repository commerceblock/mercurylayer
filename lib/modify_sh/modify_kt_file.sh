#!/bin/bash

# Directory where the files are located
SEARCH_DIR="out-kotlin/com/mercurylayer"

# File pattern to search for (e.g., all Kotlin files)
FILE_PATTERN="*.kt"

# The text to find for adding @Serializable
FIND_TEXT_SERVER_CONFIG="data class ServerConfig("
FIND_TEXT_WALLET="data class Wallet("
FIND_TEXT_TOKEN="data class Token("
FIND_TEXT_ACTIVITY="data class Activity("
FIND_TEXT_COIN="data class Coin("
FIND_TEXT_SETTINGS="data class Settings("
FIND_TEXT_DEPOSIT_MSG1="data class DepositMsg1("
FIND_TEXT_DEPOSIT_MSG1_RESPONSE="data class DepositMsg1Response("
FIND_TEXT_DEPOSIT_INIT_RESULT="data class DepositInitResult("
FIND_TEXT_AGGREGATED_PUBLIC_KEY="data class AggregatedPublicKey("
FIND_TEXT_SIGN_FIRST_REQUEST_PAYLOAD="data class SignFirstRequestPayload("
FIND_TEXT_SIGN_FIRST_RESPONSE_PAYLOAD="data class SignFirstResponsePayload("
FIND_TEXT_PARTIAL_SIGNATURE_REQUEST_PAYLOAD="data class PartialSignatureRequestPayload("
FIND_TEXT_PARTIAL_SIGNATURE_RESPONSE_PAYLOAD="data class PartialSignatureResponsePayload("
FIND_TEXT_BACKUP_TX="data class BackupTx("
FIND_TEXT_TRANSFER_SENDER_REQUEST_PAYLOAD="data class TransferSenderRequestPayload("
FIND_TEXT_TRANSFER_SENDER_RESPONSE_PAYLOAD="data class TransferSenderResponsePayload("
FIND_TEXT_TRANSFER_UPDATE_MSG_REQUEST_PAYLOAD="data class TransferUpdateMsgRequestPayload("

# The text to add @Serializable
ADD_TEXT="@Serializable"

# Text to find for modifying imports
IMPORT_FIND_TEXT="import com.sun.jna.ptr.*"

# New import text to add
IMPORT_ADD_SERIALIZABLE="import kotlinx.serialization.Serializable"
IMPORT_ADD_SERIALNAME="import kotlinx.serialization.SerialName"

# Import text to remove. This should be disabled when the folder struct is fixed
PACKAGE_REMOVE_TEXT="package com.mercurylayer"

# Using find to locate Kotlin files and sed to modify them
find "$SEARCH_DIR" -type f -name "$FILE_PATTERN" -exec sed -i \
    -e "/$FIND_TEXT_SERVER_CONFIG/i $ADD_TEXT" \
    -e "/$FIND_TEXT_WALLET/i $ADD_TEXT" \
    -e "/$FIND_TEXT_TOKEN/i $ADD_TEXT" \
    -e "/$FIND_TEXT_ACTIVITY/i $ADD_TEXT" \
    -e "/$FIND_TEXT_COIN/i $ADD_TEXT" \
    -e "/$FIND_TEXT_SETTINGS/i $ADD_TEXT" \
    -e "/$FIND_TEXT_DEPOSIT_MSG1/i $ADD_TEXT" \
    -e "/$FIND_TEXT_DEPOSIT_MSG1_RESPONSE/i $ADD_TEXT" \
    -e "/$FIND_TEXT_DEPOSIT_INIT_RESULT/i $ADD_TEXT" \
    -e "/$FIND_TEXT_AGGREGATED_PUBLIC_KEY/i $ADD_TEXT" \
    -e "/$FIND_TEXT_SIGN_FIRST_REQUEST_PAYLOAD/i $ADD_TEXT" \
    -e "/$FIND_TEXT_SIGN_FIRST_RESPONSE_PAYLOAD/i $ADD_TEXT" \
    -e "/$FIND_TEXT_PARTIAL_SIGNATURE_REQUEST_PAYLOAD/i $ADD_TEXT" \
    -e "/$FIND_TEXT_PARTIAL_SIGNATURE_RESPONSE_PAYLOAD/i $ADD_TEXT" \
    -e "/$FIND_TEXT_BACKUP_TX/i $ADD_TEXT" \
    -e "/$FIND_TEXT_TRANSFER_SENDER_REQUEST_PAYLOAD/i $ADD_TEXT" \
    -e "/$FIND_TEXT_TRANSFER_SENDER_RESPONSE_PAYLOAD/i $ADD_TEXT" \
    -e "/$FIND_TEXT_TRANSFER_UPDATE_MSG_REQUEST_PAYLOAD/i $ADD_TEXT" \
    -e "/$IMPORT_FIND_TEXT$/ {
        n; 
        /$IMPORT_ADD_SERIALIZABLE/!i $IMPORT_ADD_SERIALIZABLE
        /$IMPORT_ADD_SERIALNAME/!i $IMPORT_ADD_SERIALNAME
    }" \
    -e "/$PACKAGE_REMOVE_TEXT/d" {} +

echo "@Serializable annotations added successfully."
