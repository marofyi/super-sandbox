# Research

Lean monorepo for rapid prototypes and deployments, designed for Claude Code Web with a minimal token surface and Browserless-powered visual QA.

## Getting Started

```bash
# Install dependencies
pnpm install

# Type-check all packages
pnpm check
```

## Structure

```
research/
├── index.html                 # Landing page (updated by update-index.yml)
├── packages/
│   └── browserless/           # BrowserQL HTTP client + screenshot CLI
├── projects/
│   └── the-intelligence-economy/ # Static visualization
├── skills/
│   └── vercel/                # Vercel deployment skill
├── docs/                      # Deep-dive guides
├── .github/workflows/         # update-index, update-docs
├── .claude/                   # CC Web session hooks
├── AGENTS.md                  # AI agent instructions
└── CONTRIBUTING.md            # Code style and git workflow
```

## Shared Package

### @research/browserless

Browser automation client for [Browserless](https://browserless.io) BrowserQL over pure HTTP (works in CC Web). Includes helpers for navigation, form interaction, scraping, single-session GraphQL flows, and responsive screenshot capture via `captureResponsiveScreenshots`/`captureAtViewport` plus a CLI (`pnpm --filter @research/browserless screenshot <url>`). Uses an `undici` ProxyAgent when `HTTPS_PROXY` is set and defaults to Chrome BQL with a 60-second timeout. Requires `BROWSERLESS_TOKEN` and optional `BROWSERLESS_URL`.

## Environment Setup

- `GH_TOKEN` — PAT with `repo` scope for workflow dispatch from CC Web.
- `BROWSERLESS_TOKEN` — Free Browserless token for automation and screenshots.
- `VERCEL_TOKEN` — Optional. Enables direct deploys via the [vercel skill](./skills/vercel/).

See `docs/cc-web.md` for the token architecture and network constraints.

## Projects

### the-intelligence-economy

Static visualization exploring LLM-driven shifts in the web economy, covering value flow, stakeholder health, and timelines of key events. Built as a standalone HTML experience for fast sharing and lightweight hosting.

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

See [skills/vercel/SKILL.md](./skills/vercel/SKILL.md) for full documentation.

## Browserless Screenshots

Capture screenshots with the Browserless CLI (requires `BROWSERLESS_TOKEN`):

```bash
# Single desktop screenshot
pnpm --filter @research/browserless screenshot https://your-app.com

# Responsive screenshots (all default viewports)
pnpm --filter @research/browserless screenshot https://your-app.com --responsive
```

## Documentation

Start here for navigation. README is the homepage for humans; AGENTS is the homepage for AI agents. Each deep-dive doc links back and sideways to related guides.

| Document | Description |
|----------|-------------|
| [AGENTS.md](./AGENTS.md) | Instructions for AI coding agents |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Code style and git workflow |
| [CHANGELOG.md](./CHANGELOG.md) | Notable changes, releases, and discoveries |
| [docs/browserless.md](./docs/browserless.md) | Browserless browser automation guide |
| [docs/cc-web.md](./docs/cc-web.md) | Claude Code Web guide (setup, network, tokens) |
| [docs/static-html-guide.md](./docs/static-html-guide.md) | Single-file prototype best practices |
| [skills/vercel/SKILL.md](./skills/vercel/SKILL.md) | Vercel deployment skill |
