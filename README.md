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
├── index.html          # Landing page (GitHub Pages root)
├── packages/           # Shared utilities
│   ├── browserless/    # BrowserQL client for HTTP-only browser automation
│   └── openai-utils/   # OpenAI API wrapper
├── projects/           # Research projects and prototypes
│   ├── example-chat/   # CLI demo
│   ├── example-chat-web/ # Web demo (Next.js → Vercel)
│   ├── tanstack-chat/  # TanStack Start demo (Vercel)
│   ├── the-intelligence-economy/ # LLM economy visualization
│   └── live-preview-test/ # Encrypted preview viewer for CC Web
├── docs/               # Documentation
├── AGENTS.md           # AI agent instructions
└── CONTRIBUTING.md     # Code style and git workflow
```

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

Copy `.env.example` to `.env` and add your OpenAI API key. Optional placeholders cover TanStack Chat multi-provider demos (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`), Browserless automation and visual QA (`BROWSERLESS_TOKEN`, optional `BROWSERLESS_URL`), and deployment helpers (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `GH_TOKEN`).

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

### the-intelligence-economy

An interactive visualization exploring how large language models are restructuring the internet economy. Features a value flow slider showing revenue distribution between traditional web and LLM-first paths, stakeholder health metrics (Google, OpenAI, Chegg, Stack Overflow), timeline of key events from 2019-2025, and animated feedback loop diagrams illustrating the traffic drain, model collapse, and knowledge commons erosion phenomena.

### live-preview-test

Encrypted HTML preview system for Claude Code Web sandbox. Push content to a GitHub Gist with AES-256-GCM encryption (PBKDF2 key derivation, 100k iterations), then view via a self-contained HTML viewer distributed as a `data:` URL. Bypasses CC Web network restrictions by using the GitHub API for polling. Includes shell scripts for encryption (`update-preview-encrypted.sh`) and data URL generation (`make-data-url.sh`).

## Deployment

Projects can be deployed via two hosting options depending on complexity:

| Project Type | Hosting | When to Use |
|--------------|---------|-------------|
| Single-file HTML prototypes | GitHub Pages | Quick experiments, tools, demos |
| Full web apps (SSR, API routes) | Vercel | Complex state, server-side logic |

### GitHub Pages (Static HTML)

The root `index.html` serves as the landing page, linking to projects in `projects/`:

- **Landing page:** `index.html` (auto-maintained by `update-index.yml`)
- **Guide:** [docs/static-html-guide.md](docs/static-html-guide.md)

### Vercel (Full Web Apps)

Web projects with `package.json` are deployed to Vercel. Each project gets its own Vercel Project with independent configuration.

See [docs/vercel-deployment.md](docs/vercel-deployment.md) for:

- Step-by-step deployment instructions
- Adding new web projects
- Troubleshooting common issues
- CLI-first setup with GitHub Actions workflow template (API calls are unreliable)

## Configuration

- GitHub Actions auto-deploys `projects/tanstack-chat` via `.github/workflows/deploy-tanstack-chat.yml` using the Vercel project `tanstack-chat`.
- The root `index.html` landing page is updated by `.github/workflows/update-index.yml`, which now supports manual runs with `pr_number` (target a closed PR) or `commits_back` (default 5 commits) when no PR context exists.
- Documentation is kept current via `.github/workflows/update-docs.yml`, which selects its diff target from PR metadata (`BASE_REF`) when available or falls back to the last `commits_back` commits on manual runs, and always branches new docs updates when dispatched manually.
- The `projects/tanstack-chat/.env.example` file documents required `OPENAI_API_KEY` and optional `ANTHROPIC_API_KEY`/`GEMINI_API_KEY` values for the multi-provider chat demos.
- Browser automation utilities in `@research/browserless` need `BROWSERLESS_TOKEN` (and optional `BROWSERLESS_URL`) for BrowserQL HTTP calls; works without WebSockets for sandboxed environments and now routes through the CC Web proxy when `HTTPS_PROXY` is present.
- Screenshot capture is centralized in the `@research/browserless` CLI: run `pnpm --filter @research/browserless screenshot <url>` (add `--responsive` for multi-viewport). Helpers `captureResponsiveScreenshots()` and `captureAtViewport()` back the CLI and can be reused in any project.
- Browser automation options for sandboxed environments are covered in `docs/cc-web.md`, highlighting Browserless BrowserQL as the HTTP-only approach that succeeds when CDP WebSockets are blocked.

## Documentation

Start here for navigation. README is the homepage for humans; AGENTS is the homepage for AI agents. Each deep-dive doc links back and sideways to related guides.

| Document | Description |
|----------|-------------|
| [AGENTS.md](./AGENTS.md) | Instructions for AI coding agents |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Code style and git workflow |
| [CHANGELOG.md](./CHANGELOG.md) | Notable changes, releases, and discoveries |
| [docs/learnings-log.md](./docs/learnings-log.md) | Running discoveries, gotchas, and workflow notes |
| [docs/browserless.md](./docs/browserless.md) | Browserless browser automation guide |
| [docs/cc-web.md](./docs/cc-web.md) | Claude Code Web guide (setup, network, browser automation) |
| [docs/vercel-deployment.md](./docs/vercel-deployment.md) | Vercel deployment guide |
| [docs/static-html-guide.md](./docs/static-html-guide.md) | Single-file prototype best practices |
