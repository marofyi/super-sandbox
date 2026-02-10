#!/bin/bash
# ABOUTME: Lists all Vercel projects with their URLs
# ABOUTME: Supports JSON output for programmatic use

set -e

# Parse arguments
JSON_OUTPUT=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --json|-j)
            JSON_OUTPUT=true
            shift
            ;;
        --help|-h)
            echo "Usage: list.sh [--json]"
            echo ""
            echo "Lists all Vercel projects in your account."
            echo ""
            echo "Options:"
            echo "  --json, -j    Output as JSON"
            echo "  --help, -h    Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage"
            exit 1
            ;;
    esac
done

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

# List projects
if [ "$JSON_OUTPUT" = true ]; then
    vercel project ls --json
else
    vercel project ls
fi
