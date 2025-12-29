/**
 * Browser automation with Steel on Cloud Run using Playwright
 */
import { chromium, Browser, BrowserContext, Page } from "playwright";
import { createSession, releaseSession, getCdpUrl } from "./steel-client.js";

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  sessionId: string;
}

/**
 * Create a new browser session connected to Steel
 */
export async function createBrowser(): Promise<BrowserSession> {
  // Create Steel session
  const session = await createSession();
  console.log(`Created Steel session: ${session.id}`);

  // Get authenticated CDP URL
  const cdpUrl = await getCdpUrl(session.id);
  console.log(`Connecting to CDP...`);

  // Connect Playwright to Steel via CDP
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0] || (await browser.newContext());
  const page = context.pages()[0] || (await context.newPage());

  return { browser, context, page, sessionId: session.id };
}

/**
 * Close a browser session and release Steel resources
 */
export async function closeBrowser(session: BrowserSession): Promise<void> {
  try {
    await session.browser.close();
  } catch (e) {
    console.warn("Error closing browser:", e);
  }

  try {
    await releaseSession(session.sessionId);
    console.log(`Released Steel session: ${session.sessionId}`);
  } catch (e) {
    console.warn("Error releasing session:", e);
  }
}

/**
 * Run an action with automatic cleanup
 */
export async function withBrowser<T>(
  action: (page: Page, context: BrowserContext) => Promise<T>
): Promise<T> {
  const session = await createBrowser();
  try {
    return await action(session.page, session.context);
  } finally {
    await closeBrowser(session);
  }
}
