/**
 * Browserless BrowserQL Client
 *
 * Uses BrowserQL (GraphQL-based) API for browser automation over pure HTTP.
 * Works from Claude Code Web and other sandboxed environments.
 *
 * @see https://docs.browserless.io/browserql-interactions
 */

const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
const BROWSERLESS_URL =
  process.env.BROWSERLESS_URL ||
  "https://production-sfo.browserless.io/chrome/bql";

export interface BqlResponse<T = unknown> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export interface GotoResult {
  goto: {
    status: number;
    url: string;
    time: number;
  };
}

export interface ClickResult {
  click: {
    x: number;
    y: number;
    time: number;
  };
}

export interface TypeResult {
  type: {
    x: number;
    y: number;
    time: number;
  };
}

export interface HtmlResult {
  html: {
    html: string;
  };
}

export interface TextResult {
  text: {
    text: string;
  };
}

export interface ScreenshotResult {
  screenshot: {
    base64: string;
  };
}

export interface ScreenshotOptions {
  /** Image format: 'jpeg' (default, smaller), 'png', or 'webp' */
  format?: "jpeg" | "png" | "webp";
  /** Quality 0-100, only applies to jpeg/webp (default: 80) */
  quality?: number;
  /** Capture full page instead of viewport (default: false) */
  fullPage?: boolean;
  /** Optimize for speed over size (default: true) */
  optimizeForSpeed?: boolean;
}

/**
 * Execute a BrowserQL query against Browserless
 */
export async function executeBql<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!BROWSERLESS_TOKEN) {
    throw new Error(
      "BROWSERLESS_TOKEN is required. Get one at https://browserless.io"
    );
  }

  const timeout = 60; // 60 seconds
  const url = `${BROWSERLESS_URL}?token=${BROWSERLESS_TOKEN}&timeout=${timeout}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`Browserless request failed: ${response.statusText}`);
  }

  const result = (await response.json()) as BqlResponse<T>;

  if (result.errors && result.errors.length > 0) {
    const firstError = result.errors[0];
    throw new Error(`BrowserQL error: ${firstError?.message ?? "Unknown error"}`);
  }

  if (!result.data) {
    throw new Error("No data returned from BrowserQL");
  }

  return result.data;
}

/**
 * Navigate to a URL and return status
 */
export async function goto(url: string): Promise<GotoResult> {
  const query = `
    mutation Navigate($url: String!) {
      goto(url: $url, waitUntil: networkIdle, timeout: 30000) {
        status
        url
        time
      }
    }
  `;
  return executeBql<GotoResult>(query, { url });
}

/**
 * Click an element by selector
 */
export async function click(selector: string): Promise<ClickResult> {
  const query = `
    mutation Click($selector: String!) {
      click(selector: $selector, visible: true, timeout: 10000) {
        x
        y
        time
      }
    }
  `;
  return executeBql<ClickResult>(query, { selector });
}

/**
 * Type text into an element
 */
export async function type(
  selector: string,
  text: string
): Promise<TypeResult> {
  const query = `
    mutation Type($selector: String!, $text: String!) {
      type(selector: $selector, text: $text, delay: [50, 100]) {
        x
        y
        time
      }
    }
  `;
  return executeBql<TypeResult>(query, { selector, text });
}

/**
 * Get page HTML
 */
export async function getHtml(): Promise<string> {
  const query = `
    mutation GetHtml {
      html {
        html
      }
    }
  `;
  const result = await executeBql<HtmlResult>(query);
  return result.html.html;
}

/**
 * Get page text content
 */
export async function getText(): Promise<string> {
  const query = `
    mutation GetText {
      text {
        text
      }
    }
  `;
  const result = await executeBql<TextResult>(query);
  return result.text.text;
}

/**
 * Take a screenshot (returns base64)
 *
 * @param options - Screenshot options (format, quality, fullPage, optimizeForSpeed)
 */
export async function screenshot(options: ScreenshotOptions = {}): Promise<string> {
  const {
    format = "jpeg",
    quality = 80,
    fullPage = false,
    optimizeForSpeed = true,
  } = options;

  const query = `
    mutation Screenshot($type: ScreenshotType!, $quality: Int!, $fullPage: Boolean!, $optimizeForSpeed: Boolean!) {
      screenshot(type: $type, quality: $quality, fullPage: $fullPage, optimizeForSpeed: $optimizeForSpeed) {
        base64
      }
    }
  `;
  const result = await executeBql<ScreenshotResult>(query, {
    type: format.toUpperCase(),
    quality,
    fullPage,
    optimizeForSpeed,
  });
  return result.screenshot.base64;
}

export interface ScreenshotToFileOptions extends ScreenshotOptions {
  /** File path to save screenshot (default: /tmp/screenshot.jpg) */
  filePath?: string;
}

/**
 * Take a screenshot and save to a file
 * Returns the file path - use Claude's Read tool to view it
 *
 * Optimized defaults:
 * - JPEG format (5-10x smaller than PNG)
 * - 80% quality (good balance of size/clarity)
 * - Saves to /tmp for faster writes
 * - optimizeForSpeed enabled
 *
 * @param options - Screenshot and file options
 * @returns The absolute file path where screenshot was saved
 *
 * @example
 * ```typescript
 * // Quick screenshot with optimized defaults
 * const path = await screenshotToFile();
 *
 * // Custom options
 * const path = await screenshotToFile({
 *   filePath: './page.png',
 *   format: 'png',
 *   fullPage: true
 * });
 * ```
 */
export async function screenshotToFile(
  options: ScreenshotToFileOptions = {}
): Promise<string> {
  const { writeFileSync } = await import("fs");
  const { resolve } = await import("path");

  const { filePath, ...screenshotOptions } = options;
  const format = screenshotOptions.format ?? "jpeg";
  const ext = format === "jpeg" ? "jpg" : format;
  const defaultPath = `/tmp/screenshot.${ext}`;

  const base64 = await screenshot(screenshotOptions);
  const absolutePath = resolve(filePath ?? defaultPath);
  writeFileSync(absolutePath, Buffer.from(base64, "base64"));

  return absolutePath;
}

/**
 * Execute a complete automation flow in a single request
 * This is more efficient as it uses one browser session for multiple actions
 */
export async function executeFlow<T>(query: string): Promise<T> {
  return executeBql<T>(query);
}

/**
 * Check if Browserless is configured
 */
export function isConfigured(): boolean {
  return !!BROWSERLESS_TOKEN;
}
