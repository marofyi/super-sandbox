# Browserless Browser Automation

HTTP-only browser automation using [Browserless](https://browserless.io) BrowserQL. Works in Claude Code Web and other sandboxed environments where WebSocket-based tools (Playwright, Puppeteer) are blocked.

## Package

```typescript
import {
  // Core functions
  goto,           // Navigate to URL
  click,          // Click element by selector
  type,           // Type text into element
  getHtml,        // Get page HTML
  getText,        // Get page text content
  screenshot,     // Capture screenshot (base64)
  screenshotToFile, // Save screenshot to file
  executeFlow,    // Run multi-step GraphQL flow
  isConfigured,   // Check if BROWSERLESS_TOKEN set
  isClaudeCodeWeb, // Detect CC Web environment

  // Responsive capture utility
  captureResponsiveScreenshots, // Capture across multiple viewports
  captureAtViewport,            // Single viewport capture
  VIEWPORT_PRESETS,             // Common device presets
  DEFAULT_VIEWPORTS,            // Default viewport list
} from '@super-sandbox/browserless';
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
import { goto, screenshotToFile } from '@super-sandbox/browserless';

await goto('https://example.com');
const path = await screenshotToFile(); // /tmp/screenshot.jpg
```

### Form Interaction

```typescript
import { goto, type, click, getText } from '@super-sandbox/browserless';

await goto('https://example.com/login');
await type('input[name="email"]', 'user@example.com');
await type('input[name="password"]', 'secret');
await click('button[type="submit"]');
const result = await getText();
```

### Scrape Page Content

```typescript
import { goto, getHtml, getText } from '@super-sandbox/browserless';

await goto('https://example.com');
const html = await getHtml();  // Full HTML
const text = await getText();  // Text only
```

### Multi-Step Flow (Single Session)

```typescript
import { executeFlow } from '@super-sandbox/browserless';

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
import { captureResponsiveScreenshots, VIEWPORT_PRESETS } from '@super-sandbox/browserless';

// Capture all default viewports (8 device sizes)
const results = await captureResponsiveScreenshots('https://your-app.com', {
  outputDir: './screenshots',
  includeFullPage: true, // Also capture full-page for mobile
});

// Capture specific viewports only
const results = await captureResponsiveScreenshots('https://your-app.com', {
  outputDir: './screenshots',
  viewports: [VIEWPORT_PRESETS.iphone14, VIEWPORT_PRESETS.desktop1080p],
});

console.log(`Captured ${results.screenshots.length} screenshots`);
```

### Single Viewport Capture

```typescript
import { captureAtViewport, VIEWPORT_PRESETS } from '@super-sandbox/browserless';

const result = await captureAtViewport('https://your-app.com', {
  viewport: VIEWPORT_PRESETS.iphone14,
  outputPath: './screenshot.jpg',
  fullPage: true,
});
```

## CLI

The browserless package provides a CLI for capturing screenshots:

```bash
# Single desktop screenshot
./browserless/scripts/screenshot.sh https://example.com

# Responsive screenshots (all default viewports)
./browserless/scripts/screenshot.sh https://example.com --responsive

# Specific viewport preset
./browserless/scripts/screenshot.sh https://example.com --viewport iphone14

# Custom output
./browserless/scripts/screenshot.sh https://example.com --output ./my-screenshot.jpg
```

Run `./browserless/scripts/screenshot.sh --help` for all options.

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
- [Package Source](../browserless/src/browserless-client.ts)
- [Cloud Environments Guide](./cloud-environments.md)

## See Also

- [README.md](../README.md) - Project overview and entry point for humans
- [docs/cloud-environments.md](./cloud-environments.md) - Cloud environment setup guide
- [CHANGELOG.md](../CHANGELOG.md) - Latest automation changes and discoveries
