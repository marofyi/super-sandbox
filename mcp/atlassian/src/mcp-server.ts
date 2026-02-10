#!/usr/bin/env node
/**
 * Atlassian MCP Server
 *
 * Project-scoped access to Jira and Confluence.
 * Credentials: env vars or ~/.claude/atlassian.json
 * Project config: CLI flags (--jira-project-key, --confluence-space-key, etc.)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import os from "os";
import { AtlassianClient, JiraIssue, JiraAttachment, ConfluencePage, ConfluenceAttachment } from "./jira-client.js";

// Project config schema
interface ProjectConfig {
  jira?: {
    projectKey: string;
    boardId?: number;
    defaultIssueType?: string;
    defaultEpic?: string;  // Default epic for new issues (e.g., maintenance epic)
  };
  confluence?: {
    spaceKey: string;
    spaceId?: string;
    parentPageId?: string;
  };
}

// Parse project config from CLI flags
function parseConfigFromArgs(): ProjectConfig | null {
  const args = process.argv.slice(2);
  const config: ProjectConfig = {};
  let found = false;

  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case "--jira-project-key":
        if (!config.jira) config.jira = { projectKey: "" };
        config.jira.projectKey = value;
        found = true;
        i++;
        break;
      case "--jira-board-id":
        if (!config.jira) config.jira = { projectKey: "" };
        config.jira.boardId = Number(value);
        found = true;
        i++;
        break;
      case "--jira-default-issue-type":
        if (!config.jira) config.jira = { projectKey: "" };
        config.jira.defaultIssueType = value;
        found = true;
        i++;
        break;
      case "--jira-default-epic":
        if (!config.jira) config.jira = { projectKey: "" };
        config.jira.defaultEpic = value;
        found = true;
        i++;
        break;
      case "--confluence-space-key":
        if (!config.confluence) config.confluence = { spaceKey: "" };
        config.confluence.spaceKey = value;
        found = true;
        i++;
        break;
      case "--confluence-parent-page-id":
        if (!config.confluence) config.confluence = { spaceKey: "" };
        config.confluence.parentPageId = value;
        found = true;
        i++;
        break;
    }
  }

  if (!found) return null;

  console.error(`[MCP] Loaded config from CLI flags:`, JSON.stringify(config));
  return config;
}

// Credential tracking
let credentialSource = "unknown";
let resolvedBaseUrl = "";

// Initialize client — env vars first, then ~/.claude/atlassian.json fallback
// Returns null when no credentials are found (server enters missing_cred state)
function createClient(): AtlassianClient | null {
  // Tier 1: environment variables
  const envEmail = process.env.ATLASSIAN_EMAIL;
  const envToken = process.env.ATLASSIAN_API_TOKEN;
  const envUrl = process.env.ATLASSIAN_BASE_URL;

  if (envEmail && envToken && envUrl) {
    credentialSource = "environment variables";
    resolvedBaseUrl = envUrl;
    console.error(`[MCP] Credentials loaded from environment variables`);
    return new AtlassianClient({ email: envEmail, apiToken: envToken, baseUrl: envUrl });
  }

  // Tier 2: ~/.claude/atlassian.json
  const credPath = path.join(os.homedir(), ".claude", "atlassian.json");
  if (fs.existsSync(credPath)) {
    try {
      const creds = JSON.parse(fs.readFileSync(credPath, "utf-8"));
      if (creds.email && creds.apiToken && creds.baseUrl) {
        credentialSource = `~/.claude/atlassian.json`;
        resolvedBaseUrl = creds.baseUrl;
        console.error(`[MCP] Credentials loaded from ${credPath}`);
        return new AtlassianClient({ email: creds.email, apiToken: creds.apiToken, baseUrl: creds.baseUrl });
      }
      console.error(`[MCP] ${credPath} is missing required fields (email, apiToken, baseUrl)`);
    } catch (e) {
      if (e instanceof SyntaxError) {
        console.error(`[MCP] Failed to parse ${credPath}: ${e.message}`);
      }
    }
  }

  console.error("[MCP] No credentials found — server starting in missing_cred state");
  return null;
}

const MISSING_CRED_MESSAGE =
  "No Atlassian credentials configured. Run the `setup` prompt for a step-by-step guide, or provide credentials via:\n" +
  "  1. Environment variables: ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN, ATLASSIAN_BASE_URL\n" +
  "  2. Credential file: ~/.claude/atlassian.json with {email, apiToken, baseUrl}\n\n" +
  "After setting credentials, restart the MCP server.";

// Format file size as human-readable
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// Get MIME type from file extension
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".txt": "text/plain",
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".xml": "application/xml",
    ".pdf": "application/pdf",
    ".zip": "application/zip",
    ".gz": "application/gzip",
    ".tar": "application/x-tar",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".csv": "text/csv",
    ".md": "text/markdown",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

// Format attachments list for display
function formatAttachments(attachments: JiraAttachment[]): string[] {
  if (!attachments || attachments.length === 0) return [];

  const lines = [`- Attachments: ${attachments.length} file(s)`];
  attachments.forEach((a) => {
    lines.push(`  • ${a.filename} (ID: ${a.id}) - ${formatFileSize(a.size)}, ${a.mimeType}`);
  });
  return lines;
}

// Format issue for display
function formatIssue(issue: JiraIssue): string {
  const lines = [
    `**${issue.key}**: ${issue.fields?.summary ?? "No summary"}`,
    `- Status: ${issue.fields?.status?.name ?? "Unknown"}`,
    `- Type: ${issue.fields?.issuetype?.name ?? "Unknown"}`,
    `- Assignee: ${issue.fields?.assignee?.displayName ?? "Unassigned"}`,
    `- Priority: ${issue.fields?.priority?.name ?? "None"}`,
    `- Updated: ${issue.fields?.updated ?? "Unknown"}`,
  ];

  // Add attachments section
  const attachments = issue.fields?.attachment ?? [];
  lines.push(...formatAttachments(attachments));

  return lines.join("\n");
}

// Format page for display
function formatPage(page: any): string {
  return [
    `**${page.title}** (ID: ${page.id})`,
    `- Status: ${page.status ?? "Unknown"}`,
    page._links?.webui ? `- URL: ${page._links.base}${page._links.webui}` : "",
  ].filter(Boolean).join("\n");
}

// ============== HTML TABLE EXTRACTOR ==============

/**
 * Extract text content from HTML, removing all tags
 */
function extractTextFromHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract all tables from Confluence HTML storage format
 * Returns array of tables, each table is array of row objects with headers as keys
 */
function extractTablesFromHtml(html: string): Record<string, string>[][] {
  const tables: Record<string, string>[][] = [];

  // Find all <table> elements
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;

  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableHtml = tableMatch[1];
    const rows: Record<string, string>[] = [];
    const headers: string[] = [];

    // Extract all rows
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    let isFirstRow = true;

    while ((trMatch = trRegex.exec(tableHtml)) !== null) {
      const rowHtml = trMatch[1];

      // Check if this row has <th> elements (header row)
      if (rowHtml.includes("<th")) {
        const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
        let thMatch;
        while ((thMatch = thRegex.exec(rowHtml)) !== null) {
          headers.push(extractTextFromHtml(thMatch[1]));
        }
        isFirstRow = false;
        continue;
      }

      // Extract <td> cells
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells: string[] = [];
      let tdMatch;

      while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
        cells.push(extractTextFromHtml(tdMatch[1]));
      }

      // If no headers found yet and this is first row, use cells as headers
      if (headers.length === 0 && isFirstRow && cells.length > 0) {
        headers.push(...cells);
        isFirstRow = false;
        continue;
      }

      // Create row object if we have headers and cells
      if (headers.length > 0 && cells.length > 0 && cells.some((c) => c.length > 0)) {
        const row: Record<string, string> = {};
        headers.forEach((header, i) => {
          row[header] = cells[i] || "";
        });
        rows.push(row);
      }

      isFirstRow = false;
    }

    // Only add table if it has data rows
    if (rows.length > 0) {
      tables.push(rows);
    }
  }

  return tables;
}

// ============== MARKDOWN TO ADF CONVERTER ==============

interface AdfNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

interface AdfDocument {
  type: "doc";
  version: 1;
  content: AdfNode[];
}

/**
 * Convert markdown text to Atlassian Document Format (ADF)
 * Supports: headings (#), bullets (-), bold (**), italic (*), inline code (`), code blocks (```), tables (|)
 */
function markdownToAdf(markdown: string): AdfDocument {
  const lines = markdown.split("\n");
  const content: AdfNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table (| col | col |)
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableRows: AdfNode[] = [];
      let isFirstRow = true;
      let separatorSkipped = false;

      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        const rowLine = lines[i].trim();

        // Check if this is a separator row (|---|---|)
        if (rowLine.match(/^\|[\s\-:]+\|$/)) {
          separatorSkipped = true;
          i++;
          continue;
        }

        // Parse cells from the row
        const cells = rowLine
          .slice(1, -1) // Remove leading and trailing |
          .split("|")
          .map((cell) => cell.trim());

        const cellNodes: AdfNode[] = cells.map((cellText) => ({
          type: isFirstRow && !separatorSkipped ? "tableHeader" : "tableCell",
          attrs: {},
          content: [
            {
              type: "paragraph",
              content: parseInlineMarkdown(cellText),
            },
          ],
        }));

        tableRows.push({
          type: "tableRow",
          content: cellNodes,
        });

        if (isFirstRow && separatorSkipped) {
          isFirstRow = false;
        } else if (isFirstRow) {
          isFirstRow = false;
        }

        i++;
      }

      if (tableRows.length > 0) {
        content.push({
          type: "table",
          attrs: {
            isNumberColumnEnabled: false,
            layout: "default",
          },
          content: tableRows,
        });
      }
      continue;
    }

    // Code block (```)
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim() || undefined;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      content.push({
        type: "codeBlock",
        attrs: lang ? { language: lang } : undefined,
        content: [{ type: "text", text: codeLines.join("\n") }],
      });
      i++;
      continue;
    }

    // Heading (# ## ### etc.)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      content.push({
        type: "heading",
        attrs: { level },
        content: parseInlineMarkdown(headingMatch[2]),
      });
      i++;
      continue;
    }

    // Bullet list (- or *)
    if (line.match(/^[\-\*]\s+/)) {
      const listItems: AdfNode[] = [];
      while (i < lines.length && lines[i].match(/^[\-\*]\s+/)) {
        const itemText = lines[i].replace(/^[\-\*]\s+/, "");
        listItems.push({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: parseInlineMarkdown(itemText),
            },
          ],
        });
        i++;
      }
      content.push({
        type: "bulletList",
        content: listItems,
      });
      continue;
    }

    // Numbered list (1. 2. etc.)
    if (line.match(/^\d+\.\s+/)) {
      const listItems: AdfNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        const itemText = lines[i].replace(/^\d+\.\s+/, "");
        listItems.push({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: parseInlineMarkdown(itemText),
            },
          ],
        });
        i++;
      }
      content.push({
        type: "orderedList",
        content: listItems,
      });
      continue;
    }

    // Empty line - skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Regular paragraph
    content.push({
      type: "paragraph",
      content: parseInlineMarkdown(line),
    });
    i++;
  }

  return {
    type: "doc",
    version: 1,
    content,
  };
}

