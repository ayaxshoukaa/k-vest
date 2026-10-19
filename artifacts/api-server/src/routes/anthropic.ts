import { getAuth } from "@clerk/express";
import {
  CreateAnthropicConversationBody,
  ListAnthropicConversationsQueryParams,
  SendAnthropicMessageBody,
} from "@workspace/api-zod";
import { conversations, db, messages } from "@workspace/db";
import { and, asc, desc, eq } from "drizzle-orm";
import { Router, type IRouter, type Request } from "express";
import { getCompanyResearchContext, JourneyError, markResearchComplete } from "../services/journey";
import { checkResearchLimit, researchSystemPrompt } from "../services/research";
import { GEMINI_MODEL, getGeminiClient } from "../services/gemini";
import { sameOriginLearningApi } from "../middlewares/journeyOwner";

const router: IRouter = Router();
const userId = (req: Request): string => getAuth(req).userId!;

router.use("/anthropic", sameOriginLearningApi, (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (!getAuth(req).userId) {
    res.status(401).json({ message: "Sign in to use saved AI research conversations." });
    return;
  }
  next();
});

async function ownedConversation(req: Request) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const [conversation] = await db.select().from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId(req)))).limit(1);
  return conversation ?? null;
}

router.get("/anthropic/conversations", async (req, res) => {
  const parsed = ListAnthropicConversationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: "Enter a valid company symbol." });
    return;
  }
  const rows = await db.select().from(conversations).where(and(
    eq(conversations.userId, userId(req)),
    parsed.data.symbol ? eq(conversations.symbol, parsed.data.symbol) : undefined,
  )).orderBy(desc(conversations.createdAt)).limit(20);
  res.json(rows.map(({ id, title, symbol, createdAt }) => ({ id, title, symbol, createdAt })));
});

router.post("/anthropic/conversations", async (req, res, next) => {
  const parsed = CreateAnthropicConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Choose a valid company and conversation title." });
    return;
  }
  try {
    await getCompanyResearchContext(parsed.data.symbol);
    await db.insert(conversations).values({ ...parsed.data, userId: userId(req) }).onConflictDoNothing();
    const [row] = await db.select().from(conversations).where(and(
      eq(conversations.userId, userId(req)), eq(conversations.symbol, parsed.data.symbol),
    )).limit(1);
    if (!row) throw new Error("Conversation could not be created.");
    res.status(201).json({ id: row.id, title: row.title, symbol: row.symbol, createdAt: row.createdAt });
  } catch (error) {
    if (error instanceof JourneyError) res.status(error.status).json({ message: error.message });
    else next(error);
  }
});

router.get("/anthropic/conversations/:id", async (req, res) => {
  const row = await ownedConversation(req);
  if (!row) {
    res.status(404).json({ message: "Conversation not found." });
    return;
  }
  const history = await db.select().from(messages).where(eq(messages.conversationId, row.id))
    .orderBy(asc(messages.createdAt), asc(messages.id));
  res.json({ id: row.id, title: row.title, symbol: row.symbol, createdAt: row.createdAt, messages: history });
});

router.delete("/anthropic/conversations/:id", async (req, res) => {
  const row = await ownedConversation(req);
  if (!row) {
    res.status(404).json({ message: "Conversation not found." });
    return;
  }
  await db.delete(conversations).where(and(eq(conversations.id, row.id), eq(conversations.userId, userId(req))));
  res.status(204).end();
});

router.get("/anthropic/conversations/:id/messages", async (req, res) => {
  const row = await ownedConversation(req);
  if (!row) {
    res.status(404).json({ message: "Conversation not found." });
    return;
  }
  const history = await db.select().from(messages).where(eq(messages.conversationId, row.id))
    .orderBy(asc(messages.createdAt), asc(messages.id));
  res.json(history);
});

router.post("/anthropic/conversations/:id/messages", async (req, res, next) => {
  const parsed = SendAnthropicMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Enter a question of 1–600 characters." });
    return;
  }
  const conversation = await ownedConversation(req);
  if (!conversation) {
    res.status(404).json({ message: "Conversation not found." });
    return;
  }
  try {
    checkResearchLimit(userId(req));
    const context = await getCompanyResearchContext(conversation.symbol);
    const previous = (await db.select().from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(desc(messages.createdAt), desc(messages.id)).limit(12)).reverse();
    await db.insert(messages).values({ conversationId: conversation.id, role: "user", content: parsed.data.content });
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    const abortController = new AbortController();
    res.on("close", () => {
      if (!res.writableEnded) abortController.abort();
    });
    const stream = await getGeminiClient().models.generateContentStream({
      model: GEMINI_MODEL,
      config: {
        abortSignal: abortController.signal,
        maxOutputTokens: 8192,
        systemInstruction: researchSystemPrompt(context, parsed.data.language),
      },
      contents: [
        ...previous.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        { role: "user", parts: [{ text: parsed.data.content }] },
      ],
    });
    let text = "";
    try {
      for await (const chunk of stream) {
        const content = chunk.text ?? "";
        if (content) {
          text += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      if (!text.trim()) throw new Error("AI returned an empty response.");
      await db.insert(messages).values({ conversationId: conversation.id, role: "assistant", content: text });
      await markResearchComplete(userId(req));
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (error) {
      req.log.error({ err: error }, "Streamed AI research failed");
      if (!res.destroyed) res.write(`data: ${JSON.stringify({ error: "AI research is temporarily unavailable. Please try again." })}\n\n`);
    }
    res.end();
  } catch (error) {
    if (error instanceof JourneyError) res.status(error.status).json({ message: error.message });
    else next(error);
  }
});

export default router;
