#!/bin/bash
# ABOUTME: Displays runtime logs for a Vercel deployment
# ABOUTME: Streams logs in real-time for up to 5 minutes

set -e

DEPLOYMENT=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            echo "Usage: logs.sh <deployment-url-or-id>"
            echo ""
            echo "Streams runtime logs for a Vercel deployment."
            echo "Logs are displayed in real-time for up to 5 minutes."
            echo ""
            echo "Arguments:"
            echo "  deployment-url-or-id    Deployment URL or ID"
            echo ""
            echo "Options:"
            echo "  --help, -h              Show this help"
            echo ""
            echo "Examples:"
            echo "  logs.sh https://my-app.vercel.app"
            echo "  logs.sh dpl_abc123"
            echo ""
            echo "Note: For build logs, use inspect.sh --logs instead."
            exit 0
            ;;
        -*)
            echo "Unknown option: $1"
            echo "Use --help for usage"
            exit 1
            ;;
        *)
            if [ -z "$DEPLOYMENT" ]; then
                DEPLOYMENT="$1"
            fi
            shift
            ;;
    esac
done

if [ -z "$DEPLOYMENT" ]; then
    echo "Usage: logs.sh <deployment-url-or-id>"
    echo "Example: logs.sh https://my-app.vercel.app"
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

echo "Streaming runtime logs for: $DEPLOYMENT"
echo "(Press Ctrl+C to stop, auto-stops after 5 minutes)"
echo ""

# Stream logs
vercel logs "$DEPLOYMENT"
