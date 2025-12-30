---
name: visual-qa
description: Capture and analyze visual QA screenshots using Browserless. Use when testing responsive layouts, verifying UI changes, or running visual regression tests for web projects.
allowed-tools: Read Bash Glob
---

# Visual QA

Capture responsive screenshots for web projects using Browserless BrowserQL.

## Quick Start

```bash
# Run visual QA for TanStack Chat
pnpm --filter @research/tanstack-chat test:visual
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BROWSERLESS_TOKEN` | Yes | BrowserQL auth token |
| `BROWSERLESS_URL` | No | Custom endpoint (defaults to Chrome BQL) |
| `TEST_URL` | No | Override target URL for preview deployments |

## How It Works

1. Uses `@research/browserless` package for HTTP-only browser automation
2. Captures screenshots at multiple viewport sizes
3. Saves optimized JPEGs to `/tmp` by default
4. Works in sandboxed environments (no WebSocket required)

## Targeting Preview Deployments

```bash
TEST_URL="https://preview-xyz.vercel.app" pnpm --filter @research/tanstack-chat test:visual
```

## Troubleshooting

- **No screenshots**: Check `BROWSERLESS_TOKEN` is set
- **Proxy errors**: Ensure `HTTPS_PROXY` handling in CC Web environments
- **Timeout**: BQL defaults to 60s; increase if needed for slow pages
