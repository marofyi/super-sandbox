import OpenAI from 'openai';
import type { ClientOptions } from './types.js';

let defaultClient: OpenAI | null = null;

/**
 * Creates a new OpenAI client instance.
 *
 * @example
 * ```ts
 * const client = createClient({ apiKey: 'sk-...' });
 * ```
 */
export function createClient(options: ClientOptions = {}): OpenAI {
  const { apiKey, baseURL, timeout, maxRetries } = options;

  return new OpenAI({
    apiKey,
    baseURL,
    timeout,
    maxRetries,
  });
}

/**
 * Gets the default shared client instance.
 * Creates one if it doesn't exist, using OPENAI_API_KEY from environment.
 *
 * @example
 * ```ts
 * const client = getClient();
 * ```
 */
export function getClient(): OpenAI {
  if (!defaultClient) {
    defaultClient = createClient();
  }
  return defaultClient;
}

/**
 * Sets a custom client as the default.
 * Useful for testing or using different configurations.
 *
 * @example
 * ```ts
 * const customClient = createClient({ baseURL: 'http://localhost:8080' });
 * setDefaultClient(customClient);
 * ```
 */
export function setDefaultClient(client: OpenAI): void {
  defaultClient = client;
}

/**
 * Resets the default client (primarily for testing).
 */
export function resetClient(): void {
  defaultClient = null;
}
