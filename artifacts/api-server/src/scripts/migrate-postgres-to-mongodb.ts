import {
  apiCacheTable,
  conversations,
  db as postgresDb,
  demoTradesTable,
  journeyProgressTable,
  messages,
  pool,
} from "@workspace/db";
import type { JourneyRoiResult } from "@workspace/api-zod";
import { MongoServerError, type ClientSession } from "mongodb";
import { logger } from "../lib/logger";
import {
  closeMongo,
  connectMongo,
  getMongoClient,
  getMongoCollections,
} from "../lib/mongodb";

const MIGRATION_ID = "postgres-app-data-to-mongodb-v1";

const collectionNames = [
  "journey_progress",
  "demo_trades",
  "conversations",
  "messages",
  "api_cache",
] as const;

type CollectionName = (typeof collectionNames)[number];
type RowCounts = Record<CollectionName, number>;

async function readPostgresRows() {
  const [progressRows, tradeRows, conversationRows, messageRows, cacheRows] =
    await Promise.all([
      postgresDb.select().from(journeyProgressTable),
      postgresDb.select().from(demoTradesTable),
      postgresDb.select().from(conversations),
      postgresDb.select().from(messages),
      postgresDb.select().from(apiCacheTable),
    ]);

  return { progressRows, tradeRows, conversationRows, messageRows, cacheRows };
}

async function getMongoCounts(session?: ClientSession): Promise<RowCounts> {
  const collections = getMongoCollections();
  return {
    journey_progress: await collections.journeyProgress.countDocuments({}, { session }),
    demo_trades: await collections.demoTrades.countDocuments({}, { session }),
    conversations: await collections.conversations.countDocuments({}, { session }),
    messages: await collections.messages.countDocuments({}, { session }),
    api_cache: await collections.apiCache.countDocuments({}, { session }),
  };
}

function countsFromRows(
  rows: Awaited<ReturnType<typeof readPostgresRows>>,
): RowCounts {
  return {
    journey_progress: rows.progressRows.length,
    demo_trades: rows.tradeRows.length,
    conversations: rows.conversationRows.length,
    messages: rows.messageRows.length,
    api_cache: rows.cacheRows.length,
  };
}

function sameCounts(left: RowCounts, right: RowCounts): boolean {
  return collectionNames.every((name) => left[name] === right[name]);
}

async function runMigration(): Promise<void> {
  if (!process.argv.includes("--apply")) {
    throw new Error("Pass --apply to copy PostgreSQL app data into MongoDB.");
  }

  await connectMongo();
  const collections = getMongoCollections();
  const existingRun = await collections.migrations.findOne({ _id: MIGRATION_ID });
  if (existingRun) {
    const currentCounts = await getMongoCounts();
    if (!sameCounts(existingRun.counts as RowCounts, currentCounts)) {
      throw new Error("The existing MongoDB migration record does not match collection counts.");
    }
    logger.info({ counts: currentCounts }, "PostgreSQL app-data migration was already completed.");
    return;
  }

  const rows = await readPostgresRows();
  const expectedCounts = countsFromRows(rows);
  const progressDocuments = rows.progressRows.map((row) => ({
    ...row,
    roiResult: row.roiResult as JourneyRoiResult | null,
  }));
  const sourceProgressIds = new Set(rows.progressRows.map((row) => row.userId));
  const orphanTrades = rows.tradeRows.filter((row) => !sourceProgressIds.has(row.userId));
  if (orphanTrades.length > 0) {
    throw new Error("PostgreSQL contains practice trades without matching learning progress.");
  }
  const sourceConversationIds = new Set(rows.conversationRows.map((row) => row.id));
  const orphanMessages = rows.messageRows.filter(
    (row) => !sourceConversationIds.has(row.conversationId),
  );
  if (orphanMessages.length > 0) {
    throw new Error("PostgreSQL contains saved messages without matching conversations.");
  }

  const client = getMongoClient();
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const targetCounts = await getMongoCounts(session);
      if (collectionNames.some((name) => targetCounts[name] !== 0)) {
        throw new Error("MongoDB already contains app data; migration stopped without overwriting it.");
      }

      if (rows.progressRows.length > 0) {
        await collections.journeyProgress.insertMany(progressDocuments, { session });
      }
      if (rows.tradeRows.length > 0) {
        await collections.demoTrades.insertMany(rows.tradeRows, { session });
      }
      if (rows.conversationRows.length > 0) {
        await collections.conversations.insertMany(rows.conversationRows, { session });
      }
      if (rows.messageRows.length > 0) {
        await collections.messages.insertMany(rows.messageRows, { session });
      }
      if (rows.cacheRows.length > 0) {
        await collections.apiCache.insertMany(
          rows.cacheRows.map(({ cacheKey, responseData, cachedAt }) => ({
            _id: cacheKey,
            responseData,
            cachedAt,
          })),
          { session },
        );
      }

      const counterInitialValues = [
        { _id: "demo_trades", sequence: Math.max(0, ...rows.tradeRows.map((row) => row.id)) },
        { _id: "conversations", sequence: Math.max(0, ...rows.conversationRows.map((row) => row.id)) },
        { _id: "messages", sequence: Math.max(0, ...rows.messageRows.map((row) => row.id)) },
      ];
      for (const counter of counterInitialValues) {
        await collections.counters.updateOne(
          { _id: counter._id },
          { $max: { sequence: counter.sequence } },
          { upsert: true, session },
        );
      }

      const verifiedCounts = await getMongoCounts(session);
      if (!sameCounts(expectedCounts, verifiedCounts)) {
        throw new Error("MongoDB row counts did not match PostgreSQL after copying.");
      }

      await collections.migrations.insertOne(
        { _id: MIGRATION_ID, completedAt: new Date(), counts: verifiedCounts },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  logger.info(
    { counts: expectedCounts },
    "PostgreSQL app data copied and verified in MongoDB; PostgreSQL remains unchanged.",
  );
}

async function main(): Promise<void> {
  try {
    await runMigration();
  } catch (error) {
    const mongoErrorDetails = error instanceof MongoServerError
      ? {
          mongoCode: error.code,
          mongoCodeName: error.codeName,
          mongoErrorLabels: error.errorLabels,
        }
      : {};
    logger.error(
      {
        errorName: error instanceof Error ? error.name : "UnknownError",
        ...mongoErrorDetails,
      },
      "PostgreSQL-to-MongoDB migration failed; PostgreSQL remains unchanged.",
    );
    process.exitCode = 1;
  } finally {
    await closeMongo().catch(() => undefined);
    await pool.end().catch(() => undefined);
  }
}

void main();
