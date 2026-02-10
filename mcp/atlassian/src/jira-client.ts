/**
 * Simple Jira & Confluence client using API Token authentication
 * No OAuth, no admin approval needed - just your email + API token
 */

export interface Config {
  email: string;
  apiToken: string;
  baseUrl: string; // e.g., "https://yourcompany.atlassian.net"
}

export interface JiraAttachment {
  id: string;
  self: string;
  filename: string;
  mimeType: string;
  size: number;
  content: string; // Download URL
  author: { accountId: string; displayName: string; emailAddress?: string };
  created: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    status: { name: string };
    assignee?: { displayName: string; emailAddress: string };
    priority?: { name: string };
    issuetype?: { name: string };
    created: string;
    updated: string;
    description?: unknown;
    attachment?: JiraAttachment[];
    [key: string]: unknown;
  };
}

export interface SearchResult {
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

export interface ConfluencePage {
  id: string;
  title: string;
  status: string;
  spaceId: string;
  body?: {
    storage?: { value: string };
    view?: { value: string };
  };
  version?: { number: number };
  _links: { webui: string; base: string };
}

export interface ConfluenceAttachment {
  id: string;
  title: string;
  status: string;
  mediaType: string;
  fileSize: number;
  comment?: string;
  _links: { download: string };
}

export interface ConfluenceSearchResult {
  results: ConfluencePage[];
  _links: { next?: string };
}

export class AtlassianClient {
  private authHeader: string;
  private baseUrl: string;

