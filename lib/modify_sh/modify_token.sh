#!/bin/bash

# # Directory where Kotlin files are located
# SEARCH_DIR="/path/to/kotlin/files"

# # File pattern to search for (assuming all Kotlin files end with .kt)
# FILE_PATTERN="*.kt"

# # Function to prepend @SerialName to fields in data class Token
# add_serial_name() {
#     local file_path="$1"  # Path to the file being processed

#     # Use sed to insert @SerialName annotations
#     sed -i '' \
#         -e '/var `btcPaymentAddress`:/i @SerialName("btc_payment_address")' \
#         -e '/var `lightningInvoice`:/i @SerialName("lightning_invoice")' \
#         -e '/var `processorId`:/i @SerialName("processor_id")' \
#         -e '/var `tokenId`:/i @SerialName("token_id")' \
#         "$file_path"
# }

# # Export the function so it's available to the subshell spawned by find
# export -f add_serial_name

# # Use find to locate Kotlin files and process them with the add_serial_name function
# find "$SEARCH_DIR" -type f -name "$FILE_PATTERN" -exec bash -c 'add_serial_name "$0"' {} \;

# echo "Annotation modification complete."

#!/bin/bash

# Directory where Kotlin files are located
SEARCH_DIR="out-kotlin/com/mercurylayer"

# File pattern to search for (assuming all Kotlin files end with .kt)
FILE_PATTERN="*.kt"

# awk script to add @SerialName within data class Token
add_serial_name() {
    local file_path="$1"  # Path to the file being processed

    awk '
    BEGIN { in_data_class = 0 }

    /data class Token\(/ { in_data_class = 1 }
    /^}/ { if (in_data_class) in_data_class = 0 }

    in_data_class && /var `btcPaymentAddress`:/ {
        print "\t@SerialName(\"btc_payment_address\")"
    }
    in_data_class && /var `lightningInvoice`:/ {
        print "\t@SerialName(\"lightning_invoice\")"
    }
    in_data_class && /var `processorId`:/ {
        print "\t@SerialName(\"processor_id\")"
    }
    in_data_class && /var `tokenId`:/ {
        print "\t@SerialName(\"token_id\")"
    }

    { print }
    ' "$file_path" > tmp && mv tmp "$file_path"
}

# Export the function so it's available to the subshell spawned by find
export -f add_serial_name

# Use find to locate Kotlin files and process them with the add_serial_name function
find "$SEARCH_DIR" -type f -name "$FILE_PATTERN" -exec bash -c 'add_serial_name "$0"' {} \;

echo "Annotation modification complete."
