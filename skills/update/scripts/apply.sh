#!/bin/bash
# Apply Super Sandbox updates
# Usage: ./skills/update/scripts/apply.sh
set -e

UPSTREAM_REMOTE="upstream"

echo "Applying Super Sandbox updates..."
echo ""

# Ensure upstream exists
if ! git remote get-url "$UPSTREAM_REMOTE" &>/dev/null; then
  echo "Error: Run ./skills/update/scripts/check.sh first"
  exit 1
fi

# Ensure clean working directory
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working directory not clean. Commit or stash changes first."
  exit 1
fi

# Fetch latest
git fetch "$UPSTREAM_REMOTE" main --quiet

# Check if already up to date
CURRENT=$(git rev-parse HEAD)
UPSTREAM=$(git rev-parse "$UPSTREAM_REMOTE/main")

if [ "$CURRENT" = "$UPSTREAM" ]; then
  echo "✓ Already up to date"
  exit 0
fi

# Create backup branch
BACKUP_BRANCH="backup-before-update-$(date +%Y%m%d-%H%M%S)"
git branch "$BACKUP_BRANCH"
echo "Created backup branch: $BACKUP_BRANCH"

# Attempt merge
echo "Merging upstream changes..."
if git merge "$UPSTREAM_REMOTE/main" --no-commit --no-ff 2>/dev/null; then
  # Preserve local projects
  if [ -d "projects" ]; then
    echo "Preserving local projects..."
    git checkout --ours projects/ 2>/dev/null || true
  fi

  # Preserve local env files
  git checkout --ours .env* 2>/dev/null || true
  git checkout --ours *.local.* 2>/dev/null || true

  # Complete merge
  git add .
  git commit -m "chore: sync with upstream super-sandbox

Merged from $UPSTREAM_REMOTE/main
Backup branch: $BACKUP_BRANCH"

  echo ""
  echo "✓ Update complete!"
  echo ""
  echo "Next steps:"
  echo "  1. Run 'pnpm install' to update dependencies"
  echo "  2. Check CHANGELOG.md for what's new"
  echo "  3. Delete backup branch if everything works: git branch -d $BACKUP_BRANCH"
else
  echo ""
  echo "Merge conflicts detected. Resolve manually:"
  echo "  1. Fix conflicts in affected files"
  echo "  2. git add <resolved-files>"
  echo "  3. git commit"
  echo ""
  echo "To abort: git merge --abort"
  echo "Backup branch available: $BACKUP_BRANCH"
  exit 1
fi
