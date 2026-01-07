# Super Sandbox

Give cloud AI agents superpowers. Work around sandbox limitations to enable rapid development and deployment—from static HTML to full-stack web apps—using cloud agents like Claude Code Web, OpenAI Codex, and Gemini CLI Agent Mode.

## Quick Start

```bash
# Clone the template
npx tiged your-username/super-sandbox my-project
cd my-project

# Install dependencies
pnpm install

# Type-check
pnpm check
```

## Cloud Environment Support

| Environment | Setup Method | Config Location |
|-------------|--------------|-----------------|
| **Claude Code Web** | Auto (SessionStart hook) | `.claude/settings.json` |
| **OpenAI Codex** | Manual (copy script) | `scripts/codex-setup.sh` |
| **Gemini CLI** | Native AGENTS.md | No setup needed |

See [docs/cloud-environments.md](./docs/cloud-environments.md) for detailed setup instructions.

## Structure

```
super-sandbox/
├── .claude/                   # CC Web session hooks
│   ├── settings.json          # SessionStart hook config
│   └── scripts/
│       └── setup-web-session.sh
├── .github/workflows/         # CI and doc automation
├── docs/                      # Deep-dive guides
├── projects/                  # Your projects live here
│   ├── static-html/           # Single HTML file example
│   ├── react-cdn/             # React via CDN (no build)
│   └── next-app/              # Full Next.js application
├── scripts/
│   └── codex-setup.sh         # Codex environment setup
├── skills/                    # Agent skills
│   ├── browserless/           # HTTP-only browser automation
│   ├── vercel/                # Deploy to Vercel
│   ├── create-project/        # Scaffold new project
│   ├── update/                # Sync from upstream template
│   └── frontend-design/       # Distinctive UI design
├── AGENTS.md                  # AI agent instructions
├── CLAUDE.md                  # Points to AGENTS.md
├── README.md                  # You are here
├── LICENSE                    # MIT
└── package.json
```

## Skills

| Skill | Purpose |
|-------|---------|
| [browserless](./skills/browserless/) | HTTP-only browser automation (screenshots, scraping) |
| [vercel](./skills/vercel/) | Deploy static HTML or full apps to Vercel |
| [create-project](./skills/create-project/) | Scaffold project (static/react/nextjs) |
| [update](./skills/update/) | Sync from upstream Super Sandbox template |
| [frontend-design](./skills/frontend-design/) | Create distinctive, polished UI |

### Browserless

HTTP-only browser automation using [Browserless](https://browserless.io) BrowserQL. Works in CC Web and other sandboxed environments where WebSocket-based tools (Playwright, Puppeteer) are blocked.

```typescript
import { goto, screenshot } from '@super-sandbox/browserless';

await goto('https://example.com');
const img = await screenshot();
```

**CLI:**
```bash
# Single screenshot
./skills/browserless/scripts/screenshot.sh https://example.com

# Responsive screenshots (all viewports)
./skills/browserless/scripts/screenshot.sh https://example.com --responsive
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GH_TOKEN` | Yes | GitHub PAT with `repo` scope |
| `BROWSERLESS_TOKEN` | Yes | Free token from browserless.io |
| `VERCEL_TOKEN` | No | Enables direct Vercel deploys |

## Projects

### static-html

Single HTML file demonstrating CDN-based development. No build step required.

### react-cdn

React 19 application via CDN with Tailwind CSS. Opens directly in browser—no build tools needed.

### next-app

Full Next.js 16 application with App Router, TypeScript, and Tailwind CSS v4.

## Documentation

| Document | Description |
|----------|-------------|
| [AGENTS.md](./AGENTS.md) | Instructions for AI coding agents |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Code style and git workflow |
| [CHANGELOG.md](./CHANGELOG.md) | Notable changes and releases |
| [docs/browserless.md](./docs/browserless.md) | Browser automation guide |
| [docs/cloud-environments.md](./docs/cloud-environments.md) | CC Web, Codex, Gemini setup |
| [docs/static-html-guide.md](./docs/static-html-guide.md) | Single-file prototype patterns |

## Deployment

Use the [vercel skill](./skills/vercel/) for fast (~10s) deployments:

```bash
# First-time setup
./skills/vercel/scripts/setup.sh projects/my-app

# Deploy updates
./skills/vercel/scripts/push.sh projects/my-app

# List all projects
./skills/vercel/scripts/list.sh
```

## Template Updates

To get updates from the upstream Super Sandbox template:

```
Ask your agent: "Check for Super Sandbox updates"
```

The `update` skill fetches upstream changes while preserving your projects, local configs, and custom AGENTS.md sections.

## License

MIT
