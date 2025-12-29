/**
 * Steel Browser Automation Example
 *
 * This project uses Playwright with Steel Browser on Cloud Run.
 * Steel provides a headless Chrome instance that Playwright connects to via CDP.
 *
 * Prerequisites:
 * - GCP service account with Cloud Run Invoker permissions
 * - Steel Browser deployed to Cloud Run
 * - gcloud CLI authenticated (run from environment with gcloud access)
 *
 * IMPORTANT: This script requires WebSocket access to Cloud Run.
 * Claude Code Web sandbox has network restrictions that prevent WebSocket connections.
 * Run this from a local machine or CI/CD environment with unrestricted network access.
 *
 * Usage:
 *   pnpm --filter @research/stagehand-browser start
 */
import { checkHealth, getSteelUrl } from "./steel-client.js";
import { withBrowser } from "./browser.js";

async function main() {
  console.log("Steel Browser Automation\n");
  console.log(`Steel URL: ${getSteelUrl()}\n`);

  // Check Steel connectivity
  console.log("Checking Steel Browser connection...");
  const healthy = await checkHealth();
  if (!healthy) {
    console.error("Steel Browser is not reachable.");
    console.error("Check that STEEL_URL is correct and you have valid GCP credentials.");
    process.exit(1);
  }
  console.log("Steel Browser is healthy!\n");

  // Run browser automation
  console.log("Starting browser automation...\n");

  await withBrowser(async (page) => {
    // Navigate to example.com
    console.log("Navigating to example.com...");
    await page.goto("https://example.com");
    await page.waitForLoadState("networkidle");

    // Get page title
    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Take a screenshot
    await page.screenshot({ path: "screenshot.png" });
    console.log("Screenshot saved to screenshot.png");

    // Extract some data from the page
    const heading = await page.locator("h1").textContent();
    console.log(`Main heading: ${heading}`);

    const links = await page.locator("a").all();
    console.log(`\nFound ${links.length} links:`);
    for (const link of links) {
      const text = await link.textContent();
      const href = await link.getAttribute("href");
      console.log(`  - ${text}: ${href}`);
    }

    // Click the "More information" link
    console.log("\nClicking 'More information' link...");
    await page.click("a");
    await page.waitForLoadState("networkidle");

    console.log(`Navigated to: ${page.url()}`);
    const newTitle = await page.title();
    console.log(`New page title: ${newTitle}`);
  });

  console.log("\nDemo complete!");
}

main().catch(console.error);
