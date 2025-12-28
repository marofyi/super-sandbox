import type OpenAI from 'openai';
import { getClient } from './client.js';
import type { ChatOptions, ChatResponse } from './types.js';

const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * Send a chat message and get a response.
 *
 * @example Simple usage
 * ```ts
 * const response = await chat('What is 2+2?');
 * console.log(response.content); // "4"
 * ```
 *
 * @example With options
 * ```ts
 * const response = await chat('Explain quantum computing', {
 *   model: 'gpt-4o',
 *   systemPrompt: 'You are a physics professor. Be concise.',
 *   temperature: 0.7,
 * });
 * ```
 */
export async function chat(
  message: string,
  options: ChatOptions = {}
): Promise<ChatResponse> {
  const {
    model = DEFAULT_MODEL,
    systemPrompt,
    temperature,
    maxTokens,
    client,
  } = options;

  const openai = client ?? getClient();

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  messages.push({ role: 'user', content: message });

  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  const choice = response.choices[0];
  if (!choice) {
    throw new Error('No response received from OpenAI');
  }

  return {
    content: choice.message.content ?? '',
    usage: {
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
    },
    model: response.model,
    finishReason: choice.finish_reason,
  };
}

/**
 * Send a chat message and get just the text response.
 * Convenience wrapper around `chat()` for simple use cases.
 *
 * @example
 * ```ts
 * const answer = await ask('What is the capital of France?');
 * console.log(answer); // "Paris"
 * ```
 */
export async function ask(
  message: string,
  options: ChatOptions = {}
): Promise<string> {
  const response = await chat(message, options);
  return response.content;
}

/**
 * Stream a chat response.
 *
 * @example
 * ```ts
 * for await (const chunk of chatStream('Tell me a story')) {
 *   process.stdout.write(chunk);
 * }
 * ```
 */
export async function* chatStream(
  message: string,
  options: ChatOptions = {}
): AsyncGenerator<string, void, unknown> {
  const {
    model = DEFAULT_MODEL,
    systemPrompt,
    temperature,
    maxTokens,
    client,
  } = options;

  const openai = client ?? getClient();

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  messages.push({ role: 'user', content: message });

  const stream = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
