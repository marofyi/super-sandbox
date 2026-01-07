#!/bin/bash
# Check for Super Sandbox updates
# Usage: ./skills/update/scripts/check.sh
set -e

UPSTREAM_URL="https://github.com/marofyi/super-sandbox.git"
UPSTREAM_REMOTE="upstream"

echo "Checking for Super Sandbox updates..."
echo ""

# Add upstream remote if not exists
if ! git remote get-url "$UPSTREAM_REMOTE" &>/dev/null; then
  echo "Adding upstream remote..."
  git remote add "$UPSTREAM_REMOTE" "$UPSTREAM_URL"
fi

# Fetch upstream
echo "Fetching upstream..."
git fetch "$UPSTREAM_REMOTE" main --quiet

# Get current and upstream commits
CURRENT=$(git rev-parse HEAD)
UPSTREAM=$(git rev-parse "$UPSTREAM_REMOTE/main")

if [ "$CURRENT" = "$UPSTREAM" ]; then
  echo "✓ You're up to date with Super Sandbox"
  exit 0
fi

# Show what's changed
echo ""
echo "Updates available!"
echo ""
echo "Changed files:"
git diff HEAD..."$UPSTREAM_REMOTE/main" --stat | head -20

echo ""
echo "Recent upstream commits:"
git log HEAD.."$UPSTREAM_REMOTE/main" --oneline | head -10

echo ""
echo "To apply updates, run:"
echo "  ./skills/update/scripts/apply.sh"
