/**
 * Mobile Responsiveness Visual QA Test
 *
 * Uses @research/browserless to capture screenshots at various viewport sizes
 * for visual inspection of mobile responsiveness.
 *
 * Run: pnpm --filter @research/tanstack-chat test:visual
 */

import { executeFlow, isConfigured } from "@research/browserless";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface ScreenshotFlowResult {
  viewport: { width: number; height: number };
  goto: { status: number; url: string };
  screenshot: { base64: string };
}

interface ClickFlowResult extends ScreenshotFlowResult {
  click: { x: number; y: number };
}

interface ViewportConfig {
  name: string;
  width: number;
  height: number;
  deviceScaleFactor?: number;
}

const VIEWPORTS: ViewportConfig[] = [
  // Mobile devices
  { name: "iphone-se", width: 375, height: 667, deviceScaleFactor: 2 },
  { name: "iphone-14", width: 390, height: 844, deviceScaleFactor: 3 },
  { name: "iphone-14-pro-max", width: 430, height: 932, deviceScaleFactor: 3 },
  { name: "pixel-7", width: 412, height: 915, deviceScaleFactor: 2.625 },
  { name: "galaxy-s21", width: 360, height: 800, deviceScaleFactor: 3 },
  // Tablets
  { name: "ipad-mini", width: 768, height: 1024, deviceScaleFactor: 2 },
  { name: "ipad-pro-11", width: 834, height: 1194, deviceScaleFactor: 2 },
  // Desktop
  { name: "desktop-1080p", width: 1920, height: 1080, deviceScaleFactor: 1 },
];

const TARGET_URL = process.env.TEST_URL || "https://tanstack-chat.vercel.app";
const OUTPUT_DIR = resolve(__dirname, "screenshots");

async function captureViewport(viewport: ViewportConfig): Promise<string> {
  console.log(`  Capturing ${viewport.name} (${viewport.width}x${viewport.height})...`);

  const query = `
    mutation CaptureViewport {
      viewport(
        width: ${viewport.width}
        height: ${viewport.height}
        deviceScaleFactor: ${viewport.deviceScaleFactor || 1}
      ) {
        width
        height
      }
      goto(url: "${TARGET_URL}", waitUntil: networkIdle, timeout: 30000) {
        status
        url
      }
      screenshot(type: jpeg, quality: 90, fullPage: false, optimizeForSpeed: true) {
        base64
      }
    }
  `;

  const result = await executeFlow<ScreenshotFlowResult>(query);
  const filePath = resolve(OUTPUT_DIR, `${viewport.name}.jpg`);
  writeFileSync(filePath, Buffer.from(result.screenshot.base64, "base64"));

  return filePath;
}

async function captureFullPage(viewport: ViewportConfig): Promise<string> {
  console.log(`  Capturing full page for ${viewport.name}...`);

  const query = `
    mutation CaptureFullPage {
      viewport(
        width: ${viewport.width}
        height: ${viewport.height}
        deviceScaleFactor: ${viewport.deviceScaleFactor || 1}
      ) {
        width
        height
      }
      goto(url: "${TARGET_URL}", waitUntil: networkIdle, timeout: 30000) {
        status
        url
      }
      screenshot(type: jpeg, quality: 90, fullPage: true, optimizeForSpeed: true) {
        base64
      }
    }
  `;

  const result = await executeFlow<ScreenshotFlowResult>(query);
  const filePath = resolve(OUTPUT_DIR, `${viewport.name}-full.jpg`);
  writeFileSync(filePath, Buffer.from(result.screenshot.base64, "base64"));

  return filePath;
}

async function captureNavigation(viewport: ViewportConfig): Promise<string> {
  console.log(`  Capturing navigation menu for ${viewport.name}...`);

  const query = `
    mutation CaptureNavigation {
      viewport(
        width: ${viewport.width}
        height: ${viewport.height}
        deviceScaleFactor: ${viewport.deviceScaleFactor || 1}
      ) {
        width
        height
      }
      goto(url: "${TARGET_URL}", waitUntil: networkIdle, timeout: 30000) {
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
  console.log(`Target: ${TARGET_URL}\n`);

  if (!isConfigured()) {
    console.error("BROWSERLESS_TOKEN not configured");
    process.exit(1);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const screenshots: string[] = [];
  const errors: string[] = [];

  // Viewport screenshots
  console.log("Viewport Screenshots:");
  for (const viewport of VIEWPORTS) {
    try {
      const path = await captureViewport(viewport);
      screenshots.push(path);
    } catch (error) {
      errors.push(`${viewport.name}: ${error}`);
    }
  }

  // Full page screenshots for mobile
  console.log("\nFull Page Screenshots:");
  const mobileViewports = VIEWPORTS.filter((v) => v.width < 768);
  for (const viewport of mobileViewports.slice(0, 2)) {
    try {
      const path = await captureFullPage(viewport);
      screenshots.push(path);
    } catch (error) {
      errors.push(`${viewport.name} full: ${error}`);
    }
  }

  // Navigation menu test
  console.log("\nNavigation Menu Test:");
  try {
    const path = await captureNavigation(VIEWPORTS[1]); // iPhone 14
    screenshots.push(path);
  } catch (error) {
    errors.push(`navigation: ${error}`);
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log(`Screenshots: ${screenshots.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Output: ${OUTPUT_DIR}`);

  if (errors.length > 0) {
    console.log("\nErrors:");
    errors.forEach((e) => console.log(`  - ${e}`));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
