# Browser Automation from Claude Code Web

Claude Code Web's sandbox blocks WebSocket connections, which breaks CDP-based tools (Playwright, Puppeteer, Stagehand).

## Solution: Browserless BrowserQL

Use [Browserless](https://browserless.io) with BrowserQL - a GraphQL API over **HTTP POST**.

| Approach | Protocol | CC Web Compatible |
|----------|----------|-------------------|
| Playwright/CDP | WebSocket | No |
| Browserless BrowserQL | HTTP POST | Yes |

### Usage

See `@research/browserless` package for a ready-to-use client.

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

## See Also

- [Browserless BrowserQL Docs](https://docs.browserless.io/browserql-interactions)
- [Learnings Log](./learnings-log.md) - Why CDP-based approaches failed
