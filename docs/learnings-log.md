# Learnings Log

A chronological record of discoveries, gotchas, and insights from building in this monorepo.

---

## 2026-01: Documentation Navigation Principle

- Docs now work like a website: `README.md` is the homepage for humans and `AGENTS.md` is the homepage for AI agents.
- Every doc should include a "See Also" section that links back to entry points and related guides so readers never hit a dead end.

---

## 2025-12: Browserless Standalone CLI

The `@research/browserless` package now includes a standalone CLI for capturing screenshots without coupling to any specific project:

```bash
# Single screenshot
pnpm --filter @research/browserless screenshot https://example.com

# Responsive (all viewports)
pnpm --filter @research/browserless screenshot https://example.com --responsive

# Specific viewport preset
pnpm --filter @research/browserless screenshot https://example.com --viewport iphone14
```

- Shared `@research/browserless` helpers `captureResponsiveScreenshots()` and `captureAtViewport()` consolidate viewport lists and full-page options for any project.
- Errors surface per-viewport with counts, so CI can fail fast when Browserless responses are missing or a viewport configuration is invalid.
- Static HTML prototypes in `projects/*.html` auto-deploy to GitHub Pages via `.github/workflows/deploy-github-pages.yml`; keep everything in one file and let `update-docs.yml` refresh `projects/index.html`.

---

## 2025-02: CC Web Guide Consolidation

- Replaced split CC Web docs (`cc-web-setup`, `cc-web-network-guide`, `cc-web-browser-automation`) with a single `docs/cc-web.md` covering session setup, proxy-aware `undici` fetch, and Browserless BrowserQL usage for HTTP-only automation.
- Archived the Steel/Stagehand Cloud Run playbook (`docs/archive/browser-automation.md`) because WebSocket-based CDP remains blocked in CC Web; Browserless BrowserQL is the supported path.

---

## 2024-12: Claude Code Web Network Architecture

### Discovery: Node.js fetch fails, curl works

When making HTTP requests from Claude Code Web (CC Web), `curl` works but Node.js `fetch` fails with DNS errors:

```
Error: getaddrinfo EAI_AGAIN production-sfo.browserless.io
```

**Root cause**: CC Web routes all traffic through an egress proxy (`HTTPS_PROXY`). The proxy handles DNS resolution. Node.js native `fetch` ignores proxy environment variables and attempts direct DNS lookup against a broken local resolver (`127.0.0.1`).

**Solution**: Use `undici` with `ProxyAgent` to route requests through the proxy. See `packages/browserless` for implementation.

### Key environment insight

| Component | Value |
|-----------|-------|
| DNS Server | `127.0.0.1` (broken) |
| `HTTPS_PROXY` | Routes to egress proxy |
| `CLAUDE_CODE_PROXY_RESOLVES_HOSTS` | `true` |

The proxy does the DNS resolution, not the container.

---

## 2024-12: Browser Automation in CC Web

### Failed approach: Steel Browser + CDP

We deployed [Steel Browser](https://github.com/steel-dev/steel-browser) to Google Cloud Run and attempted to connect via Playwright/Stagehand using Chrome DevTools Protocol (CDP).

**What worked:**
- Installing gcloud CLI in CC Web sandbox
- Deploying Steel to Cloud Run
- Making REST API calls via curl

**What failed:**
- WebSocket connections from Node.js (`EAI_AGAIN` errors)
- Playwright CDP connections (requires WebSocket)

**Root cause**: CC Web sandbox blocks WebSocket connections from Node.js. CDP requires WebSocket, making any CDP-based solution (Playwright, Puppeteer, Stagehand) incompatible with CC Web.

### Working approach: Browserless BrowserQL

[Browserless](https://browserless.io) offers BrowserQL - a GraphQL API over **pure HTTP POST**. No WebSocket required.

| Feature | CDP/Playwright | BrowserQL |
|---------|---------------|-----------|
| Protocol | WebSocket | HTTP POST |
| Works in CC Web | No | Yes |

This led to creating `@research/browserless` package.

---

## 2024-12: Visual QA with Browserless

### Responsive screenshot capture

The `@research/browserless` package provides BrowserQL-driven screenshot utilities for responsive visual QA. Use the standalone CLI (`pnpm --filter @research/browserless screenshot <url> --responsive`) or the programmatic API (`captureResponsiveScreenshots()`) to capture mobile, tablet, and desktop breakpoints over pure HTTP. Requires `BROWSERLESS_TOKEN`; optionally set `BROWSERLESS_URL` for a custom Browserless host. Screenshots save as JPEGs to the specified output directory.

---

## 2024-12: Vercel Deployment Quirks

### API vs CLI reliability

The Vercel API can be unreliable, especially for authentication. We encountered:
- `missingToken` errors despite valid tokens
- Empty responses without error messages
- Inconsistent behavior between API and CLI

**Lesson**: Prefer Vercel CLI over direct API calls. The CLI handles authentication more reliably.

### Environment variable conflict

When `VERCEL_ORG_ID` is set (e.g., from Claude Code secrets) but `VERCEL_PROJECT_ID` isn't, the CLI fails:

```
You specified VERCEL_ORG_ID but forgot to specify VERCEL_PROJECT_ID
```

**Workaround**: Temporarily unset both when running CLI commands:
```bash
VERCEL_ORG_ID= VERCEL_PROJECT_ID= pnpm exec vercel link --project <name> --yes
```

### Git remotes in CC Web

In CC Web, git remotes point to a local proxy instead of GitHub:
```
http://local_proxy@127.0.0.1:59916/git/...
```

This breaks `gh` CLI commands that auto-detect the repository.

**Workaround**: Always use `-R owner/repo` flag:
```bash
gh secret set MY_SECRET --body "value" -R owner/repo
```

---

## 2024-12: API Gotchas

### Timeout units matter

Some APIs use milliseconds, some use seconds. Browserless uses milliseconds:

```typescript
// WRONG: 60 interpreted as 60ms = instant timeout
const url = `${API_URL}?timeout=60`;

// RIGHT: 60000ms = 60 seconds
const url = `${API_URL}?timeout=60000`;
```

### GraphQL enum case sensitivity

Some GraphQL APIs are case-sensitive for enum values:

```graphql
# May fail
mutation { screenshot(type: JPEG) { base64 } }

# Works
mutation { screenshot(type: jpeg) { base64 } }
```

---

## References

- [Browserless BrowserQL Docs](https://docs.browserless.io/browserql-interactions)
- [Steel Browser](https://github.com/steel-dev/steel-browser)
- [Vercel Monorepos](https://vercel.com/docs/monorepos)

## See Also

- [README.md](../README.md) - Entry point for project overview and navigation
- [AGENTS.md](../AGENTS.md) - Agent workflow and documentation structure
- [docs/cc-web.md](./cc-web.md) - Sandbox networking and automation guidance
