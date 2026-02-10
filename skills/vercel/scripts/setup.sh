#!/bin/bash
# ABOUTME: First-time setup for vercel skill
# ABOUTME: Links a project directory to Vercel and does initial deploy

set -e

PROJECT_PATH="${1:-}"

if [ -z "$PROJECT_PATH" ]; then
    echo "Usage: setup.sh <project-path>"
    echo "Example: setup.sh projects/my-app"
    exit 1
fi

if [ ! -d "$PROJECT_PATH" ]; then
    echo "Error: Directory not found: $PROJECT_PATH"
    exit 1
fi

# Check for Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "Error: Vercel CLI not found"
    echo "Install with: npm install -g vercel"
    exit 1
fi

# Check for authentication
if ! vercel whoami &> /dev/null; then
    echo "Error: Not logged in to Vercel"
    echo "Run: vercel login"
    echo "Or set VERCEL_TOKEN environment variable"
    exit 1
fi

# Check if already linked
if [ -f "$PROJECT_PATH/.vercel/project.json" ]; then
    echo "Project already linked to Vercel"
    PROJECT_URL=$(vercel inspect "$PROJECT_PATH" 2>&1 | grep -oE 'https://[^ ]+\.vercel\.app' | head -1 || true)
    if [ -n "$PROJECT_URL" ]; then
        echo "URL: $PROJECT_URL"
    fi
    exit 0
fi

echo "Setting up Vercel project for: $PROJECT_PATH"

# Initial deploy (creates and links project)
echo "Deploying to Vercel..."
OUTPUT=$(vercel deploy --prod --yes "$PROJECT_PATH" 2>&1)

# Extract the production URL
PROD_URL=$(echo "$OUTPUT" | grep -oE 'https://[a-zA-Z0-9-]+\.vercel\.app' | tail -1)

if [ -z "$PROD_URL" ]; then
    echo "Error: Could not extract Vercel URL"
    echo "Output was:"
    echo "$OUTPUT"
    exit 1
fi

echo ""
echo "Setup complete!"
echo ""
echo "Preview URL:"
echo "$PROD_URL"
