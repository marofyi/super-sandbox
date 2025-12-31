---
name: browserless
description: Browser automation using Browserless BrowserQL. Use for web scraping, UI testing, screenshot capture, form interaction, content extraction, and any task requiring browser control from sandboxed environments like Claude Code Web.
allowed-tools: Read Bash Glob
---

# Browserless Browser Automation

HTTP-only browser automation using [Browserless](https://browserless.io) BrowserQL. Works in Claude Code Web and other sandboxed environments where WebSocket-based tools (Playwright, Puppeteer) are blocked.

## Package

```typescript
import {
  goto,           // Navigate to URL
  click,          // Click element by selector
  type,           // Type text into element
  getHtml,        // Get page HTML
  getText,        // Get page text content
  screenshot,     // Capture screenshot (base64)
  screenshotToFile, // Save screenshot to file
  executeFlow,    // Run multi-step GraphQL flow
  isConfigured,   // Check if BROWSERLESS_TOKEN set
  isClaudeCodeWeb // Detect CC Web environment
} from '@research/browserless';
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BROWSERLESS_TOKEN` | Yes | BrowserQL auth token from browserless.io |
| `BROWSERLESS_URL` | No | Custom endpoint (default: Chrome BQL) |
| `HTTPS_PROXY` | Auto | Set in CC Web; package handles automatically |

## Common Patterns

### Navigate and Screenshot

```typescript
import { goto, screenshotToFile } from '@research/browserless';

await goto('https://example.com');
const path = await screenshotToFile(); // /tmp/screenshot.jpg
```

### Form Interaction

```typescript
import { goto, type, click, getText } from '@research/browserless';

await goto('https://example.com/login');
await type('input[name="email"]', 'user@example.com');
await type('input[name="password"]', 'secret');
await click('button[type="submit"]');
const result = await getText();
```

### Scrape Page Content

```typescript
import { goto, getHtml, getText } from '@research/browserless';

await goto('https://example.com');
const html = await getHtml();  // Full HTML
const text = await getText();  // Text only
```

### Multi-Step Flow (Single Session)

```typescript
import { executeFlow } from '@research/browserless';

const result = await executeFlow(`
  mutation {
    goto(url: "https://example.com", waitUntil: networkIdle) { status }
    click(selector: "button.accept-cookies") { time }
    screenshot(type: jpeg, quality: 80) { base64 }
  }
`);
```

### Responsive Screenshots

```typescript
// Set viewport before screenshot
const result = await executeFlow(`
  mutation {
    goto(url: "https://example.com", waitUntil: networkIdle) { status }
    viewport(width: 375, height: 812, deviceScaleFactor: 2) { width height }
    screenshot(type: jpeg) { base64 }
  }
`);
```

## Visual QA Script

For TanStack Chat responsive testing:

```bash
pnpm --filter @research/tanstack-chat test:visual

# With custom target URL
TEST_URL="https://preview.vercel.app" pnpm --filter @research/tanstack-chat test:visual
```

## Screenshot Options

```typescript
await screenshotToFile({
  filePath: '/tmp/page.png',  // Default: /tmp/screenshot.jpg
  format: 'png',              // jpeg (default), png, webp
  quality: 90,                // 0-100, default 80
  fullPage: true,             // Capture full page scroll
  optimizeForSpeed: true      // Default true
});
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "BROWSERLESS_TOKEN is required" | Set `BROWSERLESS_TOKEN` env var |
| Timeout errors | Increase timeout in executeFlow, or check network |
| Empty screenshots | Ensure page fully loaded with `waitUntil: networkIdle` |
| Proxy errors in CC Web | Package handles `HTTPS_PROXY` automatically |

## Resources

- [BrowserQL Docs](https://docs.browserless.io/browserql-interactions)
- [Package Source](../packages/browserless/src/browserless-client.ts)
- [CC Web Browser Automation Guide](../docs/cc-web-browser-automation.md)
