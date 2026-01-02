#!/bin/bash
# ABOUTME: Encrypts HTML content and pushes to GitHub Gist
# ABOUTME: Uses AES-256-GCM encryption with key from config

set -e

PROJECT_ROOT="$(pwd)"
CONFIG_FILE="$PROJECT_ROOT/html-live-preview.json"
HTML_FILE="${1:-}"

# Check for config
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: html-live-preview.json not found"
    echo "Run setup.sh first to initialize live preview"
    exit 1
fi

# Check for HTML file argument
if [ -z "$HTML_FILE" ]; then
    echo "Usage: push.sh <html-file>"
    exit 1
fi

if [ ! -f "$HTML_FILE" ]; then
    echo "Error: File not found: $HTML_FILE"
    exit 1
fi

# Read config
GIST_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$CONFIG_FILE')).gist_id)")
KEY=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$CONFIG_FILE')).key)")

if [ -z "$GIST_ID" ] || [ -z "$KEY" ]; then
    echo "Error: Invalid config file"
    exit 1
fi

# Read HTML content
HTML_CONTENT=$(cat "$HTML_FILE")

# Encrypt using Node.js (AES-256-GCM with PBKDF2 key derivation)
ENCRYPTED=$(node -e "
const crypto = require('crypto');
const key = Buffer.from(process.argv[1], 'utf8');
const plaintext = Buffer.from(process.argv[2], 'utf8');

// Generate random salt (16 bytes) and IV (12 bytes for GCM)
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);

// Derive 256-bit key using PBKDF2 with 100k iterations
const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');

// Encrypt with AES-256-GCM
const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
const authTag = cipher.getAuthTag(); // 16 bytes

// Combine: salt(16) + iv(12) + authTag(16) + ciphertext
const combined = Buffer.concat([salt, iv, authTag, encrypted]);

// Output as base64
console.log(combined.toString('base64'));
" "$KEY" "$HTML_CONTENT")

# Write encrypted content to temp file
TEMP_FILE=$(mktemp)
echo "$ENCRYPTED" > "$TEMP_FILE"

# Update Gist
gh gist edit "$GIST_ID" "$TEMP_FILE" --filename html-live-preview.txt

# Cleanup
rm "$TEMP_FILE"

echo "Preview updated: ${#HTML_CONTENT} bytes"
