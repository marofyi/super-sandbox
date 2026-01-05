#!/bin/bash
# ABOUTME: Shows detailed information about a Vercel deployment
# ABOUTME: Supports build logs and wait-for-completion options

set -e

DEPLOYMENT=""
SHOW_LOGS=false
WAIT_FOR_COMPLETION=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --logs|-l)
            SHOW_LOGS=true
            shift
            ;;
        --wait|-w)
            WAIT_FOR_COMPLETION=true
            shift
            ;;
        --help|-h)
            echo "Usage: inspect.sh <deployment-url-or-id> [options]"
            echo ""
            echo "Shows detailed information about a Vercel deployment."
            echo ""
            echo "Arguments:"
            echo "  deployment-url-or-id    Deployment URL or ID to inspect"
            echo ""
            echo "Options:"
            echo "  --logs, -l      Show build logs instead of deployment info"
            echo "  --wait, -w      Wait for deployment to complete before showing info"
            echo "  --help, -h      Show this help"
            echo ""
            echo "Examples:"
            echo "  inspect.sh https://my-app.vercel.app"
            echo "  inspect.sh dpl_abc123 --logs"
            echo "  inspect.sh https://my-app.vercel.app --wait"
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
    echo "Usage: inspect.sh <deployment-url-or-id> [--logs] [--wait]"
    echo "Example: inspect.sh https://my-app.vercel.app"
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

# Build command
CMD="vercel inspect $DEPLOYMENT"

if [ "$SHOW_LOGS" = true ]; then
    CMD="$CMD --logs"
fi

if [ "$WAIT_FOR_COMPLETION" = true ]; then
    CMD="$CMD --wait"
fi

# Run inspect
$CMD
