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
├── projects/           # Research projects
│   ├── example-chat/   # CLI demo
│   ├── example-chat-web/ # Web demo (Next.js)
│   └── tanstack-chat/  # TanStack Start demo
└── docs/               # Documentation
```

## Agent Skills

This repo exposes cross-platform agent capabilities via `.skills/` using the Agent Skills open standard. Each skill includes a `SKILL.md` with usage docs and allowed tools for sandboxed environments:

- `.skills/browserless` — Browserless BrowserQL automation for scraping, screenshots, and form flows over HTTP-only requests.
- `.skills/vercel-deploy` — Vercel deployment playbook covering CLI setup, env vars, and per-project URLs.

## Shared Packages

### @research/browserless

Browser automation client for [Browserless](https://browserless.io) BrowserQL using pure HTTP POST (no WebSocket), making it compatible with sandboxed environments like Claude Code Web. Helpers include `goto`, `click`, `type`, `getText`, `getHtml`, and `screenshot`/`screenshotToFile` (optimized JPEG defaults to `/tmp`) plus `executeFlow` for single-session GraphQL flows. Uses an `undici` ProxyAgent when `HTTPS_PROXY` is set (CC Web) and defaults to the Chrome BQL endpoint with a 60-second timeout. Requires `BROWSERLESS_TOKEN` and optionally `BROWSERLESS_URL`.

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

### Visual QA

Capture responsive screenshots (requires `BROWSERLESS_TOKEN` and `TEST_URL`):

```bash
TEST_URL="https://your-app.com" pnpm --filter @research/tanstack-chat test:visual
```

## Environment Setup

Copy `.env.example` to `.env` and add your OpenAI API key:

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

A TanStack Start (React Router + Nitro SSR) demo for multi-provider AI chat with model switching across OpenAI, Anthropic, Gemini, and Ollama plus approval flows for tool calls. Built with React 19, Vite, Tailwind CSS v4, lucide-react icons, and @tanstack/ai for streaming. Includes a guitar recommendation flow with interactive tool responses and slide-in navigation. Supports visual QA via `TEST_URL=... pnpm --filter @research/tanstack-chat test:visual` (needs `BROWSERLESS_TOKEN`).

## Deployment

Web projects are deployed to Vercel. Each project gets its own Vercel Project with independent configuration.

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
- Visual QA scripts require `TEST_URL` (target URL) and `BROWSERLESS_TOKEN`; the `@research/browserless` package provides reusable `captureResponsiveScreenshots()` and `captureAtViewport()` utilities for any project.
- Browser automation options for sandboxed environments are compared in `docs/cc-web-browser-automation.md`, highlighting Browserless BrowserQL as the HTTP-only approach that succeeds when CDP WebSockets are blocked. See `docs/cc-web-network-guide.md` for CC Web proxy/DNS behavior and a proxy-aware fetch pattern.
