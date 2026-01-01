#!/bin/bash
set -e

# Only run in web (remote) environment
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

echo "Setting up Claude Code web session..."

# Install gh CLI if not present
if ! command -v gh &> /dev/null; then
  echo "Installing GitHub CLI..."
  GH_VERSION="2.63.2"
  curl -sL -o /tmp/gh.tar.gz "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_amd64.tar.gz"
  tar -xzf /tmp/gh.tar.gz -C /tmp
  sudo cp /tmp/gh_${GH_VERSION}_linux_amd64/bin/gh /usr/local/bin/
  rm -rf /tmp/gh.tar.gz /tmp/gh_${GH_VERSION}_linux_amd64
  echo "GitHub CLI v${GH_VERSION} installed"
else
  echo "GitHub CLI already installed: $(gh --version | head -1)"
fi

# Setup gh config to use GH_TOKEN without migration issues
# Fresh sandbox has no config, and old/corrupted configs trigger
# a migration that requires dbus-launch (not available here)
if [ -n "$GH_TOKEN" ]; then
  rm -rf ~/.config/gh
  mkdir -p ~/.config/gh
  touch ~/.config/gh/hosts.yml
  echo "GitHub CLI configured for token auth"
fi

echo "Web session setup complete"
