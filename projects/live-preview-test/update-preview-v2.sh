#!/bin/bash
# ABOUTME: Updates a GitHub Gist with raw HTML content for live preview
# ABOUTME: Simpler approach - stores HTML directly, viewer renders via srcdoc

GIST_ID="c1a64976eacb07e222835983604e35b3"
HTML_FILE="${1:-/home/user/research/projects/live-preview-test/index.html}"

if [ ! -f "$HTML_FILE" ]; then
    echo "Error: File not found: $HTML_FILE"
    exit 1
fi

# Copy HTML to temp file for Gist update
cp "$HTML_FILE" /tmp/preview-url.txt

# Update Gist
gh gist edit "$GIST_ID" /tmp/preview-url.txt

echo "Preview updated!"
echo ""
echo "Poll URL: https://gist.githubusercontent.com/marofyi/$GIST_ID/raw/preview-url.txt"