/**
 * Parse inline markdown: **bold**, *italic*, `code`, [links](url)
 */
function parseInlineMarkdown(text: string): AdfNode[] {
  const nodes: AdfNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      nodes.push({
        type: "text",
        text: boldMatch[1],
        marks: [{ type: "strong" }],
      });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic *text* (but not **)
    const italicMatch = remaining.match(/^\*([^*]+?)\*/);
    if (italicMatch) {
      nodes.push({
        type: "text",
        text: italicMatch[1],
        marks: [{ type: "em" }],
      });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Inline code `text`
    const codeMatch = remaining.match(/^`([^`]+?)`/);
    if (codeMatch) {
      nodes.push({
        type: "text",
        text: codeMatch[1],
        marks: [{ type: "code" }],
      });
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Link [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      nodes.push({
        type: "text",
        text: linkMatch[1],
        marks: [{ type: "link", attrs: { href: linkMatch[2] } }],
      });
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Plain text until next special character
    const plainMatch = remaining.match(/^[^*`\[]+/);
    if (plainMatch) {
      nodes.push({
        type: "text",
        text: plainMatch[0],
      });
      remaining = remaining.slice(plainMatch[0].length);
      continue;
    }

    // Single special character that didn't match a pattern
    nodes.push({
      type: "text",
      text: remaining[0],
    });
    remaining = remaining.slice(1);
  }

  return nodes;
}

/**
 * Upload attachments to a Confluence page and replace <attachment>filename</attachment>
 * placeholders in the content with <ac:image> macros.
 */
