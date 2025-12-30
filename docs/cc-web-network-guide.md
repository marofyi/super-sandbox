# Claude Code Web: Network & HTTP Guide

How to make HTTP requests from Claude Code Web's sandboxed environment.

## The Problem

Node.js `fetch` fails in CC Web with DNS errors. The sandbox routes traffic through a proxy that handles DNS, but native `fetch` ignores proxy settings.

## Solution: Proxy-Aware Fetch

Use `undici` with `ProxyAgent`:

```typescript
import { ProxyAgent, fetch as undiciFetch } from "undici";

function getProxyAwareFetch(): typeof globalThis.fetch {
  const proxyUrl = process.env.HTTPS_PROXY;

  if (proxyUrl) {
    const agent = new ProxyAgent(proxyUrl);
    return ((url: string | URL | Request, init?: RequestInit) =>
      undiciFetch(url as string, {
        ...init,
        dispatcher: agent,
      } as Parameters<typeof undiciFetch>[1])) as typeof globalThis.fetch;
  }

  return globalThis.fetch;
}

// Usage
const fetch = getProxyAwareFetch();
const response = await fetch("https://api.example.com/data");
```

### Dependencies

```json
{
  "dependencies": {
    "undici": "^7.16.0"
  }
}
```

## Environment Detection

```typescript
const isClaudeCodeWeb = process.env.CLAUDE_CODE_REMOTE === "true";
const hasProxy = !!process.env.HTTPS_PROXY;
```

## Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `HTTPS_PROXY` | Egress proxy URL |
| `CLAUDE_CODE_REMOTE` | `"true"` in CC Web |
| `CLAUDE_CODE_PROXY_RESOLVES_HOSTS` | `"true"` - proxy does DNS |

## See Also

- [Browser Automation](./cc-web-browser-automation.md) - HTTP-only browser automation
- [Learnings Log](./learnings-log.md) - Why native fetch fails
