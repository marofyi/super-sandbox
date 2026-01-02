#!/bin/bash
# ABOUTME: Quick redeploy to existing surge domain
# ABOUTME: Uses saved domain from previous deploy for faster iteration

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "$PROJECT_DIR/.surge-domain" ]; then
    echo "No previous deployment found. Run ./deploy.sh first."
    exit 1
fi

export SURGE_DOMAIN=$(cat "$PROJECT_DIR/.surge-domain")
exec "$PROJECT_DIR/deploy.sh"
