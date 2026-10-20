import OpenAI from "openai";

export const OPENROUTER_MODEL = "openai/gpt-4o-mini";

let cachedKey: string | undefined;
let cachedClient: OpenAI | undefined;

export function getOpenRouterClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY must be set to enable AI research.");
  }

  if (!cachedClient || cachedKey !== apiKey) {
    cachedKey = apiKey;
    cachedClient = new OpenAI({
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
