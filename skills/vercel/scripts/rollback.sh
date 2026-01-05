#!/bin/bash
# ABOUTME: Rolls back a Vercel project to a previous deployment
# ABOUTME: Can target a specific deployment or revert to the immediate previous one

set -e

DEPLOYMENT=""
TIMEOUT=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --timeout|-t)
            TIMEOUT="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: rollback.sh [deployment-url-or-id] [--timeout <seconds>]"
            echo ""
            echo "Rolls back production to a previous deployment."
            echo ""
            echo "Arguments:"
            echo "  deployment-url-or-id    Optional: specific deployment to roll back to"
            echo "                          If omitted, rolls back to the previous deployment"
            echo ""
            echo "Options:"
            echo "  --timeout, -t <sec>     Timeout in seconds (default: 300)"
            echo "  --help, -h              Show this help"
            echo ""
            echo "Examples:"
            echo "  rollback.sh                              # Roll back to previous"
            echo "  rollback.sh https://my-app-abc123.vercel.app"
            echo "  rollback.sh dpl_abc123 --timeout 60"
            echo ""
            echo "Note: On Hobby plan, only rollback to immediately previous deployment is supported."
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
CMD="vercel rollback"

if [ -n "$DEPLOYMENT" ]; then
    CMD="$CMD $DEPLOYMENT"
    echo "Rolling back to: $DEPLOYMENT"
else
    echo "Rolling back to previous production deployment..."
fi

if [ -n "$TIMEOUT" ]; then
    CMD="$CMD --timeout $TIMEOUT"
fi

# Execute rollback
$CMD

echo "Rollback complete"
