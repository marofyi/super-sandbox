# Research

A space for coding experiments and explorations.

## Getting Started

```bash
# Install dependencies
pnpm install

# Build shared packages
pnpm build
```

## Structure

```
research/
├── packages/           # Shared utilities
│   └── openai-utils/   # OpenAI API wrapper
└── projects/           # Research projects
    └── example-chat/   # Demo project
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

```bash
# Run any project with tsx (no build needed)
pnpm --filter @research/example-chat start

# Or directly
cd projects/example-chat && pnpm start
```

## Environment Setup

Copy `.env.example` to `.env` and add your OpenAI API key:

```bash
cp .env.example .env
```

## Projects

- **example-chat**: Demo showing openai-utils usage
