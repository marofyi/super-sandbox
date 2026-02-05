# Shell Aliases for Super Sandbox

Recommended aliases for your `~/.zshrc` or `~/.bashrc`.

## Basic Claude Code Aliases

```bash
# Claude Code with Chrome integration
alias cc="claude --chrome"

# Claude Code with permissions skipped (use in sandbox only!)
alias cc-yolo="claude --dangerously-skip-permissions"

# Claude Code with Chrome and permissions skipped
alias cc-full="claude --dangerously-skip-permissions --chrome"
```

## Sandbox Aliases

```bash
# Run Claude Code in OrbStack sandbox
alias cc-sandbox="orb run sandbox -- claude --dangerously-skip-permissions"

# Run Claude Code in Docker sandbox
alias cc-docker="docker exec -it claude-sandbox claude --dangerously-skip-permissions"
```

## AWB (Agent Workbench) Aliases

```bash
# Standard AWB
alias awb="~/.local/bin/awb"

# AWB with quick new worktree
alias awbn="awb --new"

# AWB in current directory (no worktree)
alias awbh="awb --here"

# AWB using sandbox
alias awb-sandbox="CLAUDE_BIN='orb run sandbox -- claude' awb"
```

## Codex Aliases

```bash
# OpenAI Codex CLI
alias cx="codex --dangerously-bypass-approvals-and-sandbox --search"
```

## Browser Automation

```bash
# Start Chrome with debug port for DevTools MCP
alias chrome-debug="/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222"

# Start Chrome with debug port (headless)
alias chrome-headless="/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --headless --remote-debugging-port=9222"
```

## Project Shortcuts

```bash
# Quick project navigation
alias dev="cd ~/local-dev"

# Start dev server with port tracking
dev-start() {
  PORT=$((3000 + $(echo $PWD | cksum | cut -d' ' -f1) % 100))
  mkdir -p .claude
  echo $PORT > .claude/.dev-port
  echo "Starting on port $PORT"
  npm run dev -- --port $PORT
}
```

## Environment Variables

```bash
# Gemini API key for Nanobanana
export GEMINI_API_KEY="your-key-here"

# Use Gemini 3 Pro for higher quality images
export NANOBANANA_MODEL="gemini-3-pro-image-preview"

# Custom Claude binary location (for AWB)
export CLAUDE_BIN="claude"  # or path to custom binary
```

## Complete Setup

Add all of these to your shell config:

```bash
# ~/.zshrc or ~/.bashrc

# Claude Code
alias cc="claude --chrome"
alias cc-yolo="claude --dangerously-skip-permissions"
alias cc-sandbox="orb run sandbox -- claude --dangerously-skip-permissions"

# AWB
alias awb="~/.local/bin/awb"
alias awbn="awb --new"
alias awbh="awb --here"

# Browser
alias chrome-debug="/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222"

# Environment
export GEMINI_API_KEY="your-key-here"
```

Then reload:

```bash
source ~/.zshrc
```
