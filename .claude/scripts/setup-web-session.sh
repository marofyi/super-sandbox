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
# SECURITY: We write the token to gh's config file, then unset GH_TOKEN
# from the environment using CLAUDE_ENV_FILE. This way:
# 1. gh CLI authenticates via config file (not env var)
# 2. Subsequent Bash commands don't have access to the raw token
# 3. The security-hook.py provides defense-in-depth
# See docs/cc-web-security.md for the full threat model.
if [ -n "$GH_TOKEN" ]; then
  rm -rf ~/.config/gh
  mkdir -p ~/.config/gh
  # Write token to hosts.yml so gh authenticates via config file
  cat > ~/.config/gh/hosts.yml << EOFYML
github.com:
    oauth_token: ${GH_TOKEN}
    git_protocol: https
EOFYML
  # Restrict permissions on the config file
  chmod 600 ~/.config/gh/hosts.yml

  # Unset ALL sensitive tokens for subsequent Bash commands using CLAUDE_ENV_FILE
  # This is the key security measure - removes secrets from environment
  if [ -n "$CLAUDE_ENV_FILE" ]; then
    # GitHub tokens
    echo 'unset GH_TOKEN' >> "$CLAUDE_ENV_FILE"
    echo 'unset GITHUB_TOKEN' >> "$CLAUDE_ENV_FILE"
    # Other API tokens that may be in environment
    echo 'unset OPENAI_API_KEY' >> "$CLAUDE_ENV_FILE"
    echo 'unset ANTHROPIC_API_KEY' >> "$CLAUDE_ENV_FILE"
    echo 'unset VERCEL_TOKEN' >> "$CLAUDE_ENV_FILE"
    echo 'unset BROWSERLESS_TOKEN' >> "$CLAUDE_ENV_FILE"
    echo 'unset CODESIGN_MCP_TOKEN' >> "$CLAUDE_ENV_FILE"
    echo "Sensitive tokens removed from environment"
  else
    echo "Warning: CLAUDE_ENV_FILE not available, tokens remain in env"
  fi

  echo "GitHub CLI configured for token auth"
fi

# Add a real GitHub remote so gh CLI can detect the repo
# The proxy remote (origin) isn't recognized as a GitHub host
REPO=$(git remote get-url origin 2>/dev/null | sed -E 's|.*/git/([^/]+/[^/]+).*|\1|')
if [ -n "$REPO" ] && ! git remote get-url github &>/dev/null; then
  git remote add github "https://github.com/${REPO}.git"
  echo "Added 'github' remote for gh CLI: $REPO"
fi

echo "Web session setup complete"
