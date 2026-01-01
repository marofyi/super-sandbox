#!/bin/bash
# ABOUTME: Encrypts HTML content and pushes to GitHub Gist
# ABOUTME: Uses AES-256-GCM encryption with password-derived key

set -e

GIST_ID="${GIST_ID:-c1a64976eacb07e222835983604e35b3}"
HTML_FILE="${1:-index.html}"
PASSWORD="${2:-}"

if [ ! -f "$HTML_FILE" ]; then
    echo "Error: File not found: $HTML_FILE"
    exit 1
fi

if [ -z "$PASSWORD" ]; then
    echo -n "Enter encryption password: "
    read -s PASSWORD
    echo
fi

if [ -z "$PASSWORD" ]; then
    echo "Error: Password cannot be empty"
    exit 1
fi

# Read HTML content
HTML_CONTENT=$(cat "$HTML_FILE")

# Encrypt using Node.js (AES-256-GCM with PBKDF2 key derivation)
ENCRYPTED=$(node -e "
const crypto = require('crypto');
const password = Buffer.from(process.argv[1], 'utf8');
const plaintext = Buffer.from(process.argv[2], 'utf8');

// Generate random salt (16 bytes) and IV (12 bytes for GCM)
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);

// Derive 256-bit key using PBKDF2 with 100k iterations
const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

// Encrypt with AES-256-GCM
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
const authTag = cipher.getAuthTag(); // 16 bytes

// Combine: salt(16) + iv(12) + authTag(16) + ciphertext
const combined = Buffer.concat([salt, iv, authTag, encrypted]);

// Output as base64
console.log(combined.toString('base64'));
" "$PASSWORD" "$HTML_CONTENT")

# Write encrypted content to temp file
echo "$ENCRYPTED" > /tmp/preview-url.txt

# Update Gist
gh gist edit "$GIST_ID" /tmp/preview-url.txt

echo ""
echo "Encrypted preview updated!"
echo "Content: ${#HTML_CONTENT} bytes → ${#ENCRYPTED} chars (encrypted)"
echo "Gist ID: $GIST_ID"
