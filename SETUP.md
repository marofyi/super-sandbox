# Super Sandbox Setup

> **For AI Agents**: Read this file and guide the user through setup step-by-step.

## Overview

You are helping a user install Super Sandbox - a starter kit for agentic coding with Claude Code. The setup includes:

1. **Skills** - Document handling, frontend design, deployment
2. **Hooks** - Security protections (.env files, iCloud)
3. **MCP Servers** - Image generation, documentation lookup, browser automation
4. **Statusline** - Custom terminal status display
5. **AWB** - Agent Workbench for worktree management
6. **Sandbox** (optional) - Isolated execution environment

## Setup Instructions

Work through each step, confirming with the user before proceeding.

---

### Step 1: Skills Installation

**What**: Copy skills to the user's Claude Code installation.

**Skills included**:
- `xlsx` - Spreadsheet creation and analysis
- `pdf` - PDF manipulation and form filling
- `pptx` - Presentation creation
- `docx` - Document creation with tracked changes
- `doc-coauthoring` - Structured documentation workflow
- `frontend-design` - Distinctive UI design
- `vercel` - Deployment automation

**Action**:
```bash
# Create skills directory if needed
mkdir -p ~/.claude/skills

# Copy skills (adjust source path as needed)
cp -R /path/to/super-sandbox/skills/* ~/.claude/skills/
```

**Verify**: Run `ls ~/.claude/skills/` to confirm all 7 skills are present.

---

### Step 2: Hooks Configuration

**What**: Add security hooks to protect sensitive files.

**Hooks included**:
- `protect-icloud.py` - Blocks access to iCloud Drive
- `block-env-read.sh` - Prevents reading .env files

**Action**:
```bash
# Create hooks directory if needed
mkdir -p ~/.claude/hooks

# Copy hooks
cp /path/to/super-sandbox/hooks/* ~/.claude/hooks/
chmod +x ~/.claude/hooks/*
```

**Then merge into `~/.claude/settings.json`**:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Read|Glob|Grep|Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/protect-icloud.py"
          }
        ]
      },
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/block-env-read.sh"
          }
        ]
      }
    ]
  }
}
```

**Important**: Merge with existing settings, don't replace the entire file.

---

### Step 3: MCP Servers (Choose What You Need)

Ask the user which MCP servers they want to install.

#### 3a. Nanobanana (Image Generation)

**Requires**: Google Gemini API key (free)

1. Guide user to get API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "nanobanana": {
      "command": "npx",
      "args": ["-y", "github:gemini-cli-extensions/nanobanana/mcp-server"],
      "env": {
        "GEMINI_API_KEY": "USER_KEY_HERE"
      }
    }
  }
}
```

#### 3b. Context7 (Documentation Lookup)

**Requires**: Nothing (optional API key for heavy usage)

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

#### 3c. Chrome DevTools (Browser Automation for SSH)

**Requires**: Chrome with debug port enabled

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--no-usage-statistics"]
    }
  }
}
```

See `mcp/chrome-devtools.md` for usage instructions.

---

### Step 4: Claude-in-Chrome (Recommended)

**What**: Browser automation extension for local development.

**Setup**:
1. Install from [Chrome Web Store](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn)
2. Sign in with Claude account
3. Test with `claude --chrome` or `/chrome` command

**Note**: Requires direct Anthropic plan (Pro/Max/Team/Enterprise).

---

### Step 5: AWB - Agent Workbench (Optional)

**What**: Interactive git worktree manager for parallel Claude sessions.

**Requires**: `fzf` installed

**Action**:
```bash
# Install fzf if needed
brew install fzf

# Copy AWB script
cp /path/to/super-sandbox/awb/awb ~/.local/bin/
chmod +x ~/.local/bin/awb

# Add to PATH if needed
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
```

**Usage**: Run `awb` in any git repository.

---

### Step 6: Statusline (Optional)

**What**: Custom terminal status showing git branch, dev port, context usage.

**Action**:
```bash
cp /path/to/super-sandbox/statusline/statusline.sh ~/.claude/
chmod +x ~/.claude/statusline.sh
```

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh"
  }
}
```

---

### Step 7: Sandbox (Optional)

**What**: Run Claude Code in isolated Linux VM.

**Why**: Safe to run with `--dangerously-skip-permissions`.

**Quick Setup**:
```bash
# Install OrbStack
brew install orbstack

# Create sandbox VM
orb create ubuntu sandbox

# Install Claude Code in sandbox
orb run sandbox -- bash -c 'curl -fsSL https://claude.ai/install.sh | bash'

# Authenticate
orb run sandbox -- claude auth login

# Create alias
echo 'alias cc-sandbox="orb run sandbox -- claude --dangerously-skip-permissions"' >> ~/.zshrc
```

See `sandbox/orbstack-setup.md` for full instructions.

---

## Verification

After setup, verify everything works:

1. **Skills**: Run `/help` and check skills are listed
2. **Hooks**: Try to read a .env file - should be blocked
3. **MCP**: Run `/mcp` to see registered servers
4. **Chrome**: Run `/chrome` to check extension connection
5. **AWB**: Run `awb` in a git repo

---

## Quick Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| Skills | `~/.claude/skills/` | Extended capabilities |
| Hooks | `~/.claude/hooks/` | Security protections |
| Statusline | `~/.claude/statusline.sh` | Terminal status |
| AWB | `~/.local/bin/awb` | Worktree management |
| Settings | `~/.claude/settings.json` | All configuration |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Skills not appearing | Restart Claude Code |
| Hooks not running | Check file permissions (`chmod +x`) |
| MCP server fails | Check API keys, run `npx` manually to debug |
| AWB not found | Add `~/.local/bin` to PATH |

---

## Next Steps

After setup:
1. Read `AGENTS.md` for workflow guidelines
2. Explore `docs/` for detailed guides
3. Start coding with `claude --chrome` or `awb`