async function processAttachments(
  client: AtlassianClient,
  pageId: string,
  content: string,
  attachments: string[]
): Promise<string> {
  // Build a map of basename → file path for quick lookup
  const fileMap = new Map<string, string>();
  for (const filePath of attachments) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Attachment file not found: ${filePath}`);
    }
    fileMap.set(path.basename(filePath), filePath);
  }

  // Upload each attachment
  for (const [basename, filePath] of fileMap) {
    const buffer = fs.readFileSync(filePath);
    const mimeType = getMimeType(filePath);
    await client.addConfluenceAttachment(pageId, basename, buffer, mimeType);
  }

  // Replace placeholders with ac:image macros
  let processed = content;
  processed = processed.replace(
    /<attachment>([^<]+)<\/attachment>/g,
    (_match, filename: string) => {
      if (fileMap.has(filename)) {
        return `<ac:image><ri:attachment ri:filename="${filename}" /></ac:image>`;
      }
      // Leave unmatched placeholders as-is
      return _match;
    }
  );

  return processed;
}

async function main() {
  let config = parseConfigFromArgs();
  let client = createClient();

  // Guard: returns error content if client is not configured
  function requireClient(): { content: [{ type: "text"; text: string }] } | null {
    if (!client) {
      return { content: [{ type: "text" as const, text: MISSING_CRED_MESSAGE }] };
    }
    return null;
  }

  const server = new McpServer({
    name: "atlassian",
    version: "1.0.0",
  });

  // ============== JIRA TOOLS ==============

  server.tool(
    "jira_get_issues",
    "Get issues from the project's Jira board. Returns issues assigned to you or matching a JQL filter.",
    {
      filter: z.enum(["mine", "open", "recent", "custom"]).default("mine").describe("Filter type: mine (assigned to me), open (all open), recent (updated recently), custom (use jql param)"),
      jql: z.string().optional().describe("Custom JQL query (only used when filter=custom). Project scope is automatically applied."),
      limit: z.number().default(20).describe("Maximum number of issues to return"),
    },
    async ({ filter, jql, limit }) => {
      const noClient = requireClient(); if (noClient) return noClient;
      if (!config?.jira?.projectKey) {
        return { content: [{ type: "text", text: "No Jira project configured. Add .atlassian.json with jira.projectKey" }] };
      }

      const project = config.jira.projectKey;
      let query: string;

      switch (filter) {
        case "mine":
          query = `project = ${project} AND assignee = currentUser() ORDER BY updated DESC`;
          break;
        case "open":
          query = `project = ${project} AND status != Done AND status != Closed ORDER BY updated DESC`;
          break;
        case "recent":
          query = `project = ${project} AND updated >= -7d ORDER BY updated DESC`;
          break;
        case "custom":
          query = jql ? `project = ${project} AND (${jql})` : `project = ${project}`;
          break;
        default:
          query = `project = ${project} ORDER BY updated DESC`;
      }

      const result = await client!.searchIssues(query, { maxResults: limit });
      const text = result.issues.length > 0
        ? result.issues.map(formatIssue).join("\n\n---\n\n")
        : "No issues found.";

      return {
        content: [{ type: "text", text: `Found ${result.issues.length} issues:\n\n${text}` }],
      };
    }
  );

  server.tool(
    "jira_get_issue",
    "Get details of a specific Jira issue by key",
    {
      issueKey: z.string().describe("The issue key (e.g., VRL-2181)"),
    },
    async ({ issueKey }) => {
      const noClient = requireClient(); if (noClient) return noClient;
      const issue = await client!.getIssue(issueKey);
      const description = issue.fields?.description
        ? "\n\n**Description:**\n" + JSON.stringify(issue.fields.description)
        : "";

      return {
        content: [{ type: "text", text: formatIssue(issue) + description }],
      };
    }
  );

  server.tool(
    "jira_create_issue",
    "Create a new issue in the project's Jira board",
    {
      summary: z.string().describe("Issue title/summary"),
      issueType: z.string().default("Task").describe("Issue type: Task, Bug, Story, etc."),
      description: z.string().optional().describe("Issue description with markdown support: # headings, - bullets, **bold**, *italic*, `code`, ```code blocks```, | tables |"),
      assignToMe: z.boolean().default(false).describe("Assign the issue to yourself"),
      epicKey: z.string().optional().describe("Epic key to link this issue to. If not provided, uses default maintenance epic from config."),
    },
    async ({ summary, issueType, description, assignToMe, epicKey }) => {
      const noClient = requireClient(); if (noClient) return noClient;
      if (!config?.jira?.projectKey) {
        return { content: [{ type: "text", text: "No Jira project configured." }] };
      }

      // Use provided epic or fall back to default maintenance epic
      const parentEpic = epicKey || config.jira.defaultEpic;

      const fields: Record<string, unknown> = {
        project: { key: config.jira.projectKey },
        summary,
        issuetype: { name: issueType },
      };

      if (parentEpic) {
        fields.parent = { key: parentEpic };
      }

      if (description) {
        fields.description = markdownToAdf(description);
      }

      if (assignToMe) {
        const me = await client!.getMyself();
        fields.assignee = { accountId: me.accountId };
      }

      const result = await client!.createIssue(fields as any);
      const epicInfo = parentEpic ? ` (under ${parentEpic})` : "";
      return {
        content: [{ type: "text", text: `Created issue: **${result.key}**${epicInfo}\nURL: ${result.self}` }],
      };
    }
  );

  server.tool(
    "jira_add_subtask",
    "Add a subtask to an existing Jira issue",
    {
      parentKey: z.string().describe("Parent issue key (e.g., VRL-2181)"),
      summary: z.string().describe("Subtask title/summary"),
      description: z.string().optional().describe("Subtask description with markdown support: # headings, - bullets, **bold**, *italic*, `code`, ```code blocks```, | tables |"),
      assignToMe: z.boolean().default(false).describe("Assign the subtask to yourself"),
    },
    async ({ parentKey, summary, description, assignToMe }) => {
      const noClient = requireClient(); if (noClient) return noClient;
      if (!config?.jira?.projectKey) {
        return { content: [{ type: "text", text: "No Jira project configured." }] };
      }

      const fields: Record<string, unknown> = {
        project: { key: config.jira.projectKey },
        summary,
        issuetype: { name: "Sub-task" },
        parent: { key: parentKey },
      };

      if (description) {
        fields.description = markdownToAdf(description);
      }

      if (assignToMe) {
        const me = await client!.getMyself();
        fields.assignee = { accountId: me.accountId };
      }

      const result = await client!.createIssue(fields as any);
      return {
        content: [{ type: "text", text: `Created subtask: **${result.key}** (under ${parentKey})\nURL: ${result.self}` }],
      };
    }
  );

  server.tool(
    "jira_update_issue",
    "Update an existing Jira issue",
    {
      issueKey: z.string().describe("The issue key to update"),
      summary: z.string().optional().describe("New summary/title"),
      description: z.string().optional().describe("New description with markdown support: # headings, - bullets, **bold**, *italic*, `code`, ```code blocks```, | tables |"),
      comment: z.string().optional().describe("Add a comment to the issue (supports markdown including | tables |)"),
      epicKey: z.string().optional().describe("Epic key to link this issue to (e.g., 'VRL-2305')"),
    },
    async ({ issueKey, summary, description, comment, epicKey }) => {
      const noClient = requireClient(); if (noClient) return noClient;
      const updates: string[] = [];

      if (summary || description || epicKey) {
        const fields: Record<string, unknown> = {};
        if (summary) fields.summary = summary;
        if (description) {
          fields.description = markdownToAdf(description);
        }
        if (epicKey) {
          fields.parent = { key: epicKey };
        }
        await client!.updateIssue(issueKey, fields);
        updates.push("Updated issue fields");
        if (epicKey) updates.push(`Linked to epic ${epicKey}`);
      }

      if (comment) {
        await client!.addComment(issueKey, markdownToAdf(comment));
        updates.push("Added comment");
      }

      return {
        content: [{ type: "text", text: `${issueKey}: ${updates.join(", ")}` }],
      };
    }
  );

  server.tool(
    "jira_log_time",
    "Log time (worklog) on a Jira issue",
    {
      issueKey: z.string().describe("The issue key (e.g., VRL-123)"),
      timeSpent: z.string().describe("Time spent in human-readable format (e.g., '2h 30m', '45m', '1h')"),
      comment: z.string().optional().describe("Optional work description (supports markdown)"),
    },
    async ({ issueKey, timeSpent, comment }) => {
      const noClient = requireClient(); if (noClient) return noClient;
      // Parse human-readable time to seconds
      let totalSeconds = 0;
      const hoursMatch = timeSpent.match(/(\d+)\s*h/);
      const minutesMatch = timeSpent.match(/(\d+)\s*m/);
      if (hoursMatch) totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
      if (minutesMatch) totalSeconds += parseInt(minutesMatch[1], 10) * 60;

      if (totalSeconds === 0) {
        return {
          content: [{ type: "text", text: `Could not parse time "${timeSpent}". Use format like "2h 30m", "45m", or "1h".` }],
        };
      }

      const adfComment = comment ? markdownToAdf(comment) : undefined;
      const result = await client!.addWorklog(issueKey, totalSeconds, adfComment);

      return {
        content: [{ type: "text", text: `Logged ${timeSpent} on ${issueKey} (worklog ID: ${result.id})` }],
      };
    }
  );

  server.tool(
    "jira_transition_issue",
    "Change the status of an issue (move through workflow)",
    {
      issueKey: z.string().describe("The issue key"),
      status: z.string().optional().describe("Target status name (e.g., 'In Progress', 'Done'). If not provided, lists available transitions."),
    },
    async ({ issueKey, status }) => {
      const noClient = requireClient(); if (noClient) return noClient;
      const transitions = await client!.getTransitions(issueKey);

      if (!status) {
        const list = transitions.transitions.map((t) => `- ${t.name} (id: ${t.id})`).join("\n");
        return {
          content: [{ type: "text", text: `Available transitions for ${issueKey}:\n${list}` }],
        };
      }

      const transition = transitions.transitions.find(
        (t) => t.name.toLowerCase() === status.toLowerCase()
      );

      if (!transition) {
        return {
          content: [{ type: "text", text: `Transition "${status}" not found. Available: ${transitions.transitions.map((t) => t.name).join(", ")}` }],
        };
      }

      await client!.transitionIssue(issueKey, transition.id);
      return {
        content: [{ type: "text", text: `${issueKey} transitioned to: ${transition.name}` }],
      };
    }
  );

  server.tool(
    "jira_download_attachment",
    "Download a Jira attachment to the local filesystem",
    {
      attachmentId: z.string().describe("The attachment ID (shown when viewing issue attachments)"),
      destinationPath: z.string().describe("Local file path to save the attachment to"),
    },
    async ({ attachmentId, destinationPath }) => {
      const noClient = requireClient(); if (noClient) return noClient;
      try {
        // Get attachment metadata
        const attachment = await client!.getAttachment(attachmentId);

        // Download the content
        const content = await client!.downloadAttachment(attachment.content);

        // Ensure destination directory exists
        const destDir = path.dirname(destinationPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        // Write to file
        fs.writeFileSync(destinationPath, content);

        return {
          content: [{
            type: "text",
            text: `Downloaded attachment:\n- Filename: ${attachment.filename}\n- Size: ${formatFileSize(attachment.size)}\n- Type: ${attachment.mimeType}\n- Saved to: ${destinationPath}`,
          }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Failed to download attachment: ${message}` }],
        };
      }
    }
  );

  server.tool(
    "jira_add_attachment",
    "Upload a local file as an attachment to a Jira issue",
    {
      issueKey: z.string().describe("The issue key to attach the file to (e.g., VRL-2181)"),
      filePath: z.string().describe("Local file path to upload"),
      filename: z.string().optional().describe("Optional filename override (defaults to original filename)"),
    },
    async ({ issueKey, filePath, filename }) => {
      const noClient = requireClient(); if (noClient) return noClient;
      try {
        // Validate file exists
        if (!fs.existsSync(filePath)) {
          return {
            content: [{ type: "text", text: `File not found: ${filePath}` }],
          };
        }

        // Read file content
        const content = fs.readFileSync(filePath);

        // Get filename and MIME type
        const attachmentFilename = filename ?? path.basename(filePath);
        const mimeType = getMimeType(filePath);

        // Upload the attachment
        const result = await client!.addAttachment(issueKey, attachmentFilename, content, mimeType);

        if (result.length > 0) {
          const uploaded = result[0];
          return {
            content: [{
              type: "text",
              text: `Uploaded attachment to ${issueKey}:\n- Filename: ${uploaded.filename}\n- ID: ${uploaded.id}\n- Size: ${formatFileSize(uploaded.size)}\n- Type: ${uploaded.mimeType}`,
            }],
          };
        }

        return {
          content: [{ type: "text", text: `Attachment uploaded to ${issueKey}, but no metadata returned.` }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Failed to upload attachment: ${message}` }],
        };
      }
    }
  );

  // ============== CONFLUENCE TOOLS ==============

  server.tool(
    "confluence_search",
    "Search for pages in the project's Confluence space",
    {
      query: z.string().describe("Search query"),
      limit: z.number().default(10).describe("Maximum results"),
    },
    async ({ query, limit }) => {
      const noClient = requireClient(); if (noClient) return noClient;
      const spaceKey = config?.confluence?.spaceKey;
      const results = await client!.searchConfluencePages(query, { limit, spaceKey });

      if (results.results.length === 0) {
        return { content: [{ type: "text", text: "No pages found." }] };
      }

      const text = results.results.map(formatPage).join("\n\n");
      return {
        content: [{ type: "text", text: `Found ${results.results.length} pages:\n\n${text}` }],
      };
    }
  );

  server.tool(
    "confluence_get_page",
    "Get the content of a Confluence page, including its attachments",
    {
      pageId: z.string().describe("The page ID"),
    },
    async ({ pageId }) => {
      const noClient = requireClient(); if (noClient) return noClient;
      const page = await client!.getConfluencePage(pageId);
      const content = page.body?.storage?.value ?? "No content";

      // Fetch attachments
      let attachmentSection = "";
      try {
        const attachments = await client!.getConfluenceAttachments(pageId);
        if (attachments.length > 0) {
          const lines = attachments.map((a) =>
            `  - ${a.title} (ID: ${a.id}, ${formatFileSize(a.fileSize)}, ${a.mediaType}) — download with confluence_download_attachment`
          );
          attachmentSection = `\n\n**Attachments:** ${attachments.length} file(s)\n${lines.join("\n")}`;
        }
      } catch {
        // Attachment fetch failed — non-critical, skip
      }

      return {
        content: [{ type: "text", text: `${formatPage(page)}\n\n**Content:**\n${content}${attachmentSection}` }],
      };
    }
  );

  server.tool(
    "confluence_create_page",
    "Create a new page in the project's Confluence space",
    {
      title: z.string().describe("Page title"),
      content: z.string().describe("Page content in HTML/storage format. Use <attachment>filename</attachment> placeholders to place uploaded images."),
      parentPageId: z.string().optional().describe("Parent page ID (for nesting). Uses config default if not provided."),
      attachments: z.array(z.string()).optional().describe("Local file paths to upload as images. Use <attachment>filename</attachment> in content to place them."),
    },
    async ({ title, content, parentPageId, attachments }) => {
      const noClient = requireClient(); if (noClient) return noClient;
      if (!config?.confluence?.spaceId && !config?.confluence?.spaceKey) {
        return { content: [{ type: "text", text: "No Confluence space configured. Add .atlassian.json with confluence.spaceId" }] };
      }

      // Need spaceId for v2 API - if only spaceKey is configured, we need to look it up
      let spaceId = config.confluence.spaceId;
      if (!spaceId && config.confluence.spaceKey) {
        const space = await client!.getConfluenceSpaceByKey(config.confluence.spaceKey);
        if (!space) {
          return { content: [{ type: "text", text: `Space ${config.confluence.spaceKey} not found` }] };
        }
        spaceId = space.id;
      }

      const parent = parentPageId ?? config.confluence.parentPageId;
      const page = await client!.createConfluencePage(spaceId!, title, content, parent);

      // If attachments provided, upload them and update the page body with resolved placeholders
      if (attachments && attachments.length > 0) {
        try {
          const processedContent = await processAttachments(client!, page.id, content, attachments);
          await client!.updateConfluencePage(page.id, title, processedContent, 1);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text", text: `Created page: **${page.title}** (ID: ${page.id}), but attachment processing failed: ${message}` }],
          };
        }
      }

      return {
        content: [{ type: "text", text: `Created page: **${page.title}** (ID: ${page.id})` }],
      };
    }
  );

  server.tool(
    "confluence_update_page",
    "Update an existing Confluence page",
    {
      pageId: z.string().describe("The page ID to update"),
      title: z.string().optional().describe("New title (keeps existing if not provided)"),
      content: z.string().describe("New page content in HTML/storage format. Use <attachment>filename</attachment> placeholders to place uploaded images."),
      attachments: z.array(z.string()).optional().describe("Local file paths to upload as images. Use <attachment>filename</attachment> in content to place them."),
    },
    async ({ pageId, title, content, attachments }) => {
      const noClient = requireClient(); if (noClient) return noClient;
      // Get current page to get version and title
      const current = await client!.getConfluencePage(pageId);
      const newTitle = title ?? current.title;
      const version = current.version?.number ?? 1;

      // If attachments provided, upload them and replace placeholders
      let finalContent = content;
      if (attachments && attachments.length > 0) {
        try {
          finalContent = await processAttachments(client!, pageId, content, attachments);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text", text: `Failed to process attachments: ${message}` }],
          };
        }
      }

      const page = await client!.updateConfluencePage(pageId, newTitle, finalContent, version);
      return {
        content: [{ type: "text", text: `Updated page: **${page.title}** (version ${version + 1})` }],
      };
    }
  );

  // ============== CONFLUENCE TABLE EXTRACTION ==============

  server.tool(
    "confluence_extract_tables",
    "Extract all tables from a Confluence page as JSON. Table headers become JSON keys. Returns an array of tables, each containing an array of row objects.",
    {
      pageId: z.string().describe("The Confluence page ID"),
    },
    async ({ pageId }) => {
      const noClient = requireClient(); if (noClient) return noClient;
      try {
        const page = await client!.getConfluencePage(pageId);
        const html = page.body?.storage?.value;

        if (!html) {
          return { content: [{ type: "text", text: JSON.stringify({ error: "No content found in page" }) }] };
        }

        const tables = extractTablesFromHtml(html);

        const result = {
          pageId,
          pageTitle: page.title,
          tables,
        };

        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text", text: JSON.stringify({ error: message }) }] };
      }
    }
  );

  server.tool(
    "confluence_download_attachment",
    "Download a Confluence page attachment to the local filesystem",
    {
      pageId: z.string().describe("The Confluence page ID that has the attachment"),
      attachmentId: z.string().describe("The attachment ID (shown in confluence_get_page output)"),
      destinationPath: z.string().describe("Local file path to save the attachment to"),
    },
    async ({ pageId, attachmentId, destinationPath }) => {
      const noClient = requireClient(); if (noClient) return noClient;
      try {
        // Find the attachment in the page's attachment list
        const attachments = await client!.getConfluenceAttachments(pageId);
        const attachment = attachments.find((a) => a.id === attachmentId);

        if (!attachment) {
          const available = attachments.map((a) => `${a.title} (ID: ${a.id})`).join(", ");
          return {
            content: [{ type: "text", text: `Attachment ID ${attachmentId} not found on page ${pageId}. Available: ${available || "none"}` }],
          };
        }

        // Download the content
        const content = await client!.downloadConfluenceAttachment(attachment._links.download);

        // Ensure destination directory exists
        const destDir = path.dirname(destinationPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        // Write to file
        fs.writeFileSync(destinationPath, content);

        return {
          content: [{
            type: "text",
            text: `Downloaded attachment:\n- Filename: ${attachment.title}\n- Size: ${formatFileSize(attachment.fileSize)}\n- Type: ${attachment.mediaType}\n- Saved to: ${destinationPath}`,
          }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Failed to download attachment: ${message}` }],
        };
      }
    }
  );

  // ============== CONFIG/STATUS TOOLS ==============

  server.tool(
    "atlassian_configure",
    "Update Jira/Confluence configuration at runtime without restarting. Validates settings before applying.",
    {
      jiraProjectKey: z.string().optional().describe("Jira project key (e.g., 'VRL')"),
      jiraBoardId: z.number().optional().describe("Jira board ID"),
      confluenceSpaceKey: z.string().optional().describe("Confluence space key (e.g., 'VRDE')"),
      confluenceParentPageId: z.string().optional().describe("Default parent page ID for new pages"),
    },
    async ({ jiraProjectKey, jiraBoardId, confluenceSpaceKey, confluenceParentPageId }) => {
      const noClient = requireClient(); if (noClient) return noClient;
      const errors: string[] = [];
      const updates: string[] = [];

      // Initialize config if not exists
      if (!config) {
        config = {};
      }

      // Validate and update Jira config
      if (jiraProjectKey !== undefined) {
        try {
          const projects = await client!.getProjects();
          const project = projects.find((p) => p.key === jiraProjectKey);
          if (!project) {
            errors.push(`Jira project '${jiraProjectKey}' not found. Available: ${projects.map((p) => p.key).join(", ")}`);
          } else {
            if (!config.jira) config.jira = { projectKey: jiraProjectKey };
            config.jira.projectKey = jiraProjectKey;
            updates.push(`Jira project: ${jiraProjectKey} (${project.name})`);
          }
        } catch (e) {
          errors.push(`Failed to validate Jira project: ${e}`);
        }
      }

      if (jiraBoardId !== undefined && config.jira) {
        config.jira.boardId = jiraBoardId;
        updates.push(`Jira board ID: ${jiraBoardId}`);
      }

      // Validate and update Confluence config
      if (confluenceSpaceKey !== undefined) {
        try {
          const space = await client!.getConfluenceSpaceByKey(confluenceSpaceKey);
          if (!space) {
            errors.push(`Confluence space '${confluenceSpaceKey}' not found`);
          } else {
            if (!config.confluence) config.confluence = { spaceKey: confluenceSpaceKey };
            config.confluence.spaceKey = confluenceSpaceKey;
            config.confluence.spaceId = space.id;
            updates.push(`Confluence space: ${confluenceSpaceKey} (${space.name}, ID: ${space.id})`);
          }
        } catch (e) {
          errors.push(`Failed to validate Confluence space: ${e}`);
        }
      }

      if (confluenceParentPageId !== undefined) {
        try {
          const page = await client!.getConfluencePage(confluenceParentPageId);
          if (!config.confluence) config.confluence = { spaceKey: "" };
          config.confluence.parentPageId = confluenceParentPageId;
          updates.push(`Confluence parent page: ${page.title} (ID: ${confluenceParentPageId})`);
        } catch (e) {
          errors.push(`Failed to validate parent page ID '${confluenceParentPageId}': ${e}`);
        }
      }

      // If there are errors, don't save
      if (errors.length > 0) {
        return {
          content: [{
            type: "text",
            text: `Configuration validation failed:\n${errors.map((e) => `- ${e}`).join("\n")}`,
          }],
        };
      }

      if (updates.length === 0) {
        return {
          content: [{ type: "text", text: "No configuration changes provided." }],
        };
      }

      return {
        content: [{
          type: "text",
          text: `Configuration updated:\n${updates.map((u) => `- ${u}`).join("\n")}`,
        }],
      };
    }
  );

  server.tool(
    "atlassian_status",
    "Show current Atlassian configuration and connection status",
    {},
    async () => {
      if (!client) {
        return { content: [{ type: "text" as const, text: `**Status:** Not connected (no credentials configured)\n\n${MISSING_CRED_MESSAGE}` }] };
      }

      const me = await client.getMyself();

      const lines = [
        `**Connected as:** ${me.displayName} (${me.emailAddress})`,
        `**Base URL:** ${resolvedBaseUrl}`,
        `**Credentials:** ${credentialSource}`,
        "",
        "**Project Configuration:**",
      ];

      if (config) {
        if (config.jira) {
          lines.push(`- Jira Project: ${config.jira.projectKey}`);
          if (config.jira.boardId) lines.push(`- Board ID: ${config.jira.boardId}`);
        } else {
          lines.push("- Jira: Not configured");
        }
        if (config.confluence) {
          lines.push(`- Confluence Space: ${config.confluence.spaceKey ?? config.confluence.spaceId}`);
          if (config.confluence.parentPageId) lines.push(`- Parent Page: ${config.confluence.parentPageId}`);
        } else {
          lines.push("- Confluence: Not configured");
        }
      } else {
        lines.push("No project configured. Pass CLI flags (e.g., --jira-project-key) or use atlassian_configure.");
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // ============== PROMPTS ==============

  server.prompt(
    "standup",
    "Generate a standup summary from your recent Jira activity",
    async () => {
      if (!client) {
        return {
          messages: [{
            role: "user" as const,
            content: { type: "text" as const, text: MISSING_CRED_MESSAGE },
          }],
        };
      }

      if (!config?.jira?.projectKey) {
        return {
          messages: [{
            role: "user" as const,
            content: { type: "text" as const, text: "No Jira project configured. Use atlassian_configure first." },
          }],
        };
      }

      const project = config.jira.projectKey;

      // Fetch issues assigned to me, updated in last 24h
      const recent = await client.searchIssues(
        `project = ${project} AND assignee = currentUser() AND updated >= -1d ORDER BY updated DESC`,
        { maxResults: 20 }
      );

      // Fetch issues I completed recently
      const done = await client.searchIssues(
        `project = ${project} AND assignee = currentUser() AND status changed to Done DURING (-1d, now()) ORDER BY updated DESC`,
        { maxResults: 10 }
      );

      // Fetch my open issues (what's next)
      const open = await client.searchIssues(
        `project = ${project} AND assignee = currentUser() AND status != Done AND status != Closed ORDER BY priority DESC, updated DESC`,
        { maxResults: 10 }
      );

      const formatList = (issues: JiraIssue[]) =>
        issues.length > 0
          ? issues.map(i => `- ${i.key}: ${i.fields?.summary ?? "No summary"} [${i.fields?.status?.name ?? "?"}]`).join("\n")
          : "- None";

      const text = [
        `Here is my Jira activity for project ${project}. Please summarize this as a standup update with three sections: what I did, what I'm doing today, and any blockers.`,
        "",
        `## Recently updated (last 24h)`,
        formatList(recent.issues),
        "",
        `## Completed recently`,
        formatList(done.issues),
        "",
        `## Open issues (my backlog)`,
        formatList(open.issues),
      ].join("\n");

      return {
        messages: [{
          role: "user" as const,
          content: { type: "text" as const, text },
        }],
      };
    }
  );

  server.prompt(
    "setup",
    "Step-by-step guide to configure this Atlassian MCP server with credentials and project scope",
    async () => {
      const credFilePath = path.join("~", ".claude", "atlassian.json");

      const text = [
        "# Atlassian MCP Server — Setup Guide",
        "",
        "This MCP server needs three things: **credentials**, a **base URL**, and optionally **project scope**.",
        "",
        "---",
        "",
        "## Step 1: Get your Atlassian API token",
        "",
        "1. Go to https://id.atlassian.com/manage-profile/security/api-tokens",
        "2. Click **Create API token**",
        "3. Give it a label (e.g., \"MCP Server\") and click **Create**",
        "4. Copy the token — you won't be able to see it again",
        "",
        "## Step 2: Find your base URL",
        "",
        "Your Atlassian base URL looks like `https://yourcompany.atlassian.net`.",
        "You can find it in the browser address bar when logged into Jira or Confluence.",
        "",
        "## Step 3: Configure credentials",
        "",
        "You have **two options** (the server checks both, env vars take priority):",
        "",
        "### Option A: Environment variables (recommended for CI/automation)",
        "",
        "Set these three variables before starting the MCP server:",
        "",
        "```bash",
        "export ATLASSIAN_EMAIL=\"your.email@company.com\"",
        "export ATLASSIAN_API_TOKEN=\"your_api_token_here\"",
        "export ATLASSIAN_BASE_URL=\"https://yourcompany.atlassian.net\"",
        "```",
        "",
        "Or add them to your MCP server config in `claude_desktop_config.json`:",
        "",
        "```json",
        "{",
        '  "mcpServers": {',
        '    "atlassian": {',
        '      "command": "node",',
        '      "args": ["/path/to/dist/mcp-server.js", "--jira-project-key", "MYPROJ"],',
        '      "env": {',
        '        "ATLASSIAN_EMAIL": "your.email@company.com",',
        '        "ATLASSIAN_API_TOKEN": "your_api_token_here",',
        '        "ATLASSIAN_BASE_URL": "https://yourcompany.atlassian.net"',
        "      }",
        "    }",
        "  }",
        "}",
        "```",
        "",
        `### Option B: Credential file (recommended for local development)`,
        "",
        `Create \`${credFilePath}\` with:`,
        "",
        "```json",
        "{",
        '  "email": "your.email@company.com",',
        '  "apiToken": "your_api_token_here",',
        '  "baseUrl": "https://yourcompany.atlassian.net"',
        "}",
        "```",
        "",
        "## Step 4: Configure project scope (optional)",
        "",
        "Pass CLI flags when starting the server to scope tools to a specific project:",
        "",
        "| Flag | Description | Example |",
        "|------|-------------|---------|",
        "| `--jira-project-key` | Jira project key | `MYPROJ` |",
        "| `--jira-board-id` | Jira board ID | `42` |",
        "| `--jira-default-epic` | Default epic for new issues | `MYPROJ-100` |",
        "| `--confluence-space-key` | Confluence space key | `ENG` |",
        "| `--confluence-parent-page-id` | Default parent page for new pages | `123456` |",
        "",
        "Or use the `atlassian_configure` tool at runtime to set these without restarting.",
        "",
        "---",
        "",
        "## Verify",
        "",
        "Once configured, call the `atlassian_status` tool to verify the connection works.",
      ].join("\n");

      return {
        messages: [{
          role: "user" as const,
          content: { type: "text" as const, text },
        }],
      };
    }
  );

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[MCP] Atlassian MCP server started");
}

main().catch((e) => {
  console.error("[MCP] Fatal error:", e);
  process.exit(1);
});
