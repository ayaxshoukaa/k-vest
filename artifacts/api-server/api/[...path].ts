import app from "../src/app";
import { logger } from "../src/lib/logger";
import { connectMongo } from "../src/lib/mongodb";

let mongoReady: Promise<void> | undefined;

async function ensureMongoConnection(): Promise<void> {
  if (!mongoReady) {
    mongoReady = connectMongo().catch((error: unknown) => {
      mongoReady = undefined;
      throw error;
    });
  }

  await mongoReady;
}

export default async function handler(req: any, res: any): Promise<void> {
  try {
    await ensureMongoConnection();
    app(req, res);
  } catch (error) {
    logger.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "API request could not initialize.",
    );
    res.status(503).json({ message: "The service is temporarily unavailable. Please try again." });
  }
}
