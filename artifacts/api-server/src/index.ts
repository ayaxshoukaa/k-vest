import app from "./app";
import { logger } from "./lib/logger";
import { closeMongo, connectMongo } from "./lib/mongodb";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

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
