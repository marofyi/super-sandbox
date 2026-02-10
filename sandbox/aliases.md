# Shell Aliases for Super Sandbox

Recommended aliases for your `~/.zshrc` or `~/.bashrc`.

## Claude Code

```bash
# Claude Code with Chrome and permissions skipped
alias cc="claude --dangerously-skip-permissions --chrome"
```

## Sandbox

```bash
# Run Claude Code in OrbStack sandbox
alias cc-sandbox="orb run sandbox -- claude --dangerously-skip-permissions --chrome"

# Run Claude Code in Docker sandbox
alias cc-docker="docker exec -it claude-sandbox claude --dangerously-skip-permissions --chrome"
```

## Browser Automation

```bash
# Start Chrome with debug port for DevTools MCP
alias chrome-debug="/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222"

# Start Chrome with debug port (headless)
alias chrome-headless="/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --headless --remote-debugging-port=9222"
```

## Environment Variables

```bash
# Gemini API key for Nanobanana
export GEMINI_API_KEY="your-key-here"

# Use Gemini 3 Pro for higher quality images
export NANOBANANA_MODEL="gemini-3-pro-image-preview"
```

## Complete Setup

Add all of these to your shell config:

```bash
# ~/.zshrc or ~/.bashrc

# Claude Code
alias cc="claude --dangerously-skip-permissions --chrome"
alias cc-sandbox="orb run sandbox -- claude --dangerously-skip-permissions --chrome"

# Browser
alias chrome-debug="/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222"

# Environment
export GEMINI_API_KEY="your-key-here"
```

Then reload:

```bash
source ~/.zshrc
```

---

[Back to README](../README.md) | [SETUP.md](../SETUP.md)
