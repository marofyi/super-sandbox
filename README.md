<div align="center">
  <img src="./logo.png" alt="Super Sandbox Logo" width="180" />
  <h1>Super Sandbox</h1>
  <p>
    <strong>A starter kit for agentic coding with Claude Code.</strong><br>
    Battle-tested workflows, skills, hooks, and tools to supercharge your AI coding sessions.
  </p>
</div>

---

## Quick Start

**Point your AI agent at the setup guide:**

```
Read https://raw.githubusercontent.com/YOUR_USERNAME/super-sandbox/main/SETUP.md and help me set up Super Sandbox
```

Or clone locally:

```bash
git clone https://github.com/YOUR_USERNAME/super-sandbox.git
cd super-sandbox
claude "Read SETUP.md and help me set up Super Sandbox"
```

The agent will guide you through installing skills, hooks, MCP servers, and tools.

---

## What's Included

### Skills

| Skill | Purpose |
|-------|---------|
| `xlsx` | Spreadsheet creation and analysis |
| `pdf` | PDF manipulation and form filling |
| `pptx` | Presentation creation |
| `docx` | Document creation with tracked changes |
| `doc-coauthoring` | Structured documentation workflow |
| `frontend-design` | Distinctive, production-grade UI |
| `vercel` | Deployment automation |

### Security Hooks

| Hook | Protection |
|------|------------|
| `protect-icloud.py` | Blocks all access to iCloud Drive |
| `block-env-read.sh` | Prevents reading .env files |

### MCP Servers

| Server | Capabilities |
|--------|--------------|
| [Nanobanana](mcp/nanobanana.md) | Image generation, editing, diagrams (7 tools) |
| [Context7](mcp/context7.md) | Documentation lookup for any library |
| [Chrome DevTools](mcp/chrome-devtools.md) | Browser automation for SSH/headless |

### Tools

| Tool | Purpose |
|------|---------|
| [AWB](awb/) | Git worktree management for parallel sessions |
| [Statusline](statusline/) | Terminal status with branch, port, context |
| [Claude-in-Chrome](browser/claude-in-chrome.md) | Browser automation extension |

### Sandbox (Optional)

Run Claude Code in an isolated environment:
- [OrbStack Setup](sandbox/orbstack-setup.md) - macOS VM
- [Shell Aliases](sandbox/aliases.md) - Useful shortcuts

---

## Documentation

| Document | Purpose |
|----------|---------|
| [SETUP.md](SETUP.md) | **Start here** - Agent-guided installation |
| [AGENTS.md](AGENTS.md) | Agent behavior guidelines |
| [mcp/](mcp/) | MCP server setup guides |
| [browser/](browser/) | Browser automation setup |
| [sandbox/](sandbox/) | Isolated environment setup |
| [docs/](docs/) | Additional guides |

---

## Requirements

- Claude Code CLI v2.0.73+
- Direct Anthropic plan (Pro/Max/Team/Enterprise)
- macOS, Linux, or Windows
- Node.js 18+ (for MCP servers)

---

## Philosophy

Super Sandbox is built on these principles:

1. **Research first** - Don't trust training data alone
2. **Plan before build** - Propose, get approval, then implement
3. **Test your work** - Verify manually at minimum
4. **Ask when uncertain** - Stop and clarify

See [AGENTS.md](AGENTS.md) for detailed workflow guidelines.

---

## Project Structure

```
super-sandbox/
├── SETUP.md              # Agent-guided installation
├── AGENTS.md             # Agent behavior rules
├── skills/               # Extended capabilities
│   ├── xlsx/
│   ├── pdf/
│   ├── pptx/
│   ├── docx/
│   ├── doc-coauthoring/
│   ├── frontend-design/
│   └── vercel/
├── hooks/                # Security protections
├── mcp/                  # MCP server guides
├── browser/              # Browser automation guides
├── sandbox/              # Isolated environment guides
├── awb/                  # Agent Workbench
├── statusline/           # Custom terminal status
├── docs/                 # Additional documentation
└── projects/             # Your work goes here
```

---

<div align="center">
  <p>MIT License</p>
</div>