  constructor(config: Config) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.authHeader =
      "Basic " + Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${response.status} - ${error}`);
    }

    // Handle empty responses (e.g., 204 No Content from PUT/DELETE)
    const contentLength = response.headers.get("content-length");
    if (response.status === 204 || contentLength === "0") {
      return undefined as T;
    }

    const text = await response.text();
    if (!text || text.trim() === "") {
      return undefined as T;
    }

    return JSON.parse(text);
  }

  // ============== JIRA API ==============

  /**
   * Get current user info
   */
  async getMyself(): Promise<{ accountId: string; displayName: string; emailAddress: string }> {
    return this.request(`${this.baseUrl}/rest/api/3/myself`);
  }

  /**
   * Search issues using JQL
   */
  async searchIssues(
    jql: string,
    options: { startAt?: number; maxResults?: number; fields?: string[] } = {}
  ): Promise<SearchResult> {
    const fields = options.fields ?? ["summary", "status", "assignee", "priority", "issuetype", "created", "updated", "attachment"];
    const params = new URLSearchParams({
      jql,
      maxResults: String(options.maxResults ?? 50),
      fields: fields.join(","),
    });
    if (options.startAt) {
      params.set("startAt", String(options.startAt));
    }
    const result = await this.request<{ issues: JiraIssue[]; nextPageToken?: string; isLast?: boolean; total?: number }>(
      `${this.baseUrl}/rest/api/3/search/jql?${params}`
    );
    return {
      startAt: options.startAt ?? 0,
      maxResults: options.maxResults ?? 50,
      total: result.total ?? result.issues.length,
      issues: result.issues,
    };
  }

  /**
   * Get issues assigned to me
   */
  async getMyIssues(maxResults = 50): Promise<SearchResult> {
    return this.searchIssues("assignee = currentUser() ORDER BY updated DESC", { maxResults });
  }

  /**
   * Get issues I'm watching
   */
  async getWatchedIssues(maxResults = 50): Promise<SearchResult> {
    return this.searchIssues("watcher = currentUser() ORDER BY updated DESC", { maxResults });
  }

  /**
   * Get a specific issue
   */
  async getIssue(issueKey: string): Promise<JiraIssue> {
    return this.request(`${this.baseUrl}/rest/api/3/issue/${issueKey}?fields=*all`);
  }

  /**
   * Create a new issue
   */
  async createIssue(fields: {
    project: { key: string };
    summary: string;
    issuetype: { name: string };
    description?: unknown;
    [key: string]: unknown;
  }): Promise<{ id: string; key: string; self: string }> {
    return this.request(`${this.baseUrl}/rest/api/3/issue`, {
      method: "POST",
      body: JSON.stringify({ fields }),
    });
  }

  /**
   * Update an issue
   */
  async updateIssue(issueKey: string, fields: Record<string, unknown>): Promise<void> {
    await this.request(`${this.baseUrl}/rest/api/3/issue/${issueKey}`, {
      method: "PUT",
      body: JSON.stringify({ fields }),
    });
  }

  /**
   * Add a comment to an issue
   */
  async addComment(
    issueKey: string,
    body: unknown
  ): Promise<{ id: string; body: unknown }> {
    // Accept either a string (legacy) or an ADF document
    const adfBody = typeof body === "string"
      ? {
          type: "doc",
          version: 1,
          content: [{ type: "paragraph", content: [{ type: "text", text: body }] }],
        }
      : body;

    return this.request(`${this.baseUrl}/rest/api/3/issue/${issueKey}/comment`, {
      method: "POST",
      body: JSON.stringify({ body: adfBody }),
    });
  }

  /**
   * Add a worklog entry to an issue
   */
  async addWorklog(
    issueKey: string,
    timeSpentSeconds: number,
    comment?: unknown
  ): Promise<{ id: string; self: string; timeSpentSeconds: number }> {
    const body: Record<string, unknown> = { timeSpentSeconds };
    if (comment) body.comment = comment;
    return this.request(`${this.baseUrl}/rest/api/3/issue/${issueKey}/worklog`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Transition an issue (change status)
   */
  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    await this.request(`${this.baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
      method: "POST",
      body: JSON.stringify({ transition: { id: transitionId } }),
    });
  }

  /**
   * Get available transitions for an issue
   */
  async getTransitions(issueKey: string): Promise<{ transitions: { id: string; name: string }[] }> {
    return this.request(`${this.baseUrl}/rest/api/3/issue/${issueKey}/transitions`);
  }

  // ============== ATTACHMENT API ==============

  /**
   * Get attachment metadata by ID
   */
  async getAttachment(attachmentId: string): Promise<JiraAttachment> {
    return this.request(`${this.baseUrl}/rest/api/3/attachment/${attachmentId}`);
  }

  /**
   * Download attachment content as Buffer
   */
  async downloadAttachment(contentUrl: string): Promise<Buffer> {
    const response = await fetch(contentUrl, {
      headers: {
        Authorization: this.authHeader,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download attachment: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Add an attachment to an issue
   */
  async addAttachment(
    issueKey: string,
    filename: string,
    content: Buffer,
    mimeType: string
  ): Promise<JiraAttachment[]> {
    const boundary = `----FormBoundary${Date.now()}`;
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
      ),
      content,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const response = await fetch(
      `${this.baseUrl}/rest/api/3/issue/${issueKey}/attachments`,
      {
        method: "POST",
        headers: {
          Authorization: this.authHeader,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "X-Atlassian-Token": "no-check",
        },
        body,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to upload attachment: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Delete an issue (and its subtasks)
   */
  async deleteIssue(issueKey: string): Promise<void> {
    await this.request(`${this.baseUrl}/rest/api/3/issue/${issueKey}?deleteSubtasks=true`, {
      method: "DELETE",
    });
  }

  /**
   * Get all projects
   */
  async getProjects(): Promise<{ id: string; key: string; name: string }[]> {
    return this.request(`${this.baseUrl}/rest/api/3/project`);
  }

  // ============== CONFLUENCE API ==============

  /**
   * Search Confluence pages
   */
  async searchConfluencePages(
    query: string,
    options: { limit?: number; spaceKey?: string } = {}
  ): Promise<ConfluenceSearchResult> {
    const params = new URLSearchParams({
      cql: options.spaceKey ? `text ~ "${query}" AND space = "${options.spaceKey}"` : `text ~ "${query}"`,
      limit: String(options.limit ?? 25),
    });
    return this.request(`${this.baseUrl}/wiki/rest/api/content/search?${params}`);
  }

  /**
   * Get a Confluence page by ID
   */
  async getConfluencePage(
    pageId: string,
    expand = "body.storage,version"
  ): Promise<ConfluencePage> {
    return this.request(`${this.baseUrl}/wiki/api/v2/pages/${pageId}?body-format=storage`);
  }

  /**
   * Get Confluence pages in a space
   */
  async getConfluencePages(spaceKey: string, limit = 25): Promise<ConfluenceSearchResult> {
    const params = new URLSearchParams({
      cql: `space = "${spaceKey}" ORDER BY lastmodified DESC`,
      limit: String(limit),
    });
    return this.request(`${this.baseUrl}/wiki/rest/api/content/search?${params}`);
  }

  /**
   * Create a Confluence page
   */
  async createConfluencePage(
    spaceId: string,
    title: string,
    body: string,
    parentId?: string
  ): Promise<ConfluencePage> {
    const payload: Record<string, unknown> = {
      spaceId,
      title,
      status: "current",
      body: {
        representation: "storage",
        value: body,
      },
    };
    if (parentId) {
      payload.parentId = parentId;
    }
    return this.request(`${this.baseUrl}/wiki/api/v2/pages`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /**
   * Update a Confluence page
   */
  async updateConfluencePage(
    pageId: string,
    title: string,
    body: string,
    version: number
  ): Promise<ConfluencePage> {
    return this.request(`${this.baseUrl}/wiki/api/v2/pages/${pageId}`, {
      method: "PUT",
      body: JSON.stringify({
        id: pageId,
        status: "current",
        title,
        body: {
          representation: "storage",
          value: body,
        },
        version: { number: version + 1 },
      }),
    });
  }

  /**
   * Get attachments for a Confluence page
   */
  async getConfluenceAttachments(pageId: string): Promise<ConfluenceAttachment[]> {
    const result = await this.request<{ results: ConfluenceAttachment[] }>(
      `${this.baseUrl}/wiki/rest/api/content/${pageId}/child/attachment?expand=version`
    );
    return result.results;
  }

  /**
   * Download a Confluence attachment by its download path
   */
  async downloadConfluenceAttachment(downloadPath: string): Promise<Buffer> {
    const url = `${this.baseUrl}/wiki${downloadPath}`;
    return this.downloadAttachment(url);
  }

  /**
   * Delete a Confluence page
   */
  async deleteConfluencePage(pageId: string): Promise<void> {
    await this.request(`${this.baseUrl}/wiki/api/v2/pages/${pageId}`, {
      method: "DELETE",
    });
  }

  /**
   * Get Confluence spaces
   */
  async getConfluenceSpaces(): Promise<{ results: { id: string; key: string; name: string }[] }> {
    return this.request(`${this.baseUrl}/wiki/api/v2/spaces`);
  }

  /**
   * Get a specific Confluence space by key
   */
  async getConfluenceSpaceByKey(spaceKey: string): Promise<{ id: string; key: string; name: string } | null> {
    const result = await this.request<{ results: { id: string; key: string; name: string }[] }>(
      `${this.baseUrl}/wiki/api/v2/spaces?keys=${encodeURIComponent(spaceKey)}`
    );
    return result.results.length > 0 ? result.results[0] : null;
  }

  /**
   * Add an attachment to a Confluence page
   */
  async addConfluenceAttachment(
    pageId: string,
    filename: string,
    content: Buffer,
    mimeType: string
  ): Promise<{ results: { id: string; title: string; extensions: { mediaType: string; fileSize: number } }[] }> {
    const boundary = `----FormBoundary${Date.now()}`;
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
      ),
      content,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const response = await fetch(
      `${this.baseUrl}/wiki/rest/api/content/${pageId}/child/attachment`,
      {
        method: "POST",
        headers: {
          Authorization: this.authHeader,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "X-Atlassian-Token": "no-check",
        },
        body,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to upload Confluence attachment: ${response.status} - ${error}`);
    }

    return response.json();
  }

}
