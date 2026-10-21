import app from "./app";
import { logger } from "./lib/logger";
import { closeMongo, connectMongo } from "./lib/mongodb";

// Vercel's Express runtime may not provide PORT; its documented default is 3000.
const rawPort = process.env["PORT"] ?? "3000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function startServer(): Promise<void> {
  await connectMongo();
  const server = app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutting down API server");
    server.close(() => {
      void closeMongo().finally(() => process.exit(0));
    });
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((error: unknown) => {
  logger.error(
    { errorName: error instanceof Error ? error.name : "UnknownError" },
    "API server could not connect to MongoDB.",
  );
  process.exit(1);
});
