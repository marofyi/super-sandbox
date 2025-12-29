/**
 * Browserless Browser Automation Example
 *
 * Uses BrowserQL - a GraphQL-based API that works over pure HTTP.
 * This means it works from Claude Code Web and other sandboxed environments
 * where WebSocket connections are restricted.
 *
 * Prerequisites:
 * - BROWSERLESS_TOKEN: Get one at https://browserless.io (free tier available)
 *
 * Usage:
 *   pnpm --filter @research/browserless-automation start
 *
 * @see https://docs.browserless.io/browserql-interactions
 */
import {
  isConfigured,
  goto,
  click,
  type,
  getText,
  screenshot,
  executeFlow,
} from "./browserless-client.js";
import { writeFileSync } from "fs";

async function main() {
  console.log("Browserless Browser Automation\n");

  // Check configuration
  if (!isConfigured()) {
    console.error("BROWSERLESS_TOKEN is not set.");
    console.error("Get a free token at: https://browserless.io");
    console.error("\nSet it via: export BROWSERLESS_TOKEN=your-token");
    process.exit(1);
  }

  console.log("Token configured. Starting automation...\n");

  // Example 1: Simple navigation and screenshot
  console.log("=== Example 1: Navigate and Screenshot ===");
  try {
    const navResult = await goto("https://example.com");
    console.log(`Navigated to: ${navResult.goto.url}`);
    console.log(`Status: ${navResult.goto.status}`);
    console.log(`Load time: ${navResult.goto.time}ms`);

    const base64 = await screenshot();
    writeFileSync("screenshot.png", Buffer.from(base64, "base64"));
    console.log("Screenshot saved to screenshot.png\n");
  } catch (e) {
    console.error("Example 1 failed:", e);
  }

  // Example 2: Extract text content
  console.log("=== Example 2: Extract Text ===");
  try {
    await goto("https://example.com");
    const text = await getText();
    console.log("Page text (first 200 chars):");
    console.log(text.slice(0, 200) + "...\n");
  } catch (e) {
    console.error("Example 2 failed:", e);
  }

  // Example 3: Multi-step flow (more efficient - single browser session)
  console.log("=== Example 3: Multi-step Flow ===");
  try {
    const result = await executeFlow<{
      goto: { status: number; url: string };
      clickLink: { time: number };
      finalUrl: { url: string };
      pageText: { text: string };
    }>(`
      mutation MultiStepFlow {
        goto(url: "https://example.com", waitUntil: networkIdle) {
          status
          url
        }
        clickLink: click(selector: "a", visible: true) {
          time
        }
        finalUrl: goto(url: "", waitUntil: networkIdle) {
          url
        }
        pageText: text {
          text
        }
      }
    `);

    console.log(`Started at: ${result.goto.url}`);
    console.log(`Clicked link in ${result.clickLink.time}ms`);
    console.log(`Ended at: ${result.finalUrl.url}`);
    console.log(`Final page text (first 100 chars): ${result.pageText.text.slice(0, 100)}...\n`);
  } catch (e) {
    console.error("Example 3 failed:", e);
  }

  // Example 4: Form interaction
  console.log("=== Example 4: Form Interaction Demo ===");
  console.log("(Skipping - requires a real form to interact with)");
  console.log(`
  // Example form submission code:
  await goto("https://example.com/form");
  await type("input[name='email']", "test@example.com");
  await type("input[name='password']", "secretpassword");
  await click("button[type='submit']");
  `);

  console.log("\n=== Demo Complete ===");
}

main().catch(console.error);
