# Context7 MCP - Documentation Lookup

Context7 provides real-time documentation lookup for programming libraries and frameworks. It helps Claude access current, accurate documentation instead of relying on training data.

## Why Use It

- Training data is ~1 year old
- APIs change frequently
- Get accurate, current documentation
- Avoid deprecated patterns

## Tools Available (2)

| Tool | Description |
|------|-------------|
| `resolve-library-id` | Find the Context7 ID for a library |
| `query-docs` | Query documentation for a specific library |

## Setup

### Add to Claude Code Settings

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

No API key required for basic usage.

### Restart Claude Code

The tools will be available immediately.

## Usage

Context7 is used automatically when Claude needs to look up documentation. You can also explicitly request it:

```
Look up the current Next.js 15 documentation for server actions
```

```
What's the latest React 19 API for use() hook? Check Context7.
```

```
Query Context7 for Tailwind CSS v4 configuration options
```

## How It Works

1. Claude calls `resolve-library-id` to find the library
2. Claude calls `query-docs` with your question
3. Returns relevant documentation excerpts

## Supported Libraries

Context7 indexes documentation for most popular libraries:

- React, Next.js, Vue, Svelte
- Tailwind CSS, shadcn/ui
- Node.js, Deno, Bun
- TypeScript, JavaScript
- Python, Go, Rust
- And many more

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Library not found" | Try alternate names (e.g., "nextjs" vs "next.js") |
| Outdated results | Context7 updates regularly; try again later |
| Rate limited | Wait a moment and retry |

## Source

- NPM: [@upstash/context7-mcp](https://www.npmjs.com/package/@upstash/context7-mcp)

---

[Back to README](../README.md) | [SETUP.md](../SETUP.md)
