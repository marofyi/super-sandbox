#!/bin/bash
# ABOUTME: Deploys to surge.sh with timing and timestamp injection
# ABOUTME: Measures round-trip deployment speed for benchmarking

set -e

DOMAIN="${SURGE_DOMAIN:-surge-test-$(date +%s).surge.sh}"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$PROJECT_DIR/.build"

# Check for surge credentials
if [ -z "$SURGE_LOGIN" ] || [ -z "$SURGE_TOKEN" ]; then
    echo "ERROR: SURGE_LOGIN and SURGE_TOKEN must be set"
    echo ""
    echo "To get your token, run: surge token"
    echo "Then set:"
    echo "  export SURGE_LOGIN='your-email@example.com'"
    echo "  export SURGE_TOKEN='your-token'"
    exit 1
fi

# Create build directory
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Inject timestamp into HTML
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
sed "s|NEVER|$TIMESTAMP|g" "$PROJECT_DIR/index.html" > "$BUILD_DIR/index.html"

echo "Deploying to: $DOMAIN"
echo "Timestamp: $TIMESTAMP"
echo ""

# Time the deployment
START=$(date +%s.%N)

surge "$BUILD_DIR" "$DOMAIN" --token "$SURGE_TOKEN"

END=$(date +%s.%N)
ELAPSED=$(echo "$END - $START" | bc)

echo ""
echo "================================"
echo "Deploy time: ${ELAPSED}s"
echo "Preview URL: https://$DOMAIN"
echo "================================"

# Save domain for quick re-deploy
echo "$DOMAIN" > "$PROJECT_DIR/.surge-domain"
