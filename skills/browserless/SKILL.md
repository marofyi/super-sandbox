# Browserless Skill

Browser automation using Browserless BrowserQL (GraphQL over HTTP). Works from Claude Code Web and other sandboxed cloud environments.

## Usage

```typescript
import { goto, screenshot, screenshotToFile } from '@super-sandbox/browserless';

// Navigate and take screenshot
await goto('https://example.com');
const path = await screenshotToFile();

// Custom options
const path2 = await screenshotToFile({
  filePath: './page.png',
  format: 'png',
  fullPage: true
});
```

## CLI

```bash
# Single screenshot
./skills/browserless/scripts/screenshot.sh https://example.com

# Responsive screenshots (all viewports)
./skills/browserless/scripts/screenshot.sh https://example.com --responsive

# Custom output
./skills/browserless/scripts/screenshot.sh https://example.com -o ./my-screenshot.jpg
```

## Setup

Requires `BROWSERLESS_TOKEN` environment variable. Get one at https://browserless.io

For Claude Code Web, also set `HTTPS_PROXY` for network access.

## API

### Navigation

- `goto(url)` - Navigate to URL, wait for network idle

### Interactions

- `click(selector)` - Click element by CSS selector
- `type(selector, text)` - Type text into element

### Screenshots

- `screenshot(options?)` - Take screenshot, returns base64
- `screenshotToFile(options?)` - Take screenshot, save to file

### Content

- `getHtml()` - Get page HTML
- `getText()` - Get page text content

### Responsive Capture

- `captureAtViewport(url, options)` - Capture single viewport
- `captureResponsiveScreenshots(url, options)` - Capture multiple viewports
- `VIEWPORT_PRESETS` - Common device presets
- `DEFAULT_VIEWPORTS` - Default viewport set

### Utilities

- `isConfigured()` - Check if BROWSERLESS_TOKEN is set
- `isClaudeCodeWeb()` - Check if running in CC Web
- `executeBql(query, variables?)` - Execute raw BrowserQL
- `executeFlow(query)` - Execute multi-step flow

## Viewport Presets

- Mobile: `iphoneSe`, `iphone14`, `iphone14ProMax`, `pixel7`, `galaxyS21`
- Tablet: `ipadMini`, `ipadPro11`
- Desktop: `desktop1080p`, `desktop1440p`

## See Also

- [docs/browserless.md](../../docs/browserless.md) - BrowserQL patterns and examples
- [docs/cloud-environments.md](../../docs/cloud-environments.md) - CC Web setup
