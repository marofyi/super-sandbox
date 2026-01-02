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
#
# SECURITY NOTE: We write the token to gh's config file. The token is also
# in the GH_TOKEN environment variable (set by parent process, cannot be unset).
# The security-hook.py PreToolUse hook blocks commands that could leak this token.
# See docs/cc-web-security.md for the full threat model.
if [ -n "$GH_TOKEN" ]; then
  rm -rf ~/.config/gh
  mkdir -p ~/.config/gh
  # Write token to hosts.yml so gh doesn't need to read from environment
  cat > ~/.config/gh/hosts.yml << 'EOFYML'
github.com:
    git_protocol: https
EOFYML
  # Note: gh will still use GH_TOKEN env var. We can't unset it from here
  # because we're a child process. The security hook is the primary defense.
  echo "GitHub CLI configured for token auth"
fi

echo "Web session setup complete"
