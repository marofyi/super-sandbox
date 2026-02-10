# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Atlassian MCP server providing project-scoped access to Jira and Confluence for AI assistants. Communicates via stdio using the Model Context Protocol SDK. TypeScript, Node.js, no framework beyond MCP SDK and Zod.

## Commands

```bash
pnpm install              # Install dependencies
pnpm run build            # Compile TypeScript → dist/
pnpm test                 # Run E2E tests (requires .env with credentials)
pnpm run test:no-cleanup  # Run tests, keep created issues/pages for inspection
pnpm run test:watch       # Watch mode
npx vitest run test/e2e.test.ts -t "test name"  # Run single test
pnpm run mcp              # Start MCP server (node dist/mcp-server.js)
```

Build before testing — tests spawn `dist/mcp-server.js` as a child process.

## Architecture

Three source files with clear separation:

- **`src/jira-client.ts`** — `AtlassianClient` class: pure HTTP client using native `fetch` + Basic Auth. Defines TypeScript interfaces (`JiraIssue`, `ConfluencePage`, `JiraAttachment`, `AdfDocument`). No MCP knowledge.
- **`src/mcp-server.ts`** — MCP server: registers 18 tools (9 Jira, 6 Confluence, 2 config) and 2 prompts (setup, standup). Handles credential resolution (env vars → `~/.claude/atlassian.json` fallback), CLI flag parsing for project scope, and content format conversion (Markdown → ADF, HTML → JSON tables).
- **`src/index.ts`** — Demo CLI entry point, not used in production.

Data flow: Claude Code → stdio → mcp-server.ts (validate with Zod, transform) → AtlassianClient → Atlassian REST API.

## Key Patterns

- **Credential resolution**: env vars (`ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN`, `ATLASSIAN_BASE_URL`) take priority, falls back to `~/.claude/atlassian.json`. Implemented in `createClient()` at top of `mcp-server.ts`.
- **Project scoping**: CLI flags (`--jira-project-key`, `--jira-board-id`, `--confluence-space-key`, etc.) parsed by `parseConfigFromArgs()`. Tools auto-scope queries to configured project.
- **Content conversion**: `markdownToAdf()` converts markdown descriptions to Atlassian Document Format for Jira issues. `extractTablesFromHtml()` parses Confluence HTML tables to JSON. Both use regex-based parsing, no DOM libraries.
- **Tool registration**: Each tool uses `server.tool(name, description, zodSchema, handler)` pattern from MCP SDK.
- **Runtime config**: `atlassian_configure` tool allows updating project scope without restarting.
- **Prompts**: `standup` generates a standup summary from recent Jira activity. `setup` returns a step-by-step guide for configuring credentials and project scope (API token creation, env vars vs credential file, CLI flags) — intended for the calling AI to walk the user through setup.

## Testing

E2E tests only — no unit tests. Tests spawn the real compiled server as a child process and connect via MCP Client SDK (`test/helpers.ts:spawnServer()`).

Tests require a `.env` file with valid Atlassian credentials and test project configuration (see `.env.example`). Tests hit the live Atlassian API.

Tests auto-cleanup created Jira issues and Confluence pages after each suite. Use `pnpm run test:no-cleanup` to skip deletion and inspect created resources in Atlassian.

Test suites cover: no config flags, full config flags, partial config (Jira only / Confluence only), and credential resolution.

## Configuration

- **TypeScript**: ES2022 target, ESNext modules, strict mode
- **Module system**: ESM (`"type": "module"` in package.json)
- **No linter or formatter configured**
- **No CI/CD pipeline**
