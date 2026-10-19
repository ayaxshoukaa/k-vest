import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const journeyProgressTable = pgTable("journey_progress", {
  userId: text("user_id").primaryKey(),
  currentStep: text("current_step").notNull().default("scan-intro"),
  furthestStep: integer("furthest_step").notNull().default(0),
  watchlistSymbols: text("watchlist_symbols").array().notNull().default(sql`ARRAY[]::text[]`),
  researchCompleted: boolean("research_completed").notNull().default(false),
  practiceSkipped: boolean("practice_skipped").notNull().default(false),
  roiResult: jsonb("roi_result"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertJourneyProgressSchema = createInsertSchema(journeyProgressTable).omit({
  updatedAt: true,
});

export type InsertJourneyProgress = z.infer<typeof insertJourneyProgressSchema>;
export type JourneyProgress = typeof journeyProgressTable.$inferSelect;
