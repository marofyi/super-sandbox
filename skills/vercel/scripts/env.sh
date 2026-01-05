#!/bin/bash
# ABOUTME: Manages environment variables for a Vercel project
# ABOUTME: Supports list, add, remove, and pull operations

set -e

PROJECT_PATH="${1:-}"
ACTION="${2:-}"
VAR_NAME="${3:-}"
ENVIRONMENT="${4:-}"

show_help() {
    echo "Usage: env.sh <project-path> <action> [name] [environment]"
    echo ""
    echo "Manages environment variables for a Vercel project."
    echo ""
    echo "Arguments:"
    echo "  project-path    Path to the linked Vercel project"
    echo "  action          One of: ls, add, rm, pull"
    echo "  name            Variable name (for add/rm)"
    echo "  environment     Target environment: development, preview, production (for add)"
    echo ""
    echo "Actions:"
    echo "  ls              List all environment variables"
    echo "  add             Add a new environment variable (prompts for value)"
    echo "  rm              Remove an environment variable"
    echo "  pull            Download .env file from Vercel"
    echo ""
    echo "Examples:"
    echo "  env.sh projects/my-app ls"
    echo "  env.sh projects/my-app add API_KEY production"
    echo "  env.sh projects/my-app rm API_KEY"
    echo "  env.sh projects/my-app pull"
    exit 0
}

# Parse help flag anywhere
for arg in "$@"; do
    if [ "$arg" = "--help" ] || [ "$arg" = "-h" ]; then
        show_help
    fi
done

if [ -z "$PROJECT_PATH" ] || [ -z "$ACTION" ]; then
    echo "Usage: env.sh <project-path> <action> [name] [environment]"
    echo ""
    echo "Actions: ls, add, rm, pull"
    echo ""
    echo "Use --help for more details"
    exit 1
fi

if [ ! -d "$PROJECT_PATH" ]; then
    echo "Error: Directory not found: $PROJECT_PATH"
    exit 1
fi

# Check if project is linked
if [ ! -f "$PROJECT_PATH/.vercel/project.json" ]; then
    echo "Error: Project not linked to Vercel"
    echo "Run setup.sh first: ./skills/vercel/scripts/setup.sh $PROJECT_PATH"
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

# Change to project directory for vercel commands
cd "$PROJECT_PATH"

case "$ACTION" in
    ls|list)
        vercel env ls
        ;;
    add)
        if [ -z "$VAR_NAME" ]; then
            echo "Error: Variable name required"
            echo "Usage: env.sh $PROJECT_PATH add <name> [environment]"
            exit 1
        fi
        if [ -n "$ENVIRONMENT" ]; then
            vercel env add "$VAR_NAME" "$ENVIRONMENT"
        else
            vercel env add "$VAR_NAME"
        fi
        ;;
    rm|remove)
        if [ -z "$VAR_NAME" ]; then
            echo "Error: Variable name required"
            echo "Usage: env.sh $PROJECT_PATH rm <name>"
            exit 1
        fi
        vercel env rm "$VAR_NAME" --yes
        echo "Removed: $VAR_NAME"
        ;;
    pull)
        vercel env pull
        echo "Environment variables saved to .env"
        ;;
    *)
        echo "Error: Unknown action: $ACTION"
        echo "Valid actions: ls, add, rm, pull"
        exit 1
        ;;
esac
