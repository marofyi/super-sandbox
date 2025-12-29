# Browser Automation from Claude Code Web

This document captures learnings from attempting to set up browser automation that works from Claude Code Web's sandboxed environment.

## The Challenge

Claude Code Web runs in a sandboxed environment with network restrictions that prevent certain types of connections. This affects browser automation tools that rely on WebSocket connections.

## What We Tried

### Attempt 1: Steel Browser + Stagehand on Google Cloud Run

**Setup:**
- Deployed [Steel Browser](https://github.com/steel-dev/steel-browser) to Google Cloud Run
- Used GCP service account for IAM authentication
- Attempted to connect via Playwright/Stagehand using CDP (Chrome DevTools Protocol)

**What Worked:**
- ✅ Installing gcloud CLI in CC Web sandbox
- ✅ Authenticating with GCP service account
- ✅ Deploying Steel Browser to Cloud Run
- ✅ Making REST API calls to Steel via curl
- ✅ Creating browser sessions via Steel's HTTP API

**What Failed:**
- ❌ **WebSocket connections from Node.js** - `getaddrinfo EAI_AGAIN` errors
- ❌ **Playwright CDP connections** - Requires WebSocket, which is blocked
- ❌ **Node.js fetch to Cloud Run URLs** - DNS resolution failed in sandbox

**Root Cause:**
The CC Web sandbox has network restrictions that:
1. Block WebSocket connections from Node.js
2. Cause DNS resolution failures for certain domains in Node.js (but not curl)
3. Prevent Playwright/Puppeteer from connecting to remote browsers via CDP

### Attempt 2: Self-hosted Browserless on Railway

**Research:**
- Railway requires initial project setup via dashboard
- Self-hosting means managing infrastructure
- $5/month minimum cost

**Decided against** because Browserless Cloud offers a better solution.

## The Solution: Browserless Cloud with BrowserQL

[Browserless](https://browserless.io) offers **BrowserQL**, a GraphQL-based API that works over **pure HTTP POST requests** - no WebSocket required.

### Why BrowserQL Works

| Feature | CDP/Playwright | BrowserQL |
|---------|---------------|-----------|
| Protocol | WebSocket | HTTP POST |
| Works in CC Web | ❌ | ✅ |
| Full interactivity | ✅ | ✅ |
| click/type/navigate | ✅ | ✅ |

### Free Tier

- 1,000 units/month (1 unit = 30 seconds of browser time)
- No credit card required
- Includes captcha solving, proxies

### Example Usage

```typescript
// Pure HTTP - works from CC Web
const response = await fetch(
  `https://production-sfo.browserless.io/chromium/bql?token=${token}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        mutation {
          goto(url: "https://example.com") { status }
          click(selector: "a.button") { time }
          type(selector: "input", text: "hello") { time }
          screenshot { base64 }
        }
      `,
    }),
  }
);
```

## Summary

| Approach | CC Web Compatible | Full Interactivity | Cost |
|----------|------------------|-------------------|------|
| Steel + CDP | ❌ | ✅ | Free (self-hosted) |
| Playwright local | ❌ | ✅ | Free |
| Browserless BrowserQL | ✅ | ✅ | Free tier available |

**Recommendation:** Use Browserless Cloud with BrowserQL for browser automation from Claude Code Web.

## References

- [Browserless BrowserQL Docs](https://docs.browserless.io/browserql-interactions)
- [Browserless Pricing](https://browserless.io/pricing)
- [Steel Browser](https://github.com/steel-dev/steel-browser)
- [Stagehand](https://github.com/browserbase/stagehand)
