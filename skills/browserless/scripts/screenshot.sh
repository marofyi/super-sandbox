#!/bin/bash
# Browserless Screenshot CLI
# Usage: ./skills/browserless/scripts/screenshot.sh <url> [options]
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

# Ensure built
if [ ! -f "$SKILL_DIR/dist/bin/screenshot.js" ]; then
  echo "Building browserless skill..."
  cd "$SKILL_DIR" && pnpm build
fi

node "$SKILL_DIR/dist/bin/screenshot.js" "$@"
