/**
 * @super-sandbox/browserless
 *
 * Browser automation using Browserless BrowserQL (GraphQL over HTTP).
 * Works from Claude Code Web and other sandboxed environments.
 *
 * @example
 * ```typescript
 * import { goto, click, type, screenshotToFile } from '@super-sandbox/browserless';
 *
 * // Navigate and take screenshot (optimized defaults: JPEG, 80% quality, /tmp)
 * await goto('https://example.com');
 * const path = await screenshotToFile();
 * // Claude can then use Read tool to view the screenshot
 *
 * // Custom screenshot options
 * const path2 = await screenshotToFile({
 *   filePath: './page.png',
 *   format: 'png',
 *   fullPage: true
 * });
 *
 * // Interact with elements
 * await click('button.submit');
 * await type('input[name="email"]', 'test@example.com');
 *
 * // Multi-step flow (single browser session - more efficient)
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
export { executeBql, executeFlow, isConfigured, isClaudeCodeWeb } from "./browserless-client.js";

// Navigation
export { goto } from "./browserless-client.js";

// Interactions
export { click, type } from "./browserless-client.js";

// Content extraction & screenshots
export { getHtml, getText, screenshot, screenshotToFile } from "./browserless-client.js";

// Responsive capture utility
export {
  captureAtViewport,
  captureResponsiveScreenshots,
  VIEWPORT_PRESETS,
  DEFAULT_VIEWPORTS,
} from "./responsive-capture.js";

// Types
export type {
  BqlResponse,
  GotoResult,
  ClickResult,
  TypeResult,
  HtmlResult,
  TextResult,
  ScreenshotResult,
  ScreenshotOptions,
  ScreenshotToFileOptions,
} from "./browserless-client.js";

export type {
  ViewportConfig,
  CaptureOptions,
  SingleCaptureOptions,
  CaptureResult,
  ResponsiveCaptureOptions,
  ResponsiveCaptureResult,
} from "./responsive-capture.js";
