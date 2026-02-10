/**
 * End-to-end tests for the Atlassian MCP server.
 *
 * These tests spawn the real server as a child process and call every tool
 * via the MCP Client SDK — the exact same path Claude Code uses.
 *
 * All config is read from .env (loaded by test/setup.ts):
 *   ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN, ATLASSIAN_BASE_URL
 *   TEST_JIRA_PROJECT_KEY, TEST_JIRA_BOARD_ID, TEST_JIRA_DEFAULT_EPIC
 *   TEST_CONFLUENCE_SPACE_KEY, TEST_CONFLUENCE_PARENT_PAGE_ID
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnServer, type ServerHandle } from "./helpers.js";
import { AtlassianClient } from "../src/jira-client.js";
import fs from "fs";
import path from "path";
import os from "os";

// ── Read test config from .env ──────────────────────────────────────
const env = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}. Check your .env file.`);
  return v;
};

const JIRA_PROJECT_KEY = env("TEST_JIRA_PROJECT_KEY");
const JIRA_BOARD_ID = env("TEST_JIRA_BOARD_ID");
const JIRA_DEFAULT_EPIC = env("TEST_JIRA_DEFAULT_EPIC");
const CONFLUENCE_SPACE_KEY = env("TEST_CONFLUENCE_SPACE_KEY");
const CONFLUENCE_PARENT_PAGE_ID = env("TEST_CONFLUENCE_PARENT_PAGE_ID");

// Set TEST_SKIP_CLEANUP=true to keep created issues/pages for manual inspection
const SKIP_CLEANUP = process.env.TEST_SKIP_CLEANUP === "true";

// Direct API client for cleanup (bypasses MCP server)
const cleanupClient = new AtlassianClient({
  email: env("ATLASSIAN_EMAIL"),
  apiToken: env("ATLASSIAN_API_TOKEN"),
  baseUrl: env("ATLASSIAN_BASE_URL"),
});

// ====================================================================
//  1. NO CONFIG — server started without any CLI flags
// ====================================================================
describe("no config flags", () => {
  let s: ServerHandle;

  beforeAll(async () => {
    s = await spawnServer(); // no args
  });
  afterAll(async () => s?.close());

  it("atlassian_status shows not configured", async () => {
    const text = await s.callTool("atlassian_status");
    expect(text).toContain("Connected as:");
    expect(text).toContain("No project configured");
  });

  it("jira_get_issues returns not-configured message", async () => {
    const text = await s.callTool("jira_get_issues", { filter: "mine" });
    expect(text).toContain("No Jira project configured");
  });

  it("jira_create_issue returns not-configured message", async () => {
    const text = await s.callTool("jira_create_issue", { summary: "test" });
    expect(text).toContain("No Jira project configured");
  });

  it("jira_add_subtask returns not-configured message", async () => {
    const text = await s.callTool("jira_add_subtask", {
      parentKey: "FAKE-1",
      summary: "test",
    });
    expect(text).toContain("No Jira project configured");
  });

  it("confluence_create_page returns not-configured message", async () => {
    const text = await s.callTool("confluence_create_page", {
      title: "t",
      content: "<p>x</p>",
    });
    expect(text).toContain("No Confluence space configured");
  });

  it("confluence_search still works (space filter is optional)", async () => {
    const text = await s.callTool("confluence_search", { query: "test" });
    // Should not error — just returns results without space scope
    expect(text).toMatch(/Found \d+ pages|No pages found/);
  });

  it("atlassian_configure with no params returns no-changes message", async () => {
    const text = await s.callTool("atlassian_configure", {});
    expect(text).toContain("No configuration changes provided");
  });
});

// ====================================================================
//  2. WITH CONFIG — full project scope via CLI flags
// ====================================================================
describe("with config flags", () => {
  let s: ServerHandle;
  const createdIssueKeys: string[] = [];
  const createdPageIds: string[] = [];

  beforeAll(async () => {
    s = await spawnServer({
      args: [
        "--jira-project-key", JIRA_PROJECT_KEY,
        "--jira-board-id", JIRA_BOARD_ID,
        "--jira-default-epic", JIRA_DEFAULT_EPIC,
        "--confluence-space-key", CONFLUENCE_SPACE_KEY,
        "--confluence-parent-page-id", CONFLUENCE_PARENT_PAGE_ID,
      ],
    });
  });
  afterAll(async () => {
    await s?.close();
    if (SKIP_CLEANUP) {
      console.log(`⏭️  TEST_SKIP_CLEANUP=true — keeping ${createdIssueKeys.length} issues and ${createdPageIds.length} pages`);
      return;
    }
    // Delete created resources (issues first, then pages)
    for (const key of createdIssueKeys) {
      try { await cleanupClient.deleteIssue(key); } catch {}
    }
    for (const id of createdPageIds) {
      try { await cleanupClient.deleteConfluencePage(id); } catch {}
    }
  });

  // ── atlassian_status ────────────────────────────────────────────
  it("atlassian_status shows config and credentials", async () => {
    const text = await s.callTool("atlassian_status");
    expect(text).toContain("Connected as:");
    expect(text).toContain("Credentials:");
    expect(text).toContain(`Jira Project: ${JIRA_PROJECT_KEY}`);
    expect(text).toContain(`Board ID: ${JIRA_BOARD_ID}`);
    expect(text).toContain(`Confluence Space: ${CONFLUENCE_SPACE_KEY}`);
    expect(text).toContain(`Parent Page: ${CONFLUENCE_PARENT_PAGE_ID}`);
  });

  // ── jira_get_issues ─────────────────────────────────────────────
  it("jira_get_issues filter=mine", async () => {
    const text = await s.callTool("jira_get_issues", { filter: "mine", limit: 5 });
    expect(text).toMatch(/Found \d+ issues/);
  });

  it("jira_get_issues filter=open", async () => {
    const text = await s.callTool("jira_get_issues", { filter: "open", limit: 5 });
    expect(text).toMatch(/Found \d+ issues/);
  });

  it("jira_get_issues filter=recent", async () => {
    const text = await s.callTool("jira_get_issues", { filter: "recent", limit: 5 });
    expect(text).toMatch(/Found \d+ issues/);
  });

  it("jira_get_issues filter=custom with jql", async () => {
    const text = await s.callTool("jira_get_issues", {
      filter: "custom",
      jql: "status = 'In Progress'",
      limit: 5,
    });
    expect(text).toMatch(/Found \d+ issues/);
  });

  // ── jira_get_issue ──────────────────────────────────────────────
  it("jira_get_issue returns issue details", async () => {
    // First grab an issue key from the project
    const listText = await s.callTool("jira_get_issues", { filter: "recent", limit: 1 });
    const keyMatch = listText.match(new RegExp(`\\*\\*(${JIRA_PROJECT_KEY}-\\d+)\\*\\*`));
    expect(keyMatch).toBeTruthy();

    const text = await s.callTool("jira_get_issue", { issueKey: keyMatch![1] });
    expect(text).toContain(keyMatch![1]);
    expect(text).toContain("Status:");
  });

  // ── jira_create_issue ───────────────────────────────────────────
  let createdIssueKey: string;

  it("jira_create_issue creates a task", async () => {
    const text = await s.callTool("jira_create_issue", {
      summary: "[TEST] vitest e2e — delete me",
      issueType: "Task",
      description: "Automated test issue created by vitest e2e suite.",
    });
    expect(text).toContain("Created issue:");
    const m = text.match(new RegExp(`\\*\\*(${JIRA_PROJECT_KEY}-\\d+)\\*\\*`));
    expect(m).toBeTruthy();
    createdIssueKey = m![1];
    createdIssueKeys.push(createdIssueKey);
  });

  // ── jira_add_subtask ────────────────────────────────────────────
  let subtaskKey: string;

  it("jira_add_subtask creates a subtask under the new issue", async () => {
    expect(createdIssueKey).toBeDefined();
    const text = await s.callTool("jira_add_subtask", {
      parentKey: createdIssueKey,
      summary: "[TEST] subtask — delete me",
      description: "Subtask created by vitest e2e suite.",
      assignToMe: true,
    });
    expect(text).toContain("Created subtask:");
    expect(text).toContain(createdIssueKey);
    const m = text.match(new RegExp(`\\*\\*(${JIRA_PROJECT_KEY}-\\d+)\\*\\*`));
    expect(m).toBeTruthy();
    subtaskKey = m![1];
    // subtask is deleted via parent's deleteSubtasks=true, but track just in case
    createdIssueKeys.push(subtaskKey);
  });

  it("jira_get_issues can find subtasks", async () => {
    const text = await s.callTool("jira_get_issues", {
      filter: "custom",
      jql: "issuetype = Sub-task",
      limit: 5,
    });
    expect(text).toMatch(/Found \d+ issues/);
    expect(text).not.toContain("Found 0 issues");
  });

  // ── jira_update_issue ───────────────────────────────────────────
  it("jira_update_issue updates summary and adds comment", async () => {
    expect(createdIssueKey).toBeDefined();
    const text = await s.callTool("jira_update_issue", {
      issueKey: createdIssueKey,
      summary: "[TEST] vitest e2e — updated title",
      comment: "Comment added by vitest e2e suite.",
    });
    expect(text).toContain(createdIssueKey);
    expect(text).toContain("Updated issue fields");
    expect(text).toContain("Added comment");
  });

  // ── jira_log_time ──────────────────────────────────────────────
  it("jira_log_time logs time on an issue", async () => {
    expect(createdIssueKey).toBeDefined();
    const text = await s.callTool("jira_log_time", {
      issueKey: createdIssueKey,
      timeSpent: "1h 30m",
      comment: "Time logged by vitest e2e suite.",
    });
    expect(text).toContain(createdIssueKey);
    expect(text).toContain("Logged");
  });

  // ── jira_transition_issue ───────────────────────────────────────
  it("jira_transition_issue lists transitions when no status given", async () => {
    expect(createdIssueKey).toBeDefined();
    const text = await s.callTool("jira_transition_issue", {
      issueKey: createdIssueKey,
    });
    expect(text).toContain("Available transitions");
  });

  it("jira_transition_issue returns error for invalid status", async () => {
    expect(createdIssueKey).toBeDefined();
    const text = await s.callTool("jira_transition_issue", {
      issueKey: createdIssueKey,
      status: "NonExistentStatus_12345",
    });
    expect(text).toContain("not found");
  });

  // ── confluence_search ───────────────────────────────────────────
  it("confluence_search returns results", async () => {
    const text = await s.callTool("confluence_search", { query: "test", limit: 3 });
    expect(text).toMatch(/Found \d+ pages|No pages found/);
  });

  // ── confluence_get_page ─────────────────────────────────────────
  it("confluence_get_page returns page content", async () => {
    const text = await s.callTool("confluence_get_page", {
      pageId: CONFLUENCE_PARENT_PAGE_ID,
    });
    expect(text).toContain("Content:");
  });

  // ── confluence_extract_tables ───────────────────────────────────
  it("confluence_extract_tables returns JSON", async () => {
    const text = await s.callTool("confluence_extract_tables", {
      pageId: CONFLUENCE_PARENT_PAGE_ID,
    });
    const parsed = JSON.parse(text);
    expect(parsed).toHaveProperty("pageId");
    expect(parsed).toHaveProperty("tables");
  });

  // ── confluence_create_page + confluence_update_page ─────────────
  let createdPageId: string;

  it("confluence_create_page creates a page", async () => {
    const text = await s.callTool("confluence_create_page", {
      title: `[TEST] vitest e2e ${Date.now()}`,
      content: "<p>Automated test page — safe to delete.</p>",
    });
    expect(text).toContain("Created page:");
    const m = text.match(/ID: (\d+)/);
    expect(m).toBeTruthy();
    createdPageId = m![1];
    createdPageIds.push(createdPageId);
  });

  it("confluence_update_page updates the test page", async () => {
    expect(createdPageId).toBeDefined();
    const text = await s.callTool("confluence_update_page", {
      pageId: createdPageId,
      content: "<p>Updated by vitest e2e suite.</p>",
    });
    expect(text).toContain("Updated page:");
    expect(text).toContain("version");
  });

  // ── confluence attachment placeholders ──────────────────────────

  it("confluence_create_page with image placeholder uploads and replaces", async () => {
    // Create a minimal 1x1 PNG (smallest valid PNG)
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, // 8-bit RGB
      0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
      0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
      0xe2, 0x21, 0xbc, 0x33,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, // IEND chunk
      0xae, 0x42, 0x60, 0x82,
    ]);
    const tmpFile = path.join(os.tmpdir(), `test-img-${Date.now()}.png`);
    fs.writeFileSync(tmpFile, pngHeader);

    try {
      const text = await s.callTool("confluence_create_page", {
        title: `[TEST] image placeholder ${Date.now()}`,
        content: `<p>Before image</p><attachment>${path.basename(tmpFile)}</attachment><p>After image</p>`,
        attachments: [tmpFile],
      });
      expect(text).toContain("Created page:");
      const m = text.match(/ID: (\d+)/);
      if (m) createdPageIds.push(m[1]);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it("confluence_update_page with image placeholder uploads and replaces", async () => {
    expect(createdPageId).toBeDefined();
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde,
      0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54,
      0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
      0xe2, 0x21, 0xbc, 0x33,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
      0xae, 0x42, 0x60, 0x82,
    ]);
    const tmpFile = path.join(os.tmpdir(), `test-update-img-${Date.now()}.png`);
    fs.writeFileSync(tmpFile, pngHeader);

    try {
      const text = await s.callTool("confluence_update_page", {
        pageId: createdPageId,
        content: `<p>Updated with image</p><attachment>${path.basename(tmpFile)}</attachment>`,
        attachments: [tmpFile],
      });
      expect(text).toContain("Updated page:");
      expect(text).toContain("version");
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it("placeholder without matching attachment file stays as-is", async () => {
    const text = await s.callTool("confluence_create_page", {
      title: `[TEST] unmatched placeholder ${Date.now()}`,
      content: `<p>Image here:</p><attachment>missing.png</attachment>`,
    });
    // No attachments array provided — placeholder is harmless, page should still be created
    expect(text).toContain("Created page:");
    const m = text.match(/ID: (\d+)/);
    if (m) createdPageIds.push(m[1]);
  });

  it("attachment file not found returns error", async () => {
    const text = await s.callTool("confluence_create_page", {
      title: `[TEST] bad attachment ${Date.now()}`,
      content: `<p>Image:</p><attachment>ghost.png</attachment>`,
      attachments: ["/tmp/nonexistent-file-for-test-12345.png"],
    });
    expect(text).toContain("attachment processing failed");
    expect(text).toContain("not found");
  });

  // ── standup prompt ─────────────────────────────────────────────
  it("standup prompt returns recent activity", async () => {
    const result = await s.client.getPrompt({ name: "standup" });
    expect(result.messages.length).toBeGreaterThan(0);
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("Recently updated");
    expect(text).toContain("Open issues");
  });

  // ── atlassian_configure (runtime update) ────────────────────────
  it("atlassian_configure validates and updates project key", async () => {
    const text = await s.callTool("atlassian_configure", {
      jiraProjectKey: JIRA_PROJECT_KEY,
    });
    expect(text).toContain("Configuration updated");
    expect(text).toContain(JIRA_PROJECT_KEY);
  });

  it("atlassian_configure rejects invalid project key", async () => {
    const text = await s.callTool("atlassian_configure", {
      jiraProjectKey: "ZZZNONEXISTENT999",
    });
    expect(text).toContain("validation failed");
  });
});

// ====================================================================
//  3. PARTIAL CONFIG — only Jira flags, no Confluence
// ====================================================================
describe("partial config (jira only)", () => {
  let s: ServerHandle;

  beforeAll(async () => {
    s = await spawnServer({
      args: ["--jira-project-key", JIRA_PROJECT_KEY],
    });
  });
  afterAll(async () => s?.close());

  it("jira tools work", async () => {
    const text = await s.callTool("jira_get_issues", { filter: "recent", limit: 1 });
    expect(text).toMatch(/Found \d+ issues/);
  });

  it("confluence_create_page returns not-configured", async () => {
    const text = await s.callTool("confluence_create_page", {
      title: "t",
      content: "<p>x</p>",
    });
    expect(text).toContain("No Confluence space configured");
  });

  it("atlassian_status shows Jira configured, Confluence not", async () => {
    const text = await s.callTool("atlassian_status");
    expect(text).toContain(`Jira Project: ${JIRA_PROJECT_KEY}`);
    expect(text).toContain("Confluence: Not configured");
  });
});

// ====================================================================
//  4. PARTIAL CONFIG — only Confluence flags, no Jira
// ====================================================================
describe("partial config (confluence only)", () => {
  let s: ServerHandle;

  beforeAll(async () => {
    s = await spawnServer({
      args: [
        "--confluence-space-key", CONFLUENCE_SPACE_KEY,
        "--confluence-parent-page-id", CONFLUENCE_PARENT_PAGE_ID,
      ],
    });
  });
  afterAll(async () => s?.close());

  it("jira_get_issues returns not-configured", async () => {
    const text = await s.callTool("jira_get_issues", { filter: "mine" });
    expect(text).toContain("No Jira project configured");
  });

  it("jira_create_issue returns not-configured", async () => {
    const text = await s.callTool("jira_create_issue", { summary: "x" });
    expect(text).toContain("No Jira project configured");
  });

  it("jira_add_subtask returns not-configured", async () => {
    const text = await s.callTool("jira_add_subtask", {
      parentKey: "FAKE-1",
      summary: "x",
    });
    expect(text).toContain("No Jira project configured");
  });

  it("confluence_search works", async () => {
    const text = await s.callTool("confluence_search", { query: "test", limit: 2 });
    expect(text).toMatch(/Found \d+ pages|No pages found/);
  });

  it("atlassian_status shows Confluence configured, Jira not", async () => {
    const text = await s.callTool("atlassian_status");
    expect(text).toContain(`Confluence Space: ${CONFLUENCE_SPACE_KEY}`);
    expect(text).toContain("Jira: Not configured");
  });
});

// ====================================================================
//  5. CREDENTIAL RESOLUTION
// ====================================================================
describe("credential resolution", () => {
  let s: ServerHandle;

  afterAll(async () => s?.close());

  it("server starts without credentials and returns setup message", async () => {
    // Wipe all credential env vars so neither tier works
    s = await spawnServer({
      env: {
        ATLASSIAN_EMAIL: "",
        ATLASSIAN_API_TOKEN: "",
        ATLASSIAN_BASE_URL: "",
        // Override HOME so ~/.claude/atlassian.json can't be found
        HOME: "/tmp/nonexistent-home-for-test",
      },
    });

    // Server should be running — tools return setup guidance
    const text = await s.callTool("atlassian_status");
    expect(text).toContain("No Atlassian credentials configured");
    expect(text).toContain("setup");
  });

  it("all tools return setup message when no credentials", async () => {
    const text = await s.callTool("jira_get_issues", { filter: "mine" });
    expect(text).toContain("No Atlassian credentials configured");
  });
});
