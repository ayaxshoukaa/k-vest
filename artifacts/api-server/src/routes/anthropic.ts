import { getAuth } from "@clerk/express";
import {
  CreateAnthropicConversationBody,
  ListAnthropicConversationsQueryParams,
  SendAnthropicMessageBody,
} from "@workspace/api-zod";
import { MongoServerError } from "mongodb";
import { Router, type IRouter, type Request } from "express";
import { getCompanyResearchContext, JourneyError, markResearchComplete } from "../services/journey";
import { checkResearchLimit, researchSystemPrompt } from "../services/research";
import { OPENROUTER_MODEL, getOpenRouterClient } from "../services/openrouter";
import { sameOriginLearningApi } from "../middlewares/journeyOwner";
import { getMongoClient, getMongoCollections, nextMongoId } from "../lib/mongodb";

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
  return getMongoCollections().conversations.findOne({ id, userId: userId(req) });
}

function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

router.get("/anthropic/conversations", async (req, res) => {
  const parsed = ListAnthropicConversationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: "Enter a valid company symbol." });
    return;
  }
  const filter = parsed.data.symbol
    ? { userId: userId(req), symbol: parsed.data.symbol }
    : { userId: userId(req) };
  const rows = await getMongoCollections().conversations
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();
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
    const collection = getMongoCollections().conversations;
    const conversationFilter = { userId: userId(req), symbol: parsed.data.symbol };
    let row = await collection.findOne(conversationFilter);
    if (!row) {
      try {
        await collection.insertOne({
          id: await nextMongoId("conversations"),
          ...parsed.data,
          userId: userId(req),
          createdAt: new Date(),
        });
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
      }
      row = await collection.findOne(conversationFilter);
    }
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
  const history = await getMongoCollections().messages
    .find({ conversationId: row.id })
    .sort({ createdAt: 1, id: 1 })
    .toArray();
  res.json({
    id: row.id,
    title: row.title,
    symbol: row.symbol,
    createdAt: row.createdAt,
    messages: history.map(({ _id: _mongoId, ...message }) => message),
  });
});

router.delete("/anthropic/conversations/:id", async (req, res) => {
  const row = await ownedConversation(req);
  if (!row) {
    res.status(404).json({ message: "Conversation not found." });
    return;
  }
  const { conversations, messages } = getMongoCollections();
  const session = getMongoClient().startSession();
  try {
    await session.withTransaction(async () => {
      await messages.deleteMany({ conversationId: row.id }, { session });
      await conversations.deleteOne({ id: row.id, userId: userId(req) }, { session });
    });
  } finally {
    await session.endSession();
  }
  res.status(204).end();
});

router.get("/anthropic/conversations/:id/messages", async (req, res) => {
  const row = await ownedConversation(req);
  if (!row) {
    res.status(404).json({ message: "Conversation not found." });
    return;
  }
  const history = await getMongoCollections().messages
    .find({ conversationId: row.id })
    .sort({ createdAt: 1, id: 1 })
    .toArray();
  res.json(history.map(({ _id: _mongoId, ...message }) => message));
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
    const { messages } = getMongoCollections();
    const previous = (await messages
      .find({ conversationId: conversation.id })
      .sort({ createdAt: -1, id: -1 })
      .limit(12)
      .toArray()).reverse();
    await messages.insertOne({
      id: await nextMongoId("messages"),
      conversationId: conversation.id,
      role: "user",
      content: parsed.data.content,
      createdAt: new Date(),
    });
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    const abortController = new AbortController();
    res.on("close", () => {
      if (!res.writableEnded) abortController.abort();
    });
    const stream = await getOpenRouterClient().chat.completions.create({
      model: OPENROUTER_MODEL,
      max_tokens: 8192,
      messages: [
        { role: "system", content: researchSystemPrompt(context, parsed.data.language) },
        ...previous.map((message) => ({
          role: message.role === "assistant" ? "assistant" as const : "user" as const,
          content: message.content,
        })),
        { role: "user", content: parsed.data.content },
      ],
      stream: true,
    }, { signal: abortController.signal });
    let text = "";
    try {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (typeof content === "string" && content) {
          text += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      if (!text.trim()) throw new Error("AI returned an empty response.");
      await messages.insertOne({
        id: await nextMongoId("messages"),
        conversationId: conversation.id,
        role: "assistant",
        content: text,
        createdAt: new Date(),
      });
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
