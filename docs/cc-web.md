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

## Token Architecture

This monorepo uses a **minimal token surface** design:

| Token | Location | Scope | Purpose |
|-------|----------|-------|---------|
| `GH_TOKEN` | CC Web env | `repo` (classic PAT) | Workflow dispatch |
| `BROWSERLESS_TOKEN` | CC Web env | Full (free account) | E2E testing screenshots |
| `VERCEL_TOKEN` | CC Web env (optional) | Team-scoped | Live preview deploys ([vercel skill](../skills/vercel/)) |

**Note:** `VERCEL_TOKEN` is optional. Without it, use GitHub Actions for deployments. With it, the vercel skill can deploy directly (~10s).

### GH_TOKEN

CC Web handles git operations **natively** (push, PRs, issues). The `gh` CLI is used for workflow dispatch (`gh workflow run`).

### Creating GH_TOKEN

1. Go to [github.com/settings/tokens/new](https://github.com/settings/tokens/new)
2. **Note**: `Claude Code Web`
3. **Expiration**: 30 days (or longer)
4. **Scopes**: Check only `repo`

### VERCEL_TOKEN (optional) {#vercel-token}

Required for the [vercel skill](../skills/vercel/) to deploy directly from CC Web.

1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Click "Create Token"
3. **Name**: `Claude Code Web`
4. **Scope**: Select your team/account
5. **Expiration**: 30 days (or longer)
6. Add to CC Web environment as `VERCEL_TOKEN`

## Security Notes

- Session setup only installs `gh` and adds the `github` remote; it does not hide tokens or run a PreToolUse security hook.
- Tokens stay in the environment—depend on minimal scopes and avoid env dumps or printing tokens.
- `VERCEL_TOKEN` grants deploy access. Only add it if you want the vercel skill to work directly in CC Web.

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

- [README.md](../README.md) - Project overview and entry point for humans
- [docs/browserless.md](./browserless.md) - HTTP-only BrowserQL client for automation
- [docs/vercel-deployment.md](./vercel-deployment.md) - Workflow-based deployments
- [CHANGELOG.md](../CHANGELOG.md) - Current network and automation findings
- [Browserless BrowserQL Docs](https://docs.browserless.io/browserql-interactions)
