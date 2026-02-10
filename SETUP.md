# Super Sandbox Setup

> **For AI Agents**: Read this file and guide the user through setup step-by-step.

## Overview

You are helping a user install Super Sandbox - a starter kit for agentic coding with Claude Code. The setup includes:

1. **Skills** - Document handling, frontend design, deployment
2. **MCP Servers** - Image generation, documentation lookup, Jira & Confluence
3. **Statusline** - Custom terminal status display
4. **Aliases** - Shell shortcuts for common commands
5. **Sandbox** (optional) - Isolated execution environment

## Setup Instructions

Work through each step, confirming with the user before proceeding.

---

### Step 1: Skills Installation

**What**: Install official Anthropic skills and the custom Vercel skill.

#### 1a. Official Skills (via plugin system)

Run these commands inside Claude Code:

```
/plugin marketplace add anthropics/skills
/plugin install document-skills@anthropic-agent-skills
/plugin install example-skills@anthropic-agent-skills
```

This installs `xlsx`, `pdf`, `pptx`, `docx`, `doc-coauthoring`, `frontend-design`, and more. See [anthropics/skills](https://github.com/anthropics/skills) for the full list.

#### 1b. Custom Vercel Skill

This repo includes a custom `vercel` deployment skill in `skills/vercel/`. To use it, copy it to your Claude Code skills directory:

```bash
cp -R path/to/super-sandbox/skills/vercel ~/.claude/skills/vercel
```

**Verify**: Run `/skills` to confirm skills are listed.

---

### Step 2: MCP Servers (Choose What You Need)

Ask the user which MCP servers they want to install.

#### 2a. Nanobanana (Image Generation)

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
        "GEMINI_API_KEY": "your-key-here"
      }
    }
  }
}
```

#### 2b. Context7 (Documentation Lookup)

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

#### 2c. Atlassian (Jira & Confluence)

**Requires**: Atlassian API token and Node.js 18+

1. Generate API token at [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Create credential file `~/.claude/atlassian.json`:

```json
{
  "email": "your.email@company.com",
  "apiToken": "your-token-here",
  "baseUrl": "https://yourcompany.atlassian.net"
}
```

3. Build the server:

```bash
cd path/to/super-sandbox/mcp/atlassian
pnpm install && pnpm run build
```

4. Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "atlassian": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/path/to/super-sandbox/mcp/atlassian/dist/mcp-server.js",
        "--jira-project-key", "YOUR_PROJECT",
        "--confluence-space-key", "YOUR_SPACE"
      ]
    }
  }
}
```

See [mcp/atlassian/README.md](mcp/atlassian/README.md) for all CLI flags and available tools.

---

### Step 3: Claude-in-Chrome (Recommended)

**What**: Browser automation extension for local development.

**Setup**:
1. Install from [Chrome Web Store](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn)
2. Sign in with Claude account
3. Test with `claude --chrome` or `/chrome` command

**Note**: Requires direct Anthropic plan (Pro/Max/Team/Enterprise).

---

### Step 4: Statusline (Optional)

**What**: Custom terminal status showing git branch and context usage.

**Action**:
```bash
cp path/to/super-sandbox/statusline/statusline.sh ~/.claude/
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

### Step 5: Aliases

**What**: Shell shortcut for launching Claude Code.

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
alias cc="claude --dangerously-skip-permissions --chrome"
```

Then reload: `source ~/.zshrc`

See [sandbox/aliases.md](sandbox/aliases.md) for more aliases (sandbox, browser debugging, etc.).

---

### Step 6: Sandbox (Optional)

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

1. **Skills**: Run `/skills` and check skills are listed
2. **MCP**: Run `/mcp` to see registered servers
3. **Chrome**: Run `/chrome` to check extension connection

---

## Quick Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| Skills | `~/.claude/skills/` | Extended capabilities |
| Statusline | `~/.claude/statusline.sh` | Terminal status |
| Settings | `~/.claude/settings.json` | All configuration |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Skills not appearing | Restart Claude Code |
| MCP server fails | Check API keys, run `npx` manually to debug |

---

## Next Steps

After setup:
1. Read `AGENTS.md` for workflow guidelines
2. Start coding with `claude --chrome`
