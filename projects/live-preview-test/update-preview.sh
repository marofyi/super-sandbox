#!/bin/bash
# ABOUTME: Updates a GitHub Gist with the current preview URL
# ABOUTME: Creates an itty.bitty URL from the HTML file and pushes to Gist

GIST_ID="c1a64976eacb07e222835983604e35b3"
HTML_FILE="${1:-/home/user/research/projects/live-preview-test/index.html}"
SCRIPT_DIR="$(dirname "$0")"

# Generate the itty.bitty URL
PREVIEW_URL=$("$SCRIPT_DIR/generate-itty-url.sh" "$HTML_FILE" | head -1)

# Write to temp file
echo "$PREVIEW_URL" > /tmp/preview-url.txt

# Update Gist
gh gist edit "$GIST_ID" /tmp/preview-url.txt

echo "Preview URL updated:"
echo "$PREVIEW_URL"
echo ""
echo "Poll this raw URL from your browser:"
echo "https://gist.githubusercontent.com/marofyi/$GIST_ID/raw/preview-url.txt"
