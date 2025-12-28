import type OpenAI from 'openai';

export type ChatModel =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4-turbo'
  | 'gpt-4'
  | 'gpt-3.5-turbo'
  | (string & {});

export interface ChatOptions {
  /** Model to use. Defaults to 'gpt-4o-mini' */
  model?: ChatModel;
  /** System prompt to set context */
  systemPrompt?: string;
  /** Temperature for response randomness (0-2). Defaults to 1 */
  temperature?: number;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** Custom OpenAI client instance */
  client?: OpenAI;
}

export interface ChatResponse {
  /** The assistant's response text */
  content: string;
  /** Token usage statistics */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** The model that was used */
  model: string;
  /** Finish reason from the API */
  finishReason: string | null;
}

export interface ClientOptions {
  /** OpenAI API key. Defaults to OPENAI_API_KEY env var */
  apiKey?: string;
  /** Base URL for API requests */
  baseURL?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retries for failed requests */
  maxRetries?: number;
}
