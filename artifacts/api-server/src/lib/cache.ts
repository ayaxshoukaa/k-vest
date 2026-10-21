import { getMongoCollections } from "./mongodb";

export const API_CACHE_TTL_MS = 5 * 60 * 1000;

export interface CacheEntry {
  responseData: unknown;
  cachedAt: Date;
}

export async function getCacheEntry(cacheKey: string): Promise<CacheEntry | null> {
  const entry = await getMongoCollections().apiCache.findOne({ _id: cacheKey });
  return entry ? { responseData: entry.responseData, cachedAt: entry.cachedAt } : null;
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
  await getMongoCollections().apiCache.updateOne(
    { _id: cacheKey },
    { $set: { responseData, cachedAt } },
    { upsert: true },
  );
}
