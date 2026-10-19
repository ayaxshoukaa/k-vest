import { apiCacheTable, db } from "@workspace/db";
import { eq } from "drizzle-orm";

export const API_CACHE_TTL_MS = 5 * 60 * 1000;

export interface CacheEntry {
  responseData: unknown;
  cachedAt: Date;
}

export async function getCacheEntry(cacheKey: string): Promise<CacheEntry | null> {
  const [entry] = await db
    .select({
      responseData: apiCacheTable.responseData,
      cachedAt: apiCacheTable.cachedAt,
    })
    .from(apiCacheTable)
    .where(eq(apiCacheTable.cacheKey, cacheKey));

  return entry ?? null;
}

export async function getCached<T>(cacheKey: string): Promise<T | null> {
  const entry = await getCacheEntry(cacheKey);
  if (!entry || Date.now() - entry.cachedAt.getTime() >= API_CACHE_TTL_MS) {
    return null;
  }
  return entry.responseData as T;
}

export async function setCache(cacheKey: string, responseData: unknown): Promise<void> {
  const cachedAt = new Date();
  await db
    .insert(apiCacheTable)
    .values({ cacheKey, responseData, cachedAt })
    .onConflictDoUpdate({
      target: apiCacheTable.cacheKey,
      set: { responseData, cachedAt },
    });
}
