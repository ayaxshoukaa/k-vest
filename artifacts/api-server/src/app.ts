import express, { type Express } from "express";
import type { IncomingMessage, ServerResponse } from "node:http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import pinoHttp, { type Options as PinoHttpOptions } from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { isAllowedFrontendOrigin } from "./lib/frontend-origin";

const app: Express = express();

app.use(
  pinoHttp({
    // The API package and pino-http can resolve separate pino type instances
    // in Vercel's pnpm workspace install, although the logger is compatible at runtime.
    logger: logger as unknown as PinoHttpOptions["logger"],
    serializers: {
      req(req: IncomingMessage & { id: string | number | object }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: ServerResponse) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// The proxy must receive the original request body and run before parsers.
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || process.env.NODE_ENV !== "production" || isAllowedFrontendOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is required for private guest learning sessions.");
}
app.use(cookieParser(process.env.SESSION_SECRET));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

export default app;
