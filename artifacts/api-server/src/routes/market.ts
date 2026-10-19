import {
  GetMarketQuotesResponse,
  GetMarketScannerResponse,
  GetMarketStockResponse,
} from "@workspace/api-zod";
import { Router, type IRouter } from "express";
import { getMarketQuotes } from "../services/market-quotes";
import { getMarketScanner, getMarketStock } from "../services/market-scanner";

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

router.get("/market/scanner", async (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const response = await getMarketScanner();
    res.json(GetMarketScannerResponse.parse(response));
  } catch (error) {
    next(error);
  }
});

router.get("/market/stocks/:symbol", async (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  const symbol = req.params.symbol?.toUpperCase();
  if (!symbol || !/^[A-Z0-9]{1,12}$/.test(symbol)) {
    res.status(400).json({ message: "Enter a valid Kuwait stock symbol." });
    return;
  }

  try {
    const response = await getMarketStock(symbol);
    if (!response) {
      res.status(404).json({ message: "That stock is not in the current scanner list." });
      return;
    }
    res.json(GetMarketStockResponse.parse(response));
  } catch (error) {
    next(error);
  }
});

export default router;
