<div align="center">
  <img src="./logo.png" alt="Super Sandbox Logo" width="180" />
  <h1>Super Sandbox</h1>
  <p>
    <strong>Give cloud AI agents superpowers.</strong><br>
    Break free from sandbox limitations. Build, test, and deploy full-stack applications<br>
    directly with Claude Code Web, OpenAI Codex, and Gemini CLI.
  </p>
</div>

---

## Quick Start (Cloud)

**No terminal required.** Get started directly in your browser.

### Step 1: Create Your Copy

1. Click the green **"Use this template"** button at the top of this repo
2. Select **"Create a new repository"**
3. Name your repo and click **Create repository**

> **Important:** This is a template repository. You must create your own copy before connecting it to any AI agent.

### Step 2: Get Your Tokens

Before connecting, create these tokens:

| Token | Where to Get It |
|-------|-----------------|
| `GH_TOKEN` | [Fine-grained token](https://github.com/settings/personal-access-tokens/new) with **Actions: Read & Write** permission |
| `BROWSERLESS_TOKEN` | [browserless.io](https://browserless.io) — Free tier available |
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) — Required for deployments |

### Step 3: Connect to Your AI Agent

#### Claude Code Web

1. Go to [claude.ai/code](https://claude.ai/code) (requires Claude Pro/Max)
2. Click **Connect Repository** and authorize GitHub
3. Select **your new repository** (the copy you just created)
4. Add environment variables in session settings: `GH_TOKEN`, `BROWSERLESS_TOKEN`, `VERCEL_TOKEN`
5. Start coding!

> **Tip:** The repo includes `.claude/settings.json` that auto-configures tools on session start.

#### OpenAI Codex

1. Go to [chatgpt.com/codex](https://chatgpt.com/codex) (requires ChatGPT Plus/Pro/Enterprise)
2. Click **Connect GitHub** and authorize access
3. Go to [Environment Settings](https://chatgpt.com/codex/settings/environments):
   - Select **your new repository**
   - Enable **internet access** for deployments
4. Add environment variables: `GH_TOKEN`, `BROWSERLESS_TOKEN`, `VERCEL_TOKEN`
5. Start a task!

---

## Why Super Sandbox?

Cloud AI agents are powerful but often trapped in restrictive sandboxes. **Super Sandbox** provides the missing bridge:

| Problem | Solution |
|---------|----------|
| No Browser Automation Tools | HTTP-based browser automation via [Browserless](./browserless/) |
| No deployment access | Direct Vercel deploys with a [vercel skill](./skills/vercel/) |
| Tools not installed | Auto-setup hooks for CC Web, on-demand for Codex |
| Context gets lost | `AGENTS.md` provides persistent instructions |

Works seamlessly with **Claude Code Web**, **OpenAI Codex**, and other cloud based AI agents.

---

## Why Browserless?

Browser automation is the missing piece that turns AI code generation into **true agentic development**.

Without it, AI agents are flying blind:
1. Agent writes code
2. Agent deploys to Vercel
3. **Agent has no idea if it actually works** — layout broken? Button not visible? Console errors?

With Browserless, agents can close the loop:
1. Agent writes code
2. Agent deploys to Vercel
3. **Agent screenshots the result and evaluates it**
4. Agent fixes issues and iterates autonomously

This self-verification loop is what separates "AI that generates code" from "AI that builds working software."

**Why HTTP-based?** Cloud sandboxes (CC Web, Codex) block WebSocket connections, which breaks Playwright and Puppeteer based cloud solutions. Browserless is the only provider that offers pure HTTP requests through BrowserQL, so it works everywhere.

---

## Skills & Tools

Your agent comes equipped with specialized skills:

| Skill | Description |
|-------|-------------|
| **[vercel](./skills/vercel/)** | Deploy static sites or full apps in ~10s |
| **[create-project](./skills/create-project/)** | Scaffold React, Next.js, or static html projects |
| **[browserless](./browserless/)** | Control browsers via HTTP (works in sandboxes) |
| **[frontend-design](./skills/frontend-design/)** | Generate polished, distinctive UI designs |
| **[update](./skills/update/)** | Sync your super sandbox template copy with upstream improvements |

---

## Project Structure

```
super-sandbox/
├── .claude/                   # CC Web session hooks & configuration
├── browserless/               # HTTP-only browser automation package
├── docs/                      # Comprehensive guides & documentation
├── projects/                  # YOUR WORK GOES HERE
│   └── examples/              # Reference implementations
│       ├── static-html/       # Simple CDN-based dev
│       ├── react-cdn/         # React 19 via CDN
│       └── next-app/          # Next.js Full Stack
├── skills/                    # Agent capability definitions
├── AGENTS.md                  # Core instructions for AI agents
└── README.md                  # This file
```

---

## Local Terminal Setup (Optional)

If you prefer running Claude Code CLI locally or need features unavailable in cloud environments:

### Prerequisites

- Node.js 18+ and pnpm
- Claude Code CLI: `npm install -g @anthropic-ai/claude-code`
- Or Codex CLI: `npm install -g @openai/codex`

### Installation

```bash
# 1. Create your repo from template (use GitHub's "Use this template" button)
#    Then clone your new repo:
git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
cd YOUR-REPO-NAME

# 2. Install dependencies (for browserless)
cd browserless && pnpm install && pnpm build && cd ..

# 3. Set environment variables
export GH_TOKEN="your-github-token"
export BROWSERLESS_TOKEN="your-browserless-token"
export VERCEL_TOKEN="your-vercel-token"

# 4. Start Claude Code
claude
```

---

## Documentation

- **[AGENTS.md](./AGENTS.md)** — Instructions for AI agents
- **[Cloud Environments](./docs/cloud-environments.md)** — Detailed cloud setup
- **[Browserless Guide](./docs/browserless.md)** — Browser automation deep dive
- **[Static HTML Patterns](./docs/static-html-guide.md)** — Rapid prototyping guide
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — Contribution guidelines

---

## Updates

Keep your sandbox fresh without losing your work:

> "Check for Super Sandbox updates"

The `update` skill intelligently merges upstream changes while preserving your `projects/` and configurations.

---

<div align="center">
  <p>MIT License</p>
</div>
