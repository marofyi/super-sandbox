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
├── packages/           # Shared utilities
│   └── openai-utils/   # OpenAI API wrapper
├── projects/           # Research projects
│   ├── example-chat/   # CLI demo
│   ├── example-chat-web/ # Web demo (Next.js)
│   └── tanstack-chat/  # TanStack Start demo
└── docs/               # Documentation
```

## Shared Packages

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

A TanStack Start (React Router + Nitro SSR) demo featuring multi-provider AI chat with model switching across OpenAI, Anthropic, Gemini, and Ollama, plus approval flows for tool calls. Built with React 19, Vite, Tailwind CSS v4, lucide-react icons, and @tanstack/ai for streaming, and includes an expanded guitar recommendation experience with interactive tool-driven responses and slide-in navigation.

## Deployment

Web projects are deployed to Vercel. Each project gets its own Vercel Project with independent configuration.

See [docs/vercel-deployment.md](docs/vercel-deployment.md) for:

- Step-by-step deployment instructions
- Adding new web projects
- Troubleshooting common issues
- API-based configuration (works in Claude Code Web)

## Configuration

- GitHub Actions now auto-deploys `projects/tanstack-chat` via `.github/workflows/deploy-tanstack-chat.yml` using the Vercel project `tanstack-chat`.
- GitHub Actions keeps README.md current on pull requests via `.github/workflows/update-readme.yml`.
- The `projects/tanstack-chat/.env.example` file documents required `OPENAI_API_KEY` and optional `ANTHROPIC_API_KEY`/`GEMINI_API_KEY` values for the multi-provider chat demos.
