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

### example-chat

A demonstration project showcasing all features of the @research/openai-utils package. It includes examples of simple one-liner queries with `ask()`, detailed responses with token usage via `chat()`, custom system prompts for persona-based responses, and real-time streaming output with `chatStream()`. Built with TypeScript and tsx for rapid development without a build step.
