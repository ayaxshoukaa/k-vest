import { randomUUID } from "node:crypto";
import { getAuth } from "@clerk/express";
import type { Request, RequestHandler } from "express";
import { getClerkProxyHost } from "./clerkProxyMiddleware";

const owners = new WeakMap<Request, string>();
const guestCookie = "kvest_guest";

export const sameOriginLearningApi: RequestHandler = (req, res, next) => {
  let crossOrigin = req.get("sec-fetch-site") === "cross-site";
  const origin = req.get("origin");
  if (origin) {
    try {
      const source = new URL(origin);
      const target = new URL(`${source.protocol}//${getClerkProxyHost(req)}`);
      crossOrigin ||= source.host !== target.host;
    } catch {
      crossOrigin = true;
    }
  }
  if (crossOrigin) {
    res.status(403).json({ message: "Open the journey in this website before accessing learning progress." });
    return;
  }
  next();
};

/** Use the Clerk account or an unguessable, signed browser identity, never a client-selected owner. */
export const resolveJourneyOwner: RequestHandler = (req, res, next) => {
  const accountId = getAuth(req).userId;
  if (accountId) {
    owners.set(req, accountId);
    next();
    return;
  }
  const saved = req.signedCookies?.[guestCookie];
  const existing = typeof saved === "string" && /^[a-f0-9-]{36}$/.test(saved) ? saved : null;
  const id = existing ?? randomUUID();
  if (!existing) {
    const secure = req.secure || req.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https";
    res.cookie(guestCookie, id, {
      signed: true,
      httpOnly: true,
      secure,
      sameSite: secure ? "none" : "lax",
      path: "/api",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
  owners.set(req, `guest:${id}`);
  next();
};

export function journeyOwner(req: Request): string {
  const owner = owners.get(req) ?? getAuth(req).userId;
  if (!owner) throw new Error("Journey identity has not been resolved.");
  return owner;
}
