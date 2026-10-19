import {
  AdvanceJourneyBody,
  AnalyzeJourneyCompanyBody,
  AnalyzeJourneyCompanyResponse,
  CalculateJourneyRoiBody,
  CreateJourneyTradeBody,
  GetJourneyStateResponse,
  SaveJourneyWatchlistBody,
  SkipJourneyPracticeBody,
} from "@workspace/api-zod";
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import {
  advanceJourney,
  getCompanyResearchContext,
  getJourneyState,
  JourneyError,
  markResearchComplete,
  placeDemoTrade,
  resetJourney,
  resetPracticeWallet,
  saveRoiResult,
  skipPractice,
  updateJourneyWatchlist,
} from "../services/journey";
import { analyzeCompany, checkResearchLimit } from "../services/research";
import { journeyOwner, resolveJourneyOwner, sameOriginLearningApi } from "../middlewares/journeyOwner";

const router: IRouter = Router();

router.use("/journey", sameOriginLearningApi, resolveJourneyOwner, (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

function handleError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof JourneyError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  next(error);
}

const userId = (req: Request): string => journeyOwner(req);

router.get("/journey/state", async (req, res, next) => {
  try {
    res.json(GetJourneyStateResponse.parse(await getJourneyState(userId(req))));
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post("/journey/start", async (req, res, next) => {
  try {
    res.json(GetJourneyStateResponse.parse(await getJourneyState(userId(req))));
  } catch (error) {
    handleError(error, res, next);
  }
});

router.put("/journey/watchlist", async (req, res, next) => {
  const parsed = SaveJourneyWatchlistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Select valid company symbols.", errors: parsed.error.flatten() });
    return;
  }
  try {
    res.json(GetJourneyStateResponse.parse(
      await updateJourneyWatchlist(userId(req), parsed.data.symbols),
    ));
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post("/journey/advance", async (req, res, next) => {
  const parsed = AdvanceJourneyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Choose a valid journey step." });
    return;
  }
  try {
    res.json(GetJourneyStateResponse.parse(
      await advanceJourney(userId(req), parsed.data.fromStep, parsed.data.nextStep),
    ));
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post("/journey/practice/skip", async (req, res, next) => {
  if (!SkipJourneyPracticeBody.safeParse(req.body ?? {}).success) {
    res.status(400).json({ message: "Invalid skip request." });
    return;
  }
  try {
    res.json(GetJourneyStateResponse.parse(await skipPractice(userId(req))));
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post("/journey/trades", async (req, res, next) => {
  const parsed = CreateJourneyTradeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Enter a company, trade side, and positive whole-share quantity." });
    return;
  }
  try {
    res.status(201).json(GetJourneyStateResponse.parse(
      await placeDemoTrade(userId(req), parsed.data),
    ));
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post("/journey/wallet/reset", async (req, res, next) => {
  try {
    res.json(GetJourneyStateResponse.parse(await resetPracticeWallet(userId(req))));
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post("/journey/calculator", async (req, res, next) => {
  const parsed = CalculateJourneyRoiBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Check the calculator inputs. Budget, buy price and years must be above zero." });
    return;
  }
  try {
    await getCompanyResearchContext(parsed.data.symbol);
    res.json(GetJourneyStateResponse.parse(await saveRoiResult(userId(req), parsed.data)));
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post("/journey/reset", async (req, res, next) => {
  try {
    res.json(GetJourneyStateResponse.parse(await resetJourney(userId(req))));
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post("/journey/research", async (req, res, next) => {
  const parsed = AnalyzeJourneyCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Choose a company and enter a question of 1–600 characters." });
    return;
  }
  try {
    checkResearchLimit(userId(req), req.ip);
    const context = await getCompanyResearchContext(parsed.data.symbol);
    const analysisText = await analyzeCompany(context, parsed.data.question, parsed.data.language);
    await markResearchComplete(userId(req));
    res.json(AnalyzeJourneyCompanyResponse.parse({
      symbol: context.stock.symbol,
      companyName: context.stock.companyName,
      analysisText,
      refreshStatus: context.refreshStatus,
      warning: context.warning,
      sample: context.stock.sample,
      stale: context.stock.stale,
    }));
  } catch (error) {
    if (!(error instanceof JourneyError)) {
      req.log.error({ err: error }, "AI company analysis failed");
      res.status(502).json({ message: "AI research is temporarily unavailable. Please try again." });
      return;
    }
    handleError(error, res, next);
  }
});

export default router;
