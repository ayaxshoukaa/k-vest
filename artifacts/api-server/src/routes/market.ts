import { GetMarketQuotesResponse } from "@workspace/api-zod";
import { Router, type IRouter } from "express";
import { getMarketQuotes } from "../services/market-quotes";

const router: IRouter = Router();

router.get("/market/quotes", async (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const response = await getMarketQuotes();
    res.json(GetMarketQuotesResponse.parse(response));
  } catch (error) {
    next(error);
  }
});

export default router;
