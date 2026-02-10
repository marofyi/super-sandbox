# Atlassian MCP Server

A Model Context Protocol (MCP) server providing project-scoped access to Jira and Confluence for AI assistants like Claude Code.

## Overview

The Atlassian MCP Server enables AI assistants to interact with Jira and Confluence through a standardized protocol. It uses API Token authentication (no OAuth or admin approval required) and scopes access to specific projects via CLI flags.

### Key Features

- **Project-scoped access** - Configure per-project Jira/Confluence settings via CLI flags
- **Centralized credentials** - Store credentials once in `~/.claude/atlassian.json` (or use env vars)
- **Clean `.mcp.json`** - No `env` block needed, no config files in project repos
- **Runtime configuration** - Update settings without server restart
- **Full CRUD operations** - Create, read, update issues and pages

## Installation

### Prerequisites

- Node.js 18+
- Atlassian API Token (generate at [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens))

### Setup

```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm run build
```

## Credentials

Credentials are resolved in order of priority:

### Option 1: Environment Variables (highest priority)

| Variable | Description | Example |
|----------|-------------|---------|
| `ATLASSIAN_EMAIL` | Your Atlassian account email | user@company.com |
| `ATLASSIAN_API_TOKEN` | API token from Atlassian | ATATT3x... |
| `ATLASSIAN_BASE_URL` | Your Atlassian instance URL | https://company.atlassian.net |

All three must be set. If any is missing, falls through to Option 2.

### Option 2: Credential File (recommended)

Create `~/.claude/atlassian.json`:

```json
{
  "email": "user@company.com",
  "apiToken": "ATATT3x...",
  "baseUrl": "https://company.atlassian.net"
}
```

This keeps credentials out of your project repos and `.mcp.json` files.

## Project Configuration

Project scope is configured via CLI flags passed in `.mcp.json`:

| Flag | Maps to | Type | Description |
|------|---------|------|-------------|
| `--jira-project-key` | `jira.projectKey` | string | Jira project key (e.g., "VRL") |
| `--jira-board-id` | `jira.boardId` | number | Board ID for board-specific queries |
| `--jira-default-issue-type` | `jira.defaultIssueType` | string | Default issue type for new issues |
| `--jira-default-epic` | `jira.defaultEpic` | string | Default epic for new issues |
| `--confluence-space-key` | `confluence.spaceKey` | string | Confluence space key (e.g., "VRDE") |
| `--confluence-parent-page-id` | `confluence.parentPageId` | string | Default parent page for new pages |

## Claude Code Integration

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "atlassian": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/path/to/dist/mcp-server.js",
        "--jira-project-key", "VRL",
        "--jira-board-id", "1800",
        "--jira-default-epic", "VRL-2305",
        "--confluence-space-key", "VRDE",
        "--confluence-parent-page-id", "1211498508"
      ]
    }
  }
}
```

No `env` block is needed when using `~/.claude/atlassian.json` for credentials.

## Available Tools

### Jira Tools

#### `jira_get_issues`

Get issues from the project's Jira board.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `filter` | enum | "mine" | Filter: mine, open, recent, custom |
| `jql` | string | - | Custom JQL (when filter=custom) |
| `limit` | number | 20 | Maximum issues to return |

#### `jira_get_issue`

Get details of a specific issue.

| Parameter | Type | Description |
|-----------|------|-------------|
| `issueKey` | string | Issue key (e.g., "VRL-123") |

#### `jira_create_issue`

Create a new issue in the project.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `summary` | string | - | Issue title (required) |
| `issueType` | string | "Task" | Issue type: Task, Bug, Story, etc. |
| `description` | string | - | Issue description |
| `assignToMe` | boolean | false | Assign to yourself |
| `epicKey` | string | - | Epic key (uses default from config if omitted) |

#### `jira_add_subtask`

Add a subtask to an existing Jira issue.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `parentKey` | string | - | Parent issue key, e.g. "VRL-2181" (required) |
| `summary` | string | - | Subtask title (required) |
| `description` | string | - | Subtask description (markdown) |
| `assignToMe` | boolean | false | Assign to yourself |

#### `jira_update_issue`

Update an existing issue.

| Parameter | Type | Description |
|-----------|------|-------------|
| `issueKey` | string | Issue key to update (required) |
| `summary` | string | New summary/title |
| `description` | string | New description |
| `comment` | string | Add a comment |
| `epicKey` | string | Epic key to link to |

#### `jira_log_time`

Log time (worklog) on a Jira issue.

| Parameter | Type | Description |
|-----------|------|-------------|
| `issueKey` | string | Issue key (required) |
| `timeSpent` | string | Time in human-readable format, e.g. "2h 30m", "45m", "1h" (required) |
| `comment` | string | Optional work description (markdown) |

#### `jira_transition_issue`

Change issue status (workflow transition).

| Parameter | Type | Description |
|-----------|------|-------------|
| `issueKey` | string | Issue key (required) |
| `status` | string | Target status name. If omitted, lists available transitions. |

#### `jira_download_attachment`

Download a Jira attachment to the local filesystem.

| Parameter | Type | Description |
|-----------|------|-------------|
| `attachmentId` | string | Attachment ID (required) |
| `destinationPath` | string | Local file path to save to (required) |

#### `jira_add_attachment`

Upload a local file as an attachment to a Jira issue.

| Parameter | Type | Description |
|-----------|------|-------------|
| `issueKey` | string | Issue key (required) |
| `filePath` | string | Local file path to upload (required) |
| `filename` | string | Optional filename override |

### Confluence Tools

#### `confluence_search`

Search for pages in the configured space.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | - | Search query (required) |
| `limit` | number | 10 | Maximum results |

#### `confluence_get_page`

Get page content by ID. Also lists attachments on the page (filename, ID, size, media type) so the calling AI can decide whether to download them via `confluence_download_attachment`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pageId` | string | Page ID (required) |

