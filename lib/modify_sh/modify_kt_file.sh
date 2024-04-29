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

# The text to add @Serializable
ADD_TEXT="@Serializable"

# Text to find for modifying imports
IMPORT_FIND_TEXT="import com.sun.jna.ptr.*"

# New import text to add
IMPORT_ADD_SERIALIZABLE="import kotlinx.serialization.Serializable"
IMPORT_ADD_SERIALNAME="import kotlinx.serialization.SerialName"

# Using find to locate Kotlin files and sed to modify them
find "$SEARCH_DIR" -type f -name "$FILE_PATTERN" -exec sed -i \
    -e "/$FIND_TEXT_SERVER_CONFIG/i $ADD_TEXT" \
    -e "/$FIND_TEXT_WALLET/i $ADD_TEXT" \
    -e "/$FIND_TEXT_TOKEN/i $ADD_TEXT" \
    -e "/$FIND_TEXT_ACTIVITY/i $ADD_TEXT" \
    -e "/$FIND_TEXT_COIN/i $ADD_TEXT" \
    -e "/$FIND_TEXT_SETTINGS/i $ADD_TEXT" \
    -e "/$IMPORT_FIND_TEXT$/ {
        n; 
        /$IMPORT_ADD_SERIALIZABLE/!i $IMPORT_ADD_SERIALIZABLE
        /$IMPORT_ADD_SERIALNAME/!i $IMPORT_ADD_SERIALNAME
    }" {} +

echo "Modification complete."
