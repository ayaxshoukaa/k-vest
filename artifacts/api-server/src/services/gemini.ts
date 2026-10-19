import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = "gemini-3.8-flash";

let cachedKey: string | undefined;
let cachedClient: GoogleGenAI | undefined;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY must be set to enable AI research.");
  }

  if (!cachedClient || cachedKey !== apiKey) {
    cachedKey = apiKey;
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 30_000,
        retryOptions: { attempts: 1 },
      },
    });
  }
  return cachedClient;
}
