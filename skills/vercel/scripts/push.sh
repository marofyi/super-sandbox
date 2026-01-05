#!/bin/bash
# ABOUTME: Deploys HTML project to Vercel
# ABOUTME: Fast production deploy with ~10s turnaround

set -e

PROJECT_PATH="${1:-}"

if [ -z "$PROJECT_PATH" ]; then
    echo "Usage: push.sh <project-path>"
    echo "Example: push.sh projects/my-app"
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

# Check if project is linked
if [ ! -f "$PROJECT_PATH/.vercel/project.json" ]; then
    echo "Error: Project not linked to Vercel"
    echo "Run setup.sh first: ./skills/vercel/scripts/setup.sh $PROJECT_PATH"
    exit 1
fi

# Deploy to production
OUTPUT=$(vercel deploy --prod --yes "$PROJECT_PATH" 2>&1)

# Extract the production URL
PROD_URL=$(echo "$OUTPUT" | grep -oE 'https://[a-zA-Z0-9-]+\.vercel\.app' | tail -1)

if [ -n "$PROD_URL" ]; then
    echo "Deployed: $PROD_URL"
else
    echo "Deployed (URL not captured)"
fi
