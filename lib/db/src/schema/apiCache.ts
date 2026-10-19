import { createInsertSchema } from "drizzle-zod";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const apiCacheTable = pgTable("api_cache", {
  cacheKey: text("cache_key").primaryKey(),
  responseData: jsonb("response_data").notNull(),
  cachedAt: timestamp("cached_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertApiCacheSchema = createInsertSchema(apiCacheTable).omit({
  cachedAt: true,
});

export type InsertApiCache = z.infer<typeof insertApiCacheSchema>;
export type ApiCache = typeof apiCacheTable.$inferSelect;
