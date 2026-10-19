import { createInsertSchema } from "drizzle-zod";
import { boolean, integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { journeyProgressTable } from "./journeyProgress";

export const demoTradesTable = pgTable("demo_trades", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => journeyProgressTable.userId, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(),
  quantity: integer("quantity").notNull(),
  priceKwd: numeric("price_kwd", { precision: 12, scale: 3 }).notNull(),
  notionalKwd: numeric("notional_kwd", { precision: 14, scale: 3 }).notNull(),
  marketTime: timestamp("market_time", { withTimezone: true }),
  sample: boolean("sample").notNull().default(false),
  stale: boolean("stale").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDemoTradeSchema = createInsertSchema(demoTradesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertDemoTrade = z.infer<typeof insertDemoTradeSchema>;
export type DemoTrade = typeof demoTradesTable.$inferSelect;
