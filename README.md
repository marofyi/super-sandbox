<div align="center">
  <img src="./logo.png" alt="Super Sandbox Logo" width="180" />
  <h1>Super Sandbox</h1>
  <p>
    <strong>Give cloud AI agents superpowers.</strong><br>
    Break free from sandbox limitations. Build, test, and deploy full-stack applications<br>
    directly with Claude Code, OpenAI Codex, and Gemini CLI.
  </p>
</div>

---

## ⚡️ Quick Start

Get up and running in seconds.

```bash
# Clone the template
npx tiged your-username/super-sandbox my-project
cd my-project
```

That's it. You are ready to:
- 🏗️ **Scaffold** projects in `projects/`
- 🚀 **Deploy** instantly with the [Vercel skill](./skills/vercel/)
- 🤖 **Automate** browsers with [Browserless](./browserless/)

## 🌟 Why Super Sandbox?

Cloud AI agents are powerful but often trapped in restrictive sandboxes. **Super Sandbox** provides the missing bridge:

- **Bypass Restrictions**: HTTP-only browser automation where WebSockets fail.
- **Full-Stack Capable**: From static HTML to Next.js 16 with App Router.
- **Universal Support**: Works seamlessly with **Claude Code Web**, **OpenAI Codex**, and **Gemini CLI**.

## ☁️ Cloud Environment Support

| Environment | Setup | Config |
|-------------|-------|--------|
| **Claude Code Web** | ✅ Auto-configured | `.claude/settings.json` |
| **OpenAI Codex** | 🛠️ On-demand | [skills/codex-setup/](./skills/codex-setup/) |
| **Gemini CLI** | ⚡️ Native | No setup needed |

👉 See [Cloud Environments Guide](./docs/cloud-environments.md) for details.

## 🧰 Skills & Tools

Your agent comes equipped with specialized skills:

| Skill | Description |
|-------|-------------|
| **[vercel](./skills/vercel/)** | 🚀 Deploy static sites or full apps in ~10s |
| **[create-project](./skills/create-project/)** | 🏗️ Scaffold React, Next.js, or static projects |
| **[browserless](./browserless/)** | 🌐 Control browsers via HTTP (perfect for sandboxes) |
| **[frontend-design](./skills/frontend-design/)** | 🎨 Generate polished, distinctive UI designs |
| **[update](./skills/update/)** | 🔄 Sync your sandbox with upstream improvements |

## 📂 Project Structure

```
super-sandbox/
├── .claude/                   # CC Web session hooks & configuration
├── browserless/               # HTTP-only browser automation package
├── docs/                      # Comprehensive guides & documentation
├── projects/                  # 🟢 YOUR WORK GOES HERE
│   └── examples/              # Reference implementations
│       ├── static-html/       # Simple CDN-based dev
│       ├── react-cdn/         # React 19 via CDN
│       └── next-app/          # Next.js 16 Full Stack
├── skills/                    # Agent capability definitions
├── AGENTS.md                  # Core instructions for AI agents
└── README.md                  # This file
```

## 📸 Browserless Automation

Standard browser tools (Playwright/Puppeteer) often fail in cloud sandboxes due to blocked WebSockets. We use **HTTP-based automation** via [Browserless](https://browserless.io).

```typescript
import { goto, screenshot } from '@super-sandbox/browserless';

// Works where others fail
await goto('https://example.com');
const img = await screenshot();
```

**CLI Usage:**
```bash
./browserless/scripts/screenshot.sh https://example.com --responsive
```

## 🛠️ Configuration

| Variable | Required | Purpose |
|----------|:--------:|---------|
| `GH_TOKEN` | ✅ | GitHub PAT (repo scope) for git ops |
| `BROWSERLESS_TOKEN` | ✅ | Free token from browserless.io for automation |
| `VERCEL_TOKEN` | ⚪️ | Optional: For direct Vercel deployments |

## 📚 Documentation

- **[AGENTS.md](./AGENTS.md)**: The "brain" of the operation.
- **[Browserless Guide](./docs/browserless.md)**: Deep dive into automation.
- **[Static HTML Patterns](./docs/static-html-guide.md)**: Rapid prototyping guide.
- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: Join the effort.

## 🔄 Updates

Keep your sandbox fresh without losing your work:
> "Check for Super Sandbox updates"

The `update` skill intelligently merges upstream changes while preserving your `projects/` and configurations.

---

<div align="center">
  <p>MIT License</p>
</div>