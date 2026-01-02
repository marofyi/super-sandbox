#!/bin/bash
# ABOUTME: First-time setup for html-live-preview skill
# ABOUTME: Creates gist, generates key, uploads viewer, saves config

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(pwd)"
CONFIG_FILE="$PROJECT_ROOT/html-live-preview.json"
VIEWER_TEMPLATE="$SKILL_DIR/assets/viewer-template.html"

# Check if already set up
if [ -f "$CONFIG_FILE" ]; then
    echo "Setup already complete. Config exists at: $CONFIG_FILE"
    cat "$CONFIG_FILE"
    exit 0
fi

echo "Setting up html-live-preview..."

# Generate random key (16 chars alphanumeric)
KEY=$(node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))")
echo "Generated key: $KEY"

# Create initial gist with placeholder content
echo "Creating GitHub Gist..."
GIST_URL=$(echo "html-live-preview-placeholder" | gh gist create --public -f html-live-preview.txt 2>&1 | tail -1)
GIST_ID=$(echo "$GIST_URL" | grep -oE '[a-f0-9]{32}')

if [ -z "$GIST_ID" ]; then
    echo "Error: Failed to create gist"
    echo "Output was: $GIST_URL"
    exit 1
fi
echo "Created gist: $GIST_ID"

# Generate viewer HTML with embedded config
echo "Generating viewer..."
VIEWER_HTML=$(cat "$VIEWER_TEMPLATE" | sed "s/{{GIST_ID}}/$GIST_ID/g" | sed "s/{{KEY}}/$KEY/g")

# Upload to 0x0.st
echo "Uploading viewer to 0x0.st..."
VIEWER_URL=$(echo "$VIEWER_HTML" | curl -s -F'file=@-;filename=preview.html' https://0x0.st)

if [ -z "$VIEWER_URL" ] || [[ ! "$VIEWER_URL" =~ ^https:// ]]; then
    echo "Error: Failed to upload to 0x0.st"
    echo "Response was: $VIEWER_URL"
    exit 1
fi
echo "Viewer URL: $VIEWER_URL"

# Save config
cat > "$CONFIG_FILE" << EOF
{
  "gist_id": "$GIST_ID",
  "key": "$KEY",
  "viewer_url": "$VIEWER_URL"
}
EOF

echo ""
echo "Setup complete!"
echo "Config saved to: $CONFIG_FILE"
echo ""
echo "Viewer URL (share this):"
echo "$VIEWER_URL"
