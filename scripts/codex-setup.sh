#!/bin/bash
# Super Sandbox - OpenAI Codex Environment Setup
#
# INSTRUCTIONS:
# 1. Copy this entire script content
# 2. Paste into your Codex environment settings
# 3. Save and restart your environment
#
# This script installs the tools needed for Super Sandbox:
# - GitHub CLI (gh) for repository operations
# - Vercel CLI for deployments
# - pnpm for package management
#
set -e

echo "Setting up Super Sandbox for Codex..."

# Install GitHub CLI
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

# Install Vercel CLI
if ! command -v vercel &> /dev/null; then
  echo "Installing Vercel CLI..."
  npm install -g vercel@latest
  echo "Vercel CLI installed: $(vercel --version)"
else
  echo "Vercel CLI already installed: $(vercel --version)"
fi

# Install pnpm
if ! command -v pnpm &> /dev/null; then
  echo "Installing pnpm..."
  npm install -g pnpm@latest
  echo "pnpm installed: $(pnpm --version)"
else
  echo "pnpm already installed: $(pnpm --version)"
fi

echo ""
echo "Super Sandbox setup complete!"
echo ""
echo "Next steps:"
echo "1. Set environment variables:"
echo "   export GH_TOKEN='your-github-token'"
echo "   export BROWSERLESS_TOKEN='your-browserless-token'"
echo "   export VERCEL_TOKEN='your-vercel-token'  # optional"
echo ""
echo "2. Clone your project and install dependencies:"
echo "   git clone https://github.com/your-username/super-sandbox"
echo "   cd super-sandbox"
echo "   pnpm install"
