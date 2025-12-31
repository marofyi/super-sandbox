/**
 * Mobile Responsiveness Visual QA Test
 *
 * Uses @research/browserless to capture screenshots at various viewport sizes
 * for visual inspection of mobile responsiveness.
 *
 * Run: pnpm --filter @research/tanstack-chat test:visual
 *
 * Environment variables:
 * - TEST_URL: Target URL to capture (required)
 * - BROWSERLESS_TOKEN: Browserless API token (required)
 */

import {
  captureResponsiveScreenshots,
  captureAtViewport,
  executeFlow,
  isConfigured,
  VIEWPORT_PRESETS,
  type ViewportConfig,
} from "@research/browserless";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// URL must be provided via environment variable - no hardcoded defaults
const TARGET_URL = process.env.TEST_URL;
const OUTPUT_DIR = resolve(__dirname, "screenshots");

interface ClickFlowResult {
  viewport: { width: number; height: number };
  goto: { status: number; url: string };
  click: { x: number; y: number };
  screenshot: { base64: string };
}

/**
 * Project-specific: Capture navigation menu open state
 * This test is specific to tanstack-chat's UI and kept here
 */
async function captureNavigation(url: string, viewport: ViewportConfig): Promise<string> {
  console.log(`  Capturing navigation menu for ${viewport.name}...`);

  const query = `
    mutation CaptureNavigation {
      viewport(
        width: ${viewport.width}
        height: ${viewport.height}
        deviceScaleFactor: ${viewport.deviceScaleFactor ?? 1}
      ) {
        width
        height
      }
      goto(url: "${url}", waitUntil: networkIdle, timeout: 30000) {
        status
        url
      }
      click(selector: "button[aria-label]", visible: true, timeout: 5000) {
        x
        y
      }
      screenshot(type: jpeg, quality: 90, fullPage: false, optimizeForSpeed: true) {
        base64
      }
    }
  `;

  const result = await executeFlow<ClickFlowResult>(query);
  const filePath = resolve(OUTPUT_DIR, `${viewport.name}-nav-open.jpg`);
  writeFileSync(filePath, Buffer.from(result.screenshot.base64, "base64"));

  return filePath;
}

async function main() {
  console.log("Mobile Responsiveness Visual QA Test\n");

  if (!TARGET_URL) {
    console.error("ERROR: TEST_URL environment variable is required");
    console.error("Usage: TEST_URL=https://your-app.com pnpm --filter @research/tanstack-chat test:visual");
    process.exit(1);
  }

  console.log(`Target: ${TARGET_URL}\n`);

  if (!isConfigured()) {
    console.error("ERROR: BROWSERLESS_TOKEN not configured");
    process.exit(1);
  }

  // Use shared utility for responsive screenshots
  console.log("Capturing responsive screenshots...");
  const results = await captureResponsiveScreenshots(TARGET_URL, {
    outputDir: OUTPUT_DIR,
    includeFullPage: true,
    onCapture: (viewport, index, total) => {
      console.log(`  [${index + 1}/${total}] ${viewport.name} (${viewport.width}x${viewport.height})`);
    },
  });

  // Project-specific: Navigation menu test
  console.log("\nNavigation Menu Test:");
  try {
    await captureNavigation(TARGET_URL, VIEWPORT_PRESETS.iphone14);
    results.screenshots.push({
      viewport: VIEWPORT_PRESETS.iphone14,
      base64: "",
      status: 200,
      filePath: resolve(OUTPUT_DIR, "iphone-14-nav-open.jpg"),
    });
  } catch (error) {
    results.errors.push({
      viewport: VIEWPORT_PRESETS.iphone14,
      error: `navigation: ${error}`,
    });
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log(`Screenshots: ${results.screenshots.length}`);
  console.log(`Errors: ${results.errors.length}`);
  console.log(`Output: ${OUTPUT_DIR}`);

  if (results.errors.length > 0) {
    console.log("\nErrors:");
    results.errors.forEach((e) => console.log(`  - ${e.viewport.name}: ${e.error}`));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
