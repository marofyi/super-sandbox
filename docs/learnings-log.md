# Learnings Log

A chronological record of discoveries, gotchas, and insights from building in this monorepo.

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
