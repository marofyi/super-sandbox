#!/bin/bash
# ABOUTME: Generates an itty.bitty URL from an HTML file
# ABOUTME: Uses LZMA compression + Base64 encoding

FILE="${1:-index.html}"

if [ ! -f "$FILE" ]; then
    echo "Error: File not found: $FILE"
    exit 1
fi

ENCODED=$(cat "$FILE" | lzma -9 | base64 -w0)
URL="https://itty.bitty.site/#/$ENCODED"

echo "$URL"
echo ""
echo "Encoded size: ${#ENCODED} characters"