#### `confluence_create_page`

Create a new page in the configured space. Supports inline image attachments via `<attachment>filename</attachment>` placeholders.

| Parameter | Type | Description |
|-----------|------|-------------|
| `title` | string | Page title (required) |
| `content` | string | HTML/storage format content (required). Use `<attachment>filename</attachment>` to place uploaded images. |
| `parentPageId` | string | Parent page ID (uses config default if omitted) |
| `attachments` | string[] | Local file paths to upload. Filenames are matched against `<attachment>` placeholders in content. |

#### `confluence_update_page`

Update an existing page. Supports inline image attachments via `<attachment>filename</attachment>` placeholders.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pageId` | string | Page ID to update (required) |
| `title` | string | New title (keeps existing if omitted) |
| `content` | string | New content in HTML/storage format (required). Use `<attachment>filename</attachment>` to place uploaded images. |
| `attachments` | string[] | Local file paths to upload. Filenames are matched against `<attachment>` placeholders in content. |

#### `confluence_download_attachment`

Download a Confluence page attachment to the local filesystem.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pageId` | string | Page ID that has the attachment (required) |
| `attachmentId` | string | Attachment ID from `confluence_get_page` output (required) |
| `destinationPath` | string | Local file path to save to (required) |

#### `confluence_extract_tables`

Extract all tables from a Confluence page as JSON.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pageId` | string | Page ID (required) |

### Configuration Tools

#### `atlassian_configure`

Update configuration at runtime without restarting. Validates settings before applying.

| Parameter | Type | Description |
|-----------|------|-------------|
| `jiraProjectKey` | string | Jira project key |
| `jiraBoardId` | number | Jira board ID |
| `confluenceSpaceKey` | string | Confluence space key |
| `confluenceParentPageId` | string | Default parent page ID |

#### `atlassian_status`

Show current configuration and connection status. Displays credential source, base URL, and project config. No parameters.

### Prompts

#### `setup`

Step-by-step guide to configure the MCP server. Returns instructions covering API token creation, credential options (env vars vs `~/.claude/atlassian.json`), CLI flags, and `claude_desktop_config.json` examples. Designed for the calling AI to walk the user through first-time setup.

#### `standup`

Generates a standup summary from recent Jira activity. Fetches issues updated in the last 24 hours, recently completed issues, and your open backlog, then asks the AI to format them as a standup update.

## API Client Reference

The `AtlassianClient` class provides low-level API access:

### Jira Methods

| Method | Description |
|--------|-------------|
| `getMyself()` | Get current user info |
| `searchIssues(jql, options)` | Search with JQL |
| `getIssue(issueKey)` | Get single issue |
| `createIssue(fields)` | Create issue |
| `updateIssue(issueKey, fields)` | Update issue |
| `addComment(issueKey, body)` | Add comment |
| `addWorklog(issueKey, timeSpentSeconds, comment?)` | Log time on issue |
| `transitionIssue(issueKey, transitionId)` | Change status |
| `getTransitions(issueKey)` | Get available transitions |
| `deleteIssue(issueKey)` | Delete issue (and its subtasks) |
| `getProjects()` | List all projects |

### Confluence Methods

| Method | Description |
|--------|-------------|
| `searchConfluencePages(query, options)` | Search pages |
| `getConfluencePage(pageId)` | Get page by ID |
| `getConfluencePages(spaceKey)` | List pages in space |
| `createConfluencePage(spaceId, title, body, parentId?)` | Create page |
| `updateConfluencePage(pageId, title, body, version)` | Update page |
| `getConfluenceSpaces()` | List all spaces |
| `getConfluenceAttachments(pageId)` | List attachments on a page |
| `downloadConfluenceAttachment(downloadPath)` | Download attachment by path |
| `deleteConfluencePage(pageId)` | Delete page |
| `getConfluenceSpaceByKey(spaceKey)` | Get space by key |

## Project Structure

```
atlassian-mcp/
├── src/
│   ├── mcp-server.ts    # MCP server with tool definitions
│   ├── jira-client.ts   # Atlassian API client
│   └── index.ts         # Alternative entry point
├── dist/                # Compiled JavaScript
├── package.json
└── tsconfig.json
```

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@modelcontextprotocol/sdk` | ^1.25.3 | MCP server implementation |
| `zod` | ^4.3.6 | Schema validation for tool parameters |
| `typescript` | ^5.3.0 | TypeScript compiler (dev) |

## Scripts

```bash
pnpm run build          # Compile TypeScript
pnpm run start          # Run index.js
pnpm run mcp            # Run MCP server directly
pnpm test               # Run E2E tests (auto-cleans created resources)
pnpm run test:no-cleanup # Run tests, keep created issues/pages for inspection
pnpm run test:watch     # Watch mode
```

## Troubleshooting

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| No Atlassian credentials found | Neither env vars nor credential file configured | Set env vars or create `~/.claude/atlassian.json` |
| Space not found | Space key not in first 25 results | Use `atlassian_configure` to set space (caches spaceId) |
| No project configured | No CLI flags passed | Add `--jira-project-key` etc. to args in `.mcp.json` |
| API request failed: 401 | Invalid credentials | Regenerate API token |
| API request failed: 403 | Insufficient permissions | Check user permissions in Atlassian |

### Debug Logging

The server logs to stderr. Check Claude Code logs for `[MCP]` prefixed messages.

## License

MIT
