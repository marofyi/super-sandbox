// Client management
export { createClient, getClient, setDefaultClient, resetClient } from './client.js';

// Chat utilities
export { chat, ask, chatStream } from './chat.js';

// Types
export type {
  ChatModel,
  ChatOptions,
  ChatResponse,
  ClientOptions,
} from './types.js';

// Re-export OpenAI for advanced usage
export { default as OpenAI } from 'openai';
