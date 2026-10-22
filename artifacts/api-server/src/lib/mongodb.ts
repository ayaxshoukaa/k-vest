import {
  MongoClient,
  type ClientSession,
  type Collection,
  type Db,
  type Document,
} from "mongodb";
import type { JourneyRoiResult } from "@workspace/api-zod";
import { logger } from "./logger";

export interface JourneyProgressDocument extends Document {
  userId: string;
  currentStep: string;
  furthestStep: number;
  watchlistSymbols: string[];
  researchCompleted: boolean;
  practiceSkipped: boolean;
  roiResult: JourneyRoiResult | null;
  updatedAt: Date;
}

export interface DemoTradeDocument extends Document {
  id: number;
  userId: string;
  symbol: string;
  side: string;
  quantity: number;
  priceKwd: string;
  notionalKwd: string;
  marketTime: Date | null;
  sample: boolean;
  stale: boolean;
  createdAt: Date;
}

export interface WeeklyChallengeProgressDocument extends Document {
  userId: string;
  weekStart: string;
  challengeId: "first-practice-trade";
  progress: number;
  goal: 1;
  completedAt: Date | null;
  badgeAwardedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationDocument extends Document {
  id: number;
  userId: string;
  symbol: string;
  title: string;
  createdAt: Date;
}

export interface MessageDocument extends Document {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: Date;
}

export interface ApiCacheDocument extends Document {
  _id: string;
  responseData: unknown;
  cachedAt: Date;
}

interface CounterDocument extends Document {
  _id: string;
  sequence: number;
}

interface MigrationDocument extends Document {
  _id: string;
  completedAt: Date;
  counts: Record<string, number>;
}

export interface MongoCollections {
  journeyProgress: Collection<JourneyProgressDocument>;
  demoTrades: Collection<DemoTradeDocument>;
  weeklyChallenges: Collection<WeeklyChallengeProgressDocument>;
  conversations: Collection<ConversationDocument>;
  messages: Collection<MessageDocument>;
  apiCache: Collection<ApiCacheDocument>;
  counters: Collection<CounterDocument>;
  migrations: Collection<MigrationDocument>;
}

let mongoClient: MongoClient | null = null;
let mongoDatabase: Db | null = null;

export async function connectMongo(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required to start the API server.");
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 10,
  });

  try {
    await client.connect();
    const database = client.db();
    await database.command({ ping: 1 });
    await ensureMongoIndexes(database);
    mongoClient = client;
    mongoDatabase = database;
    logger.info("Connected to MongoDB.");
  } catch (error) {
    await client.close().catch(() => undefined);
    throw error;
  }
}

async function ensureMongoIndexes(database: Db): Promise<void> {
  await Promise.all([
    database.collection<JourneyProgressDocument>("journey_progress")
      .createIndex({ userId: 1 }, { unique: true, name: "journey_progress_user_id_unique" }),
    database.collection<DemoTradeDocument>("demo_trades")
      .createIndex({ id: 1 }, { unique: true, name: "demo_trades_id_unique" }),
    database.collection<DemoTradeDocument>("demo_trades")
      .createIndex({ userId: 1, createdAt: 1, id: 1 }, { name: "demo_trades_user_order" }),
    database.collection<WeeklyChallengeProgressDocument>("weekly_challenge_progress")
      .createIndex({ userId: 1, weekStart: 1 }, { unique: true, name: "weekly_challenge_user_week_unique" }),
    database.collection<ConversationDocument>("conversations")
      .createIndex({ id: 1 }, { unique: true, name: "conversations_id_unique" }),
    database.collection<ConversationDocument>("conversations")
      .createIndex({ userId: 1, symbol: 1 }, { unique: true, name: "conversations_user_symbol_unique" }),
    database.collection<MessageDocument>("messages")
      .createIndex({ id: 1 }, { unique: true, name: "messages_id_unique" }),
    database.collection<MessageDocument>("messages")
      .createIndex({ conversationId: 1, createdAt: 1, id: 1 }, { name: "messages_conversation_order" }),
  ]);
}

export function getMongoDb(): Db {
  if (!mongoDatabase) {
    throw new Error("MongoDB has not been connected.");
  }
  return mongoDatabase;
}

export function getMongoClient(): MongoClient {
  if (!mongoClient) {
    throw new Error("MongoDB has not been connected.");
  }
  return mongoClient;
}

export function getMongoCollections(): MongoCollections {
  const database = getMongoDb();
  return {
    journeyProgress: database.collection<JourneyProgressDocument>("journey_progress"),
    demoTrades: database.collection<DemoTradeDocument>("demo_trades"),
    weeklyChallenges: database.collection<WeeklyChallengeProgressDocument>("weekly_challenge_progress"),
    conversations: database.collection<ConversationDocument>("conversations"),
    messages: database.collection<MessageDocument>("messages"),
    apiCache: database.collection<ApiCacheDocument>("api_cache"),
    counters: database.collection<CounterDocument>("counters"),
    migrations: database.collection<MigrationDocument>("migration_runs"),
  };
}

export async function nextMongoId(
  counterName: string,
  session?: ClientSession,
): Promise<number> {
  const counter = await getMongoCollections().counters.findOneAndUpdate(
    { _id: counterName },
    { $inc: { sequence: 1 } },
    { upsert: true, returnDocument: "after", session },
  );
  if (!counter || !Number.isSafeInteger(counter.sequence) || counter.sequence < 1) {
    throw new Error(`Could not allocate an ID for ${counterName}.`);
  }
  return counter.sequence;
}

export async function closeMongo(): Promise<void> {
  const client = mongoClient;
  mongoClient = null;
  mongoDatabase = null;
  if (client) await client.close();
}
