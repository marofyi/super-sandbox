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
│   ├── live-preview-test/     # Encrypted preview utility for CC Web
│   └── the-intelligence-economy/ # Static visualization
├── docs/                      # Deep-dive guides
├── .github/workflows/         # update-index, update-docs, vercel-setup, vercel-deploy
├── .claude/                   # CC Web session hooks + security guardrails
├── AGENTS.md                  # AI agent instructions
└── CONTRIBUTING.md            # Code style and git workflow
```

## Shared Package

### @research/browserless

Browser automation client for [Browserless](https://browserless.io) BrowserQL over pure HTTP (works in CC Web). Includes helpers for navigation, form interaction, scraping, single-session GraphQL flows, and responsive screenshot capture via `captureResponsiveScreenshots`/`captureAtViewport` plus a CLI (`pnpm --filter @research/browserless screenshot <url>`). Uses an `undici` ProxyAgent when `HTTPS_PROXY` is set and defaults to Chrome BQL with a 60-second timeout. Requires `BROWSERLESS_TOKEN` and optional `BROWSERLESS_URL`.

## Environment Setup

- `GH_TOKEN` — Actions-only PAT scoped to this repo; used to dispatch workflows from CC Web. Do **not** add broader scopes.
- `BROWSERLESS_TOKEN` — Free Browserless token for automation and screenshots.
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_<NAME>` — Add as GitHub Actions secrets only; they are not needed in the CC Web environment.

`.env.example` documents the minimal tokens; keep CC Web shells free of deployment secrets. No PreToolUse security hook is active—avoid env dumps or token prints. See `docs/cc-web.md` for the token architecture and network constraints.

## Projects

### live-preview-test

Encrypted preview system for Claude Code Web. Push encrypted content to a GitHub Gist with AES-256-GCM (PBKDF2 key derivation) and view via a self-contained HTML viewer (`viewer-v6.html` or data URL). Scripts `update-preview-encrypted.sh` and `make-data-url.sh` handle encryption and data URL generation for sandboxed previews.

### the-intelligence-economy

Static visualization exploring LLM-driven shifts in the web economy, covering value flow, stakeholder health, and timelines of key events. Built as a standalone HTML experience for fast sharing and lightweight hosting.

## Deployment

Vercel deployments are workflow-driven—tokens stay in GitHub Secrets and never enter CC Web.

- **Setup new project:** `gh workflow run vercel-setup -f project_name=my-app -f project_path=projects/my-app` (or dispatch via Actions UI). The workflow returns the project ID to store as `VERCEL_PROJECT_ID_MY_APP`.
- **Manual deploy:** `gh workflow run vercel-deploy -f project_name=my-app -f project_id_secret=VERCEL_PROJECT_ID_MY_APP`.
- **Auto-deploy:** Add a per-project workflow (see `docs/vercel-deployment.md` template) that watches `projects/<name>/**` and `pnpm-lock.yaml`.

See [docs/vercel-deployment.md](docs/vercel-deployment.md) for the architecture, required secrets, and workflow inputs.

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
| [docs/vercel-deployment.md](./docs/vercel-deployment.md) | Vercel deployment guide |
| [docs/static-html-guide.md](./docs/static-html-guide.md) | Single-file prototype best practices |
