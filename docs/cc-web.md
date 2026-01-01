# Claude Code Web Guide

Running code in Claude Code Web's sandboxed environment.

## Automatic Session Setup

A SessionStart hook (`.claude/settings.json`) runs `.claude/scripts/setup-web-session.sh` on new web sessions, installing:

- **GitHub CLI (`gh`)** - Required for PR operations

### Environment Detection

```bash
if [ "$CLAUDE_CODE_REMOTE" = "true" ]; then
  # Running in web sandbox
fi
```

### Extending Setup

Edit `.claude/scripts/setup-web-session.sh`:

```bash
if ! command -v mytool &> /dev/null; then
  echo "Installing mytool..."
  # installation commands
fi
```

## Network & HTTP

Node.js `fetch` fails in CC Web with DNS errors. The sandbox routes traffic through a proxy that handles DNS, but native `fetch` ignores proxy settings.

### Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `HTTPS_PROXY` | Egress proxy URL |
| `CLAUDE_CODE_REMOTE` | `"true"` in CC Web |
| `CLAUDE_CODE_PROXY_RESOLVES_HOSTS` | `"true"` - proxy does DNS |

### Solution: Proxy-Aware Fetch

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

**Dependency:** `undici` (^7.16.0)

## Browser Automation

CC Web blocks WebSocket connections, which breaks CDP-based tools (Playwright, Puppeteer, Stagehand).

### Solution: Browserless BrowserQL

Use [Browserless](https://browserless.io) with BrowserQL - a GraphQL API over **HTTP POST**.

| Approach | Protocol | CC Web Compatible |
|----------|----------|-------------------|
| Playwright/CDP | WebSocket | No |
| Browserless BrowserQL | HTTP POST | Yes |

### Usage

See `@research/browserless` package for a ready-to-use client:

```typescript
import { goto, click, screenshot } from '@research/browserless';

await goto('https://example.com');
await click('button.submit');
const img = await screenshot();
```

### Free Tier

- 1,000 units/month (1 unit = 30 seconds)
- No credit card required
- Requires `BROWSERLESS_TOKEN` env var

## Limitations

- Environment is ephemeral (tools reinstalled each session)
- Write access limited to project directory
- Some network domains require approval
- WebSocket connections blocked (use HTTP-based alternatives)

## See Also

- [Browserless BrowserQL Docs](https://docs.browserless.io/browserql-interactions)
- [Learnings Log](./learnings-log.md) - Historical context on why CDP failed
