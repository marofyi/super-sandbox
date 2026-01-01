# Changelog

All notable changes and discoveries in this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## 2026-01

### Documentation

- Introduced documentation navigation principle: docs now work like a website with clear entry points
- `README.md` serves as the homepage for humans; `AGENTS.md` serves as the homepage for AI agents
- Every doc now includes a "See Also" section linking to related guides and entry points

---

## 2025-12

### Added

- Standalone CLI for `@research/browserless` package for capturing screenshots
  - Single screenshot: `pnpm --filter @research/browserless screenshot <url>`
  - Responsive (all viewports): `pnpm --filter @research/browserless screenshot <url> --responsive`
  - Specific viewport: `pnpm --filter @research/browserless screenshot <url> --viewport iphone14`

### Changed

- Shared `@research/browserless` helpers `captureResponsiveScreenshots()` and `captureAtViewport()` consolidate viewport lists and full-page options
- Errors now surface per-viewport with counts for faster CI failure detection
- Static HTML prototypes in `projects/*.html` auto-deploy to GitHub Pages via `.github/workflows/deploy-github-pages.yml`

---

## 2025-02

### Documentation

- Consolidated CC Web docs (`cc-web-setup`, `cc-web-network-guide`, `cc-web-browser-automation`) into single `docs/cc-web.md`
- Archived Steel/Stagehand Cloud Run playbook (`docs/archive/browser-automation.md`) - WebSocket-based CDP remains blocked in CC Web

---

## 2024-12

### Added

- `@research/browserless` package for BrowserQL-driven screenshot utilities
- Responsive visual QA via CLI or programmatic API (`captureResponsiveScreenshots()`)

### Fixed

- Node.js fetch failures in CC Web resolved by using `undici` with `ProxyAgent`
  - Root cause: CC Web routes traffic through egress proxy; native fetch ignores proxy env vars

### Discovered

#### CC Web Network Architecture

| Component | Value |
|-----------|-------|
| DNS Server | `127.0.0.1` (broken) |
| `HTTPS_PROXY` | Routes to egress proxy |
| `CLAUDE_CODE_PROXY_RESOLVES_HOSTS` | `true` |

The proxy handles DNS resolution, not the container. Node.js native `fetch` fails because it attempts direct DNS lookup.

#### Browser Automation Constraints

- **Failed**: Steel Browser + CDP via Playwright/Stagehand (WebSocket blocked in CC Web)
- **Working**: Browserless BrowserQL (pure HTTP POST, no WebSocket required)

| Feature | CDP/Playwright | BrowserQL |
|---------|---------------|-----------|
| Protocol | WebSocket | HTTP POST |
| Works in CC Web | No | Yes |

#### Vercel Deployment

- Prefer Vercel CLI over direct API calls for more reliable authentication
- When `VERCEL_ORG_ID` is set without `VERCEL_PROJECT_ID`, unset both:
  ```bash
  VERCEL_ORG_ID= VERCEL_PROJECT_ID= pnpm exec vercel link --project <name> --yes
  ```
- Git remotes in CC Web point to local proxy; use `-R owner/repo` flag with `gh` CLI

#### API Gotchas

- **Timeout units**: Browserless uses milliseconds (use `60000` not `60` for 60 seconds)
- **GraphQL enums**: Some APIs are case-sensitive (use `jpeg` not `JPEG`)

---

## References

- [Browserless BrowserQL Docs](https://docs.browserless.io/browserql-interactions)
- [Steel Browser](https://github.com/steel-dev/steel-browser)
- [Vercel Monorepos](https://vercel.com/docs/monorepos)

## See Also

- [README.md](./README.md) - Project overview and navigation
- [AGENTS.md](./AGENTS.md) - Agent workflow and documentation structure
- [docs/browserless.md](./docs/browserless.md) - Browser automation client and CLI usage
