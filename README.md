# Research

A space for coding experiments and explorations.

## Getting Started

```bash
# Install dependencies
pnpm install

# Type-check all packages
pnpm check

# Build a specific package
pnpm b @research/openai-utils build
```

## Structure

```
research/
├── .skills/            # Agent Skills (cross-platform capabilities)
├── packages/           # Shared utilities
│   ├── browserless/    # BrowserQL client for HTTP-only browser automation
│   └── openai-utils/   # OpenAI API wrapper
├── projects/           # Research projects and prototypes
│   ├── index.html      # Landing page (GitHub Pages)
│   ├── example-chat/   # CLI demo
│   ├── example-chat-web/ # Web demo (Next.js → Vercel)
│   ├── tanstack-chat/  # TanStack Start demo (Vercel)
│   └── *.html          # Single-file prototypes (GitHub Pages)
└── docs/               # Documentation
```

## Agent Skills

This repo exposes cross-platform agent capabilities via `.skills/` using the Agent Skills open standard. Each skill includes a `SKILL.md` with usage docs and allowed tools for sandboxed environments:

- `.skills/browserless` — Browserless BrowserQL automation for scraping, screenshots, and form flows over HTTP-only requests.
- `.skills/vercel-deploy` — Vercel deployment playbook covering CLI setup, env vars, and per-project URLs.

## Shared Packages

### @research/browserless

Browser automation client for [Browserless](https://browserless.io) BrowserQL using pure HTTP POST (no WebSocket), making it compatible with sandboxed environments like Claude Code Web. Helpers include `goto`, `click`, `type`, `getText`, `getHtml`, `screenshot`/`screenshotToFile` (optimized JPEG defaults to `/tmp`), `executeFlow` for single-session GraphQL flows, and responsive capture utilities `captureResponsiveScreenshots`/`captureAtViewport`. Uses an `undici` ProxyAgent when `HTTPS_PROXY` is set (CC Web) and defaults to the Chrome BQL endpoint with a 60-second timeout. Requires `BROWSERLESS_TOKEN` and optionally `BROWSERLESS_URL`.

### @research/openai-utils

Lightweight wrapper around the OpenAI TypeScript SDK for quick scripting and research.

```typescript
import { ask, chat, chatStream } from '@research/openai-utils';

// Simple one-liner
const answer = await ask('What is 2+2?');

// With options
const response = await chat('Explain quantum computing', {
  model: 'gpt-4o',
  systemPrompt: 'Be concise.',
  temperature: 0.7,
});
console.log(response.content);
console.log(response.usage.totalTokens);

// Streaming
for await (const chunk of chatStream('Tell me a story')) {
  process.stdout.write(chunk);
}
```

## Running Projects

### CLI Projects

```bash
# Run CLI projects with tsx (no build needed)
pnpm --filter @research/example-chat start
```

### Web Projects

```bash
# Run web projects locally (requires OPENAI_API_KEY in .env)
pnpm --filter @research/example-chat-web dev
```

### Screenshot Capture

Capture screenshots using the browserless CLI (requires `BROWSERLESS_TOKEN`):

```bash
# Single desktop screenshot
pnpm --filter @research/browserless screenshot https://your-app.com

# Responsive screenshots (all viewports)
pnpm --filter @research/browserless screenshot https://your-app.com --responsive
```

## Environment Setup

Copy `.env.example` to `.env` and add your OpenAI API key. Optional placeholders cover TanStack Chat multi-provider demos (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`), Browserless automation and visual QA (`BROWSERLESS_TOKEN`, optional `BROWSERLESS_URL`, `TEST_URL`), and deployment helpers (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `GH_TOKEN`).

```bash
cp .env.example .env
```

## Projects

### example-chat

A CLI demonstration of @research/openai-utils showing `ask()`, `chat()`, `chatStream()`, and usage reporting. Runs on TypeScript with tsx so it skips a build step, making it easy to trial persona prompts and streaming responses for quick experiments.

### example-chat-web

A Next.js web application that wires @research/openai-utils into a streaming chat UI with React and Tailwind CSS. Ships as a Vercel deployment for easy sharing and mirrors the CLI flows in a browser-friendly UI.

**Live**: https://example-chat-web-marofyi.vercel.app

### tanstack-chat

A TanStack Start (React Router + Nitro SSR) demo for multi-provider AI chat with model switching across OpenAI, Anthropic, Gemini, and Ollama plus approval flows for tool calls. Built with React 19, Vite, Tailwind CSS v4, lucide-react icons, and @tanstack/ai for streaming, featuring a guitar recommendation flow with interactive tool responses and slide-in navigation.

## Deployment

Projects can be deployed via two hosting options depending on complexity:

| Project Type | Hosting | When to Use |
|--------------|---------|-------------|
| Single-file HTML prototypes | GitHub Pages | Quick experiments, tools, demos |
| Full web apps (SSR, API routes) | Vercel | Complex state, server-side logic |

### GitHub Pages (Static HTML)

Single `.html` files in `projects/` are automatically deployed to GitHub Pages:

- **Workflow:** `.github/workflows/deploy-github-pages.yml`
- **Landing page:** `projects/index.html` (auto-maintained by `update-docs.yml`)
- **Guide:** [docs/static-html-guide.md](docs/static-html-guide.md)

### Vercel (Full Web Apps)

Web projects with `package.json` are deployed to Vercel. Each project gets its own Vercel Project with independent configuration.

See [docs/vercel-deployment.md](docs/vercel-deployment.md) for:

- Step-by-step deployment instructions
- Adding new web projects
- Troubleshooting common issues
- CLI-first setup with GitHub Actions workflow template (API calls are unreliable)

## Configuration

- GitHub Actions now auto-deploys `projects/tanstack-chat` via `.github/workflows/deploy-tanstack-chat.yml` using the Vercel project `tanstack-chat`.
- GitHub Actions keeps documentation current on pull requests via `.github/workflows/update-docs.yml`.
- The `projects/tanstack-chat/.env.example` file documents required `OPENAI_API_KEY` and optional `ANTHROPIC_API_KEY`/`GEMINI_API_KEY` values for the multi-provider chat demos.
- Browser automation utilities in `@research/browserless` need `BROWSERLESS_TOKEN` (and optional `BROWSERLESS_URL`) for BrowserQL HTTP calls; works without WebSockets for sandboxed environments and now routes through the CC Web proxy when `HTTPS_PROXY` is present.
- Visual QA scripts take URL as a CLI argument and require `BROWSERLESS_TOKEN`; the `@research/browserless` package provides reusable `captureResponsiveScreenshots()` and `captureAtViewport()` utilities for any project.
- Browser automation options for sandboxed environments are compared in `docs/cc-web-browser-automation.md`, highlighting Browserless BrowserQL as the HTTP-only approach that succeeds when CDP WebSockets are blocked. See `docs/cc-web-network-guide.md` for CC Web proxy/DNS behavior and a proxy-aware fetch pattern.
