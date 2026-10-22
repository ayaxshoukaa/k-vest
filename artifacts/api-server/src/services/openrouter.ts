import * as OpenAISdk from "openai";
import type { ClientOptions, OpenAI as OpenAIClient } from "openai";

export const OPENROUTER_MODEL = "openai/gpt-4o-mini";

const OpenAIConstructor = OpenAISdk.OpenAI as unknown as new (
  options: ClientOptions,
) => OpenAIClient;

let cachedKey: string | undefined;
let cachedClient: OpenAIClient | undefined;

export function getOpenRouterClient(): OpenAIClient {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY must be set to enable AI research.");
  }

  if (!cachedClient || cachedKey !== apiKey) {
    cachedKey = apiKey;
    cachedClient = new OpenAIConstructor({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      timeout: 30_000,
      maxRetries: 0,
      defaultHeaders: {
        "X-Title": "K-vest AI",
      },
    });
  }

  return cachedClient;
}
