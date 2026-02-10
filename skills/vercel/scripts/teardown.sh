#!/bin/bash
# ABOUTME: Removes a Vercel project and its deployments
# ABOUTME: Supports --safe flag to preserve active deployments

set -e

PROJECT_NAME="${1:-}"
SAFE_MODE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --safe|-s)
            SAFE_MODE=true
            shift
            ;;
        --help|-h)
            echo "Usage: teardown.sh <project-name> [--safe]"
            echo ""
            echo "Removes a Vercel project and all its deployments."
            echo ""
            echo "Arguments:"
            echo "  project-name    Name of the Vercel project to remove"
            echo ""
            echo "Options:"
            echo "  --safe, -s      Preserve deployments with active URLs"
            echo "  --help, -h      Show this help"
            echo ""
            echo "Example:"
            echo "  teardown.sh my-test-project"
            echo "  teardown.sh my-test-project --safe"
            exit 0
            ;;
        -*)
            echo "Unknown option: $1"
            echo "Use --help for usage"
            exit 1
            ;;
        *)
            if [ -z "$PROJECT_NAME" ]; then
                PROJECT_NAME="$1"
            fi
            shift
            ;;
    esac
done

if [ -z "$PROJECT_NAME" ]; then
    echo "Usage: teardown.sh <project-name> [--safe]"
    echo "Example: teardown.sh my-test-project"
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

# Remove project
echo "Removing Vercel project: $PROJECT_NAME"

if [ "$SAFE_MODE" = true ]; then
    vercel remove "$PROJECT_NAME" --safe --yes
    echo "Project removed (active deployments preserved)"
else
    vercel remove "$PROJECT_NAME" --yes
    echo "Project removed"
fi
