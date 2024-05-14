#!/bin/bash

# Directory where Kotlin files are located
SEARCH_DIR="out-kotlin/com/mercurylayer"

# File pattern to search for (assuming all Kotlin files end with .kt)
FILE_PATTERN="*.kt"

# awk script to add @SerialName within enum class TransferReceiverError
add_serial_name() {
    local file_path="$1"  # Path to the file being processed

    awk '
    BEGIN { in_enum_class = 0 }

    /enum class TransferReceiverError \{/ { in_enum_class = 1 }
    /^}/ { if (in_enum_class) in_enum_class = 0 }

    in_enum_class && /STATECOIN_BATCH_LOCKED_ERROR,/ {
        print "\t@SerialName(\"StatecoinBatchLockedError\")"
    }
    in_enum_class && /EXPIRED_BATCH_TIME_ERROR,/ {
        print "\t@SerialName(\"ExpiredBatchTimeError\")"
    }

    { print }
    ' "$file_path" > tmp && mv tmp "$file_path"
}

# Export the function so it's available to the subshell spawned by find
export -f add_serial_name

# Use find to locate Kotlin files and process them with the add_serial_name function
find "$SEARCH_DIR" -type f -name "$FILE_PATTERN" -exec bash -c 'add_serial_name "$0"' {} \;

echo "@SerialName annotations added to TransferReceiverError successfully."
