# Claude Code Web: Network & HTTP Guide

A guide for building packages that make HTTP requests from Claude Code Web (CC Web) sandboxed environments.

## Environment Detection

```typescript
// Check if running in CC Web
const isClaudeCodeWeb = process.env.CLAUDE_CODE_REMOTE === "true";

// Check if proxy is configured
const hasProxy = !!process.env.HTTPS_PROXY;
```

## Network Architecture

CC Web routes all outbound traffic through an egress proxy:

| Component | Value |
|-----------|-------|
| `HTTPS_PROXY` | `http://<container>:<jwt>@<ip>:15004` |
| `HTTP_PROXY` | Same as above |
| DNS Server | `127.0.0.1` (broken local resolver) |
| `CLAUDE_CODE_PROXY_RESOLVES_HOSTS` | `true` |

### Key Insight

The proxy handles DNS resolution. Direct DNS lookups from the container fail.

## The Problem: Node.js fetch vs curl

| Tool | Proxy Support | DNS | Result |
|------|---------------|-----|--------|
| `curl` | Auto (env vars) | Via proxy | Works |
| Node.js `fetch` | None | Direct | `EAI_AGAIN` error |
| `undici` + `ProxyAgent` | Manual | Via proxy | Works |

### Why Node.js fetch Fails

```
Error: getaddrinfo EAI_AGAIN production-sfo.browserless.io
    at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)
```

Node.js native `fetch` ignores `HTTP_PROXY`/`HTTPS_PROXY` environment variables. It attempts direct DNS resolution, which fails because the container's DNS resolver (`127.0.0.1`) doesn't work.

## Solution: Proxy-Aware Fetch

Use `undici` with `ProxyAgent`:

```typescript
import { ProxyAgent, fetch as undiciFetch } from "undici";

function getProxyAwareFetch(): typeof globalThis.fetch {
  const proxyUrl = process.env.HTTPS_PROXY;

  if (proxyUrl) {
    // CC Web environment - use undici with ProxyAgent
    const agent = new ProxyAgent(proxyUrl);
    return ((url: string | URL | Request, init?: RequestInit) =>
      undiciFetch(url as string, {
        ...init,
        dispatcher: agent,
      } as Parameters<typeof undiciFetch>[1])) as typeof globalThis.fetch;
  }

  // Local environment - use native fetch
  return globalThis.fetch;
}

// Usage
const fetch = getProxyAwareFetch();
const response = await fetch("https://api.example.com/data");
```

### Package Dependencies

```json
{
  "dependencies": {
    "undici": "^7.16.0"
  }
}
```

## Environment Variables Available

```bash
# Proxy configuration (all set to same value)
HTTP_PROXY=http://...@21.0.0.211:15004
HTTPS_PROXY=http://...@21.0.0.211:15004
http_proxy=http://...@21.0.0.211:15004
https_proxy=http://...@21.0.0.211:15004

# Global agent (for some Node.js proxy libraries)
GLOBAL_AGENT_HTTP_PROXY=http://...
GLOBAL_AGENT_HTTPS_PROXY=http://...
GLOBAL_AGENT_NO_PROXY=localhost,127.0.0.1,...

# Bypass list
NO_PROXY=localhost,127.0.0.1,169.254.169.254,metadata.google.internal,*.svc.cluster.local,*.local,*.googleapis.com,*.google.com

# CC Web detection
CLAUDE_CODE_REMOTE=true
CLAUDE_CODE_PROXY_RESOLVES_HOSTS=true
```

## Testing in CC Web

### Quick Connectivity Test

```bash
# curl works (uses proxy automatically)
curl -s "https://api.example.com/health"

# Node.js native fetch fails
node -e "fetch('https://api.example.com').then(console.log).catch(console.error)"
# Error: getaddrinfo EAI_AGAIN

# Node.js with undici ProxyAgent works
node -e "
const { ProxyAgent, fetch } = require('undici');
const agent = new ProxyAgent(process.env.HTTPS_PROXY);
fetch('https://api.example.com', { dispatcher: agent })
  .then(r => r.text())
  .then(console.log);
"
```

### DNS Diagnostics

```bash
# Check Node.js DNS configuration
node -e "console.log('DNS servers:', require('dns').getServers())"
# Output: [ '127.0.0.1' ]  <-- This is the problem

# Check resolv.conf (usually empty in CC Web)
cat /etc/resolv.conf
```

## Common Gotchas

### 1. API Timeout Units

Some APIs use milliseconds, some use seconds. Always verify:

```typescript
// WRONG: 60 interpreted as 60ms = instant timeout
const url = `${API_URL}?timeout=60`;

// RIGHT: 60000ms = 60 seconds
const url = `${API_URL}?timeout=60000`;
```

### 2. GraphQL Enum Case Sensitivity

Some GraphQL APIs are case-sensitive for enum values:

```graphql
# May fail
mutation { screenshot(type: JPEG) { base64 } }

# Works
mutation { screenshot(type: jpeg) { base64 } }
```

### 3. WebSocket Connections

WebSocket connections may also fail without proxy configuration. Consider using HTTP-based alternatives when available (like Browserless BrowserQL instead of CDP WebSocket).

## Package Structure Recommendation

For packages that need HTTP in CC Web:

```
packages/my-http-package/
├── src/
│   ├── index.ts           # Public exports
│   ├── client.ts          # Main client logic
│   ├── fetch.ts           # Proxy-aware fetch wrapper
│   └── types.ts           # Type definitions
├── package.json           # Include undici dependency
└── tsconfig.json
```

### fetch.ts Template

```typescript
import { ProxyAgent, fetch as undiciFetch } from "undici";

let cachedFetch: typeof globalThis.fetch | null = null;

export function getProxyAwareFetch(): typeof globalThis.fetch {
  if (cachedFetch) return cachedFetch;

  const proxyUrl = process.env.HTTPS_PROXY;

  if (proxyUrl) {
    const agent = new ProxyAgent(proxyUrl);
    cachedFetch = ((url: string | URL | Request, init?: RequestInit) =>
      undiciFetch(url as string, {
        ...init,
        dispatcher: agent,
      } as Parameters<typeof undiciFetch>[1])) as typeof globalThis.fetch;
  } else {
    cachedFetch = globalThis.fetch;
  }

  return cachedFetch;
}

export function isClaudeCodeWeb(): boolean {
  return process.env.CLAUDE_CODE_REMOTE === "true";
}
```

## Related Documentation

- [Browser Automation Options](./cc-web-browser-automation.md) - Comparing browser automation approaches for CC Web
- [Browserless Package](../packages/browserless/README.md) - HTTP-based browser automation that works in CC Web
