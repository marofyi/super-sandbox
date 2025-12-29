/**
 * Steel Browser client with GCP Cloud Run authentication
 *
 * Uses gcloud CLI for authentication to avoid googleapis.com network restrictions
 * in sandboxed environments.
 */
import { execSync } from "child_process";

const STEEL_URL =
  process.env.STEEL_URL ||
  "https://steel-browser-1020089133224.us-central1.run.app";

// Path to gcloud (installed in /tmp in CC web)
const GCLOUD_PATH =
  process.env.GCLOUD_PATH || "/tmp/google-cloud-sdk/bin/gcloud";

export interface SteelSession {
  id: string;
  createdAt: string;
  status: string;
  websocketUrl: string;
  dimensions: { width: number; height: number };
}

/**
 * Get an identity token for Cloud Run authentication using gcloud CLI
 */
export async function getIdentityToken(): Promise<string> {
  try {
    const token = execSync(`${GCLOUD_PATH} auth print-identity-token`, {
      encoding: "utf-8",
    }).trim();
    return token;
  } catch (e) {
    throw new Error(
      `Failed to get identity token. Make sure gcloud is authenticated. Error: ${e}`
    );
  }
}

/**
 * Make an authenticated request to Steel API using curl
 * (Node.js fetch has DNS issues in some sandboxed environments)
 */
async function steelFetch(
  path: string,
  options: { method?: string; body?: string } = {}
): Promise<{ ok: boolean; statusText: string; json: () => Promise<unknown> }> {
  const token = await getIdentityToken();
  const method = options.method || "GET";
  const url = `${STEEL_URL}${path}`;

  let curlCmd = `curl -s -X ${method} -H "Authorization: Bearer ${token}" -H "Content-Type: application/json"`;
  if (options.body) {
    curlCmd += ` -d '${options.body}'`;
  }
  curlCmd += ` "${url}"`;

  try {
    const result = execSync(curlCmd, { encoding: "utf-8" });
    return {
      ok: true,
      statusText: "OK",
      json: async () => JSON.parse(result),
    };
  } catch (e) {
    return {
      ok: false,
      statusText: String(e),
      json: async () => ({}),
    };
  }
}

/**
 * Create a new browser session
 */
export async function createSession(): Promise<SteelSession> {
  const response = await steelFetch("/v1/sessions", {
    method: "POST",
    body: "{}",
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.statusText}`);
  }

  return response.json() as Promise<SteelSession>;
}

/**
 * Release a browser session
 */
export async function releaseSession(sessionId: string): Promise<void> {
  await steelFetch(`/v1/sessions/${sessionId}/release`, {
    method: "POST",
  });
}

/**
 * Get CDP WebSocket URL for Playwright connection
 *
 * Note: Cloud Run requires IAM auth. We pass the token as a query parameter
 * since WebSockets don't support Authorization headers directly.
 */
export async function getCdpUrl(sessionId: string): Promise<string> {
  const token = await getIdentityToken();
  const wsUrl = STEEL_URL.replace("https://", "wss://");
  return `${wsUrl}/sessions/${sessionId}/cdp?authorization=${encodeURIComponent(`Bearer ${token}`)}`;
}

/**
 * Check if Steel service is healthy
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await steelFetch("/");
    const data = (await response.json()) as { message?: string };
    return data.message === "Steel Browser API";
  } catch {
    return false;
  }
}

/**
 * Get Steel service info
 */
export function getSteelUrl(): string {
  return STEEL_URL;
}
