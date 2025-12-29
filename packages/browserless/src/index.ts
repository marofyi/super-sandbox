/**
 * @research/browserless
 *
 * Browser automation using Browserless BrowserQL (GraphQL over HTTP).
 * Works from Claude Code Web and other sandboxed environments.
 *
 * @example
 * ```typescript
 * import { goto, click, type, screenshot } from '@research/browserless';
 *
 * // Navigate and take screenshot
 * await goto('https://example.com');
 * const base64 = await screenshot();
 *
 * // Interact with elements
 * await click('button.submit');
 * await type('input[name="email"]', 'test@example.com');
 *
 * // Multi-step flow (single browser session)
 * const result = await executeFlow(`
 *   mutation {
 *     goto(url: "https://example.com") { status }
 *     click(selector: "a") { time }
 *     text { text }
 *   }
 * `);
 * ```
 *
 * @see https://docs.browserless.io/browserql-interactions
 */

// Core execution
export { executeBql, executeFlow, isConfigured } from "./browserless-client.js";

// Navigation
export { goto } from "./browserless-client.js";

// Interactions
export { click, type } from "./browserless-client.js";

// Content extraction
export { getHtml, getText, screenshot } from "./browserless-client.js";

// Types
export type {
  BqlResponse,
  GotoResult,
  ClickResult,
  TypeResult,
  HtmlResult,
  TextResult,
  ScreenshotResult,
} from "./browserless-client.js";
