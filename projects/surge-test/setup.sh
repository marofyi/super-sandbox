#!/bin/bash
# ABOUTME: Setup helper for surge.sh authentication
# ABOUTME: Guides user through getting and setting credentials

echo "=== Surge.sh Setup ==="
echo ""

# Check current status
if surge whoami 2>/dev/null | grep -q "@"; then
    echo "Already logged in as: $(surge whoami)"
    echo ""
    echo "Getting token for automation..."
    TOKEN=$(surge token 2>/dev/null)
    EMAIL=$(surge whoami)
    echo ""
    echo "Add these to your environment:"
    echo "  export SURGE_LOGIN='$EMAIL'"
    echo "  export SURGE_TOKEN='$TOKEN'"
    exit 0
fi

# Check if env vars are set
if [ -n "$SURGE_LOGIN" ] && [ -n "$SURGE_TOKEN" ]; then
    echo "Credentials found in environment."
    echo "Testing..."
    if surge whoami 2>/dev/null | grep -q "@"; then
        echo "Authenticated as: $(surge whoami)"
        exit 0
    else
        echo "Token appears invalid. Please re-run 'surge token' locally."
        exit 1
    fi
fi

echo "Surge requires authentication."
echo ""
echo "Since interactive login doesn't work in CC Web, you need to:"
echo ""
echo "1. On your LOCAL machine (not CC Web), run:"
echo "   npm install -g surge"
echo "   surge login"
echo "   surge token"
echo ""
echo "2. Copy the token and email, then set in CC Web:"
echo "   export SURGE_LOGIN='your-email@example.com'"
echo "   export SURGE_TOKEN='paste-token-here'"
echo ""
echo "3. Then run ./deploy.sh"
echo ""
echo "Alternatively, if you have a surge account, you can set"
echo "SURGE_LOGIN and SURGE_TOKEN as GitHub Secrets and use"
echo "them in your CC Web session."
