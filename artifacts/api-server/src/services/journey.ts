import type {
  DemoHolding,
  DemoTrade,
  JourneyRoiResult,
  JourneyStateResponse,
  JourneyStep,
  JourneyWeeklySummaryResponse,
} from "@workspace/api-zod";
import {
  getMongoClient,
  getMongoCollections,
  nextMongoId,
  type JourneyProgressDocument,
  type WeeklyChallengeProgressDocument,
} from "../lib/mongodb";
import {
  getMarketScanner,
  getMarketStock,
  getRatingReason,
  getYahooCompanyProfile,
} from "./market-scanner";
import {
  calculateLedger as calculateAccount,
  calculateRoiScenario,
  calculateWeeklyPortfolio,
  deriveWeeklyChallenges,
  getKuwaitWeekWindow,
  roundKwd,
  roundPercent,
  shouldCelebrateFirstPracticeTrade,
  type WeeklyChallengeSnapshot,
} from "./journey-calculations";
import type { CompanyResearchContext } from "./research";
import { logger } from "../lib/logger";

export const JOURNEY_STEPS: JourneyStep[] = [
  "scan-intro",
  "scan",
  "research-intro",
  "research",
  "practice-intro",
  "practice",
  "roi-intro",
  "roi",
  "finish",
];

export const JOURNEY_MARKET_NOTE =
  "Data from Yahoo Finance, delayed, for educational purposes only.";

export class JourneyError extends Error {
  status: number;

  constructor(message: string, status = 409) {
    super(message);
    this.name = "JourneyError";
    this.status = status;
  }
}

function getStepIndex(step: string): number {
  return JOURNEY_STEPS.indexOf(step as JourneyStep);
}

export async function ensureJourneyProgress(userId: string): Promise<JourneyProgressDocument> {
  const { journeyProgress } = getMongoCollections();
  await journeyProgress.updateOne(
    { userId },
    {
      $setOnInsert: {
        userId,
        currentStep: "scan-intro",
        furthestStep: 0,
        watchlistSymbols: [],
        watchlistUpdatedAt: null,
        researchCompleted: false,
        practiceSkipped: false,
        firstTradeCelebrationSeen: false,
        roiResult: null,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
  const progress = await journeyProgress.findOne({ userId });

  if (!progress) {
    throw new Error("Journey progress could not be initialized.");
  }
  return progress;
}

async function buildJourneyState(
  userId: string,
  progress?: JourneyProgressDocument,
): Promise<JourneyStateResponse> {
  const savedProgress = progress ?? (await ensureJourneyProgress(userId));
  const trades = await getMongoCollections().demoTrades
    .find({ userId })
    .sort({ createdAt: 1, id: 1 })
    .toArray();
  const { cashKwd, positions } = calculateAccount(trades);
  const symbols = [...new Set([...positions.keys(), ...trades.map((trade) => trade.symbol)])];
  const market = symbols.length > 0 ? await getMarketScanner() : null;
  const stockBySymbol = new Map(
    (market?.stocks ?? []).map((stock) => [stock.symbol, stock]),
  );
  const holdings: DemoHolding[] = [];
  let allHoldingsPriced = true;
  let marketValueKwd = 0;

  for (const [symbol, position] of positions) {
    const stock = stockBySymbol.get(symbol);
    const currentPriceKwd = stock?.priceKwd ?? null;
    const costBasisKwd = roundKwd(position.costBasisKwd);
    const averageCostKwd =
      position.quantity > 0 ? roundKwd(position.costBasisKwd / position.quantity) : 0;
    const holdingMarketValue =
      currentPriceKwd === null ? null : roundKwd(position.quantity * currentPriceKwd);
    const profitLossKwd =
      currentPriceKwd === null
        ? null
        : roundKwd(position.quantity * currentPriceKwd - position.costBasisKwd);

    if (holdingMarketValue === null) {
      allHoldingsPriced = false;
    } else {
      marketValueKwd += holdingMarketValue;
    }

    holdings.push({
      symbol,
      companyName: stock?.companyName ?? symbol,
      quantity: position.quantity,
      averageCostKwd,
      costBasisKwd,
      currentPriceKwd,
      marketValueKwd: holdingMarketValue,
      profitLossKwd,
      sample: stock?.sample ?? true,
      stale: stock?.stale ?? true,
    });
  }

  const pricedMarketValue = allHoldingsPriced ? roundKwd(marketValueKwd) : null;
  const portfolioValueKwd =
    pricedMarketValue === null ? null : roundKwd(cashKwd + pricedMarketValue);
  const profitLossKwd =
    portfolioValueKwd === null ? null : roundKwd(portfolioValueKwd - 1000);

  const responseTrades: DemoTrade[] =
    trades.map((trade) => {
      const stock = stockBySymbol.get(trade.symbol);
      return {
        id: trade.id,
        symbol: trade.symbol,
        companyName: stock?.companyName ?? trade.symbol,
        side: trade.side as "buy" | "sell",
        quantity: trade.quantity,
        priceKwd: Number(trade.priceKwd),
        notionalKwd: Number(trade.notionalKwd),
        createdAt: trade.createdAt,
        marketTime: trade.marketTime ?? null,
        sample: trade.sample,
        stale: trade.stale,
      };
    });

  return {
    currentStep: JOURNEY_STEPS[getStepIndex(savedProgress.currentStep)] ?? "scan-intro",
    furthestStep: savedProgress.furthestStep,
    watchlistSymbols: savedProgress.watchlistSymbols,
    researchCompleted: savedProgress.researchCompleted,
    practiceSkipped: savedProgress.practiceSkipped,
    trades: responseTrades,
    holdings,
    cashKwd,
    marketValueKwd: pricedMarketValue,
    portfolioValueKwd,
    profitLossKwd,
    roiPercent: profitLossKwd === null ? null : roundPercent((profitLossKwd / 1000) * 100),
    roiResult: (savedProgress.roiResult as JourneyRoiResult | null) ?? null,
    marketDataNote: JOURNEY_MARKET_NOTE,
  };
}

export async function getJourneyState(userId: string): Promise<JourneyStateResponse> {
  return buildJourneyState(userId);
}

async function ensureWeeklyChallengeProgress(
  userId: string,
  weekStart: string,
  challenge: WeeklyChallengeSnapshot,
): Promise<WeeklyChallengeProgressDocument> {
  const { weeklyChallenges } = getMongoCollections();
  const now = new Date();
  const key = { userId, weekStart, challengeId: challenge.challengeId };
  try {
    await weeklyChallenges.updateOne(
      key,
      {
        $setOnInsert: {
          userId,
          weekStart,
          challengeId: challenge.challengeId,
          progress: 0,
          goal: challenge.goal,
          completedAt: null,
          badgeAwardedAt: null,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  } catch (error) {
    const existing = await weeklyChallenges.findOne(key);
    if (!existing) throw error;
  }

  const progress = Math.min(challenge.progress, challenge.goal);
  if (progress > 0) {
    await weeklyChallenges.updateOne(
      { ...key, progress: { $lt: progress } },
      {
        $set: {
          progress,
          goal: challenge.goal,
          updatedAt: now,
        },
      },
    );
  }

  if (progress >= challenge.goal) {
    const badgeAwardedAt = challenge.completedAt ?? now;
    await weeklyChallenges.updateOne(
      { ...key, badgeAwardedAt: null },
      {
        $set: {
          progress: challenge.goal,
          goal: challenge.goal,
          completedAt: badgeAwardedAt,
          badgeAwardedAt,
          updatedAt: now,
        },
      },
    );
  }

  const savedChallenge = await weeklyChallenges.findOne(key);
  if (!savedChallenge) {
    throw new Error("Weekly challenge progress could not be initialized.");
  }
  return savedChallenge;
}

export async function getJourneyWeeklySummary(
  userId: string,
): Promise<JourneyWeeklySummaryResponse> {
  const savedProgress = await ensureJourneyProgress(userId);
  const now = new Date();
  const { weekStart, weekStartKey } = getKuwaitWeekWindow(now);
  const trades = await getMongoCollections().demoTrades
    .find({ userId })
    .sort({ createdAt: 1, id: 1 })
    .toArray();
  const weeklyTrades = trades
    .filter((trade) => trade.createdAt.getTime() >= weekStart.getTime())
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id);

  const symbols = [...new Set([
    ...trades.map((trade) => trade.symbol),
  ])];
  let stocks: Awaited<ReturnType<typeof getMarketScanner>>["stocks"] = [];
  if (symbols.length > 0) {
    try {
      const market = await getMarketScanner();
      stocks = market.stocks.filter((stock) => symbols.includes(stock.symbol));
    } catch (error) {
      logger.warn({ err: error }, "Weekly practice portfolio could not refresh market prices");
    }
  }

  const performance = calculateWeeklyPortfolio(trades, stocks, weekStart);
  const sectorBySymbol = new Map(stocks.map((stock) => [stock.symbol, stock.sector ?? null]));
  const challengeSnapshots = deriveWeeklyChallenges({
    trades,
    weekStart,
    watchlistSymbols: savedProgress.watchlistSymbols,
    watchlistUpdatedAt: savedProgress.watchlistUpdatedAt ?? null,
    sectorBySymbol,
  });
  const challengeProgress = await Promise.all(
    challengeSnapshots.map((challenge) => ensureWeeklyChallengeProgress(userId, weekStartKey, challenge)),
  );

  return {
    weekStart: weekStartKey,
    profitLossKwd: performance.profitLossKwd,
    tradeCount: performance.tradeCount,
    bestHolding: performance.bestHolding,
    worstHolding: performance.worstHolding,
    sampleData: performance.sampleData,
    delayedData: performance.delayedData,
    challenges: challengeProgress.map((challenge) => ({
      challengeId: challenge.challengeId,
      progress: Math.min(challenge.progress, challenge.goal),
      goal: challenge.goal,
      completed: challenge.progress >= challenge.goal,
      badgeAwardedAt: challenge.badgeAwardedAt ?? null,
    })),
  };
}

export async function updateJourneyWatchlist(
  userId: string,
  symbols: string[],
): Promise<JourneyStateResponse> {
  const market = await getMarketScanner();
  const available = new Set(market.stocks.map((stock) => stock.symbol));
  const unknownSymbols = symbols.filter((symbol) => !available.has(symbol));
  if (unknownSymbols.length > 0) {
    throw new JourneyError(`Unknown company symbol: ${unknownSymbols[0]}`, 400);
  }

  const progress = await ensureJourneyProgress(userId);
  if (progress.furthestStep < 1) {
    throw new JourneyError("Start the market scan before saving companies.");
  }

  const watchlistSymbols = [...new Set(symbols)];
  const watchlistUpdatedAt = new Date();
  await getMongoCollections().journeyProgress.updateOne(
    { userId },
    { $set: { watchlistSymbols, watchlistUpdatedAt, updatedAt: watchlistUpdatedAt } },
  );
  await ensureWeeklyChallengeProgress(
    userId,
    getKuwaitWeekWindow(watchlistUpdatedAt).weekStartKey,
    {
      challengeId: "two-company-watchlist",
      progress: Math.min(watchlistSymbols.length, 2),
      goal: 2,
      completedAt: watchlistSymbols.length >= 2 ? watchlistUpdatedAt : null,
    },
  );
  return getJourneyState(userId);
}

export async function advanceJourney(
  userId: string,
  fromStep: JourneyStep,
  nextStep: JourneyStep,
): Promise<JourneyStateResponse> {
  const progress = await ensureJourneyProgress(userId);
  const fromIndex = getStepIndex(fromStep);
  const nextIndex = getStepIndex(nextStep);
  if (fromIndex < 0 || nextIndex !== fromIndex + 1) {
    throw new JourneyError("Journey steps must be completed in order.");
  }
  if (progress.furthestStep < fromIndex) {
    throw new JourneyError("Complete the earlier phase before continuing.");
  }

  if (fromStep === "scan" && progress.watchlistSymbols.length === 0) {
    throw new JourneyError("Choose at least one company before continuing.");
  }
  if (fromStep === "research" && !progress.researchCompleted) {
    throw new JourneyError("Complete one AI company analysis before continuing.");
  }
  let practiceSkipped = false;
  if (fromStep === "practice") {
    const trade = await getMongoCollections().demoTrades.findOne(
      { userId },
      { projection: { id: 1 } },
    );
    practiceSkipped = !trade;
  }
  await getMongoCollections().journeyProgress.updateOne(
    { userId },
    {
      $set: {
        currentStep: nextStep,
        updatedAt: new Date(),
        ...(fromStep === "practice" ? { practiceSkipped } : {}),
      },
      $max: { furthestStep: nextIndex },
    },
  );
  return getJourneyState(userId);
}

export async function skipPractice(
  userId: string,
): Promise<JourneyStateResponse> {
  const progress = await ensureJourneyProgress(userId);
  if (progress.furthestStep < 5) {
    throw new JourneyError("Reach the practice phase before skipping it.");
  }

  await getMongoCollections().journeyProgress.updateOne(
    { userId },
    {
      $set: {
        practiceSkipped: true,
        currentStep: "roi-intro",
        updatedAt: new Date(),
      },
      $max: { furthestStep: 6 },
    },
  );
  return getJourneyState(userId);
}

export async function placeDemoTrade(
  userId: string,
  input: { symbol: string; side: "buy" | "sell"; quantity: number },
): Promise<JourneyStateResponse> {
  const progress = await ensureJourneyProgress(userId);
  if (progress.furthestStep < 5) {
    throw new JourneyError("Reach the practice phase before trading.");
  }

  const stock = await getMarketStock(input.symbol);
  const currentPriceKwd = stock?.stock.priceKwd;
  if (!currentPriceKwd || currentPriceKwd <= 0) {
    throw new JourneyError("A usable quote is not available for this company.", 409);
  }
  const notionalKwd = roundKwd(currentPriceKwd * input.quantity);

  const { demoTrades, journeyProgress } = getMongoCollections();
  const session = getMongoClient().startSession();
  const createdAt = new Date();
  let celebrateFirstTrade = false;
  try {
    await session.withTransaction(async () => {
      celebrateFirstTrade = false;
      const lockedProgress = await journeyProgress.findOne({ userId }, { session });
      if (!lockedProgress) {
        throw new JourneyError("Start the journey before placing a practice trade.");
      }
      if (lockedProgress.furthestStep < 5) {
        throw new JourneyError("Reach the practice phase before trading.");
      }

      const userTrades = await demoTrades
        .find({ userId }, { session })
        .sort({ createdAt: 1, id: 1 })
        .toArray();
      const account = calculateAccount(userTrades);

      if (input.side === "buy" && account.cashKwd < notionalKwd) {
        throw new JourneyError("The practice wallet does not have enough cash.", 409);
      }
      if (input.side === "sell") {
        const position = account.positions.get(input.symbol);
        if (!position || position.quantity < input.quantity) {
          throw new JourneyError("You do not have enough shares to sell.", 409);
        }
      }

      if (
        shouldCelebrateFirstPracticeTrade(
          userTrades.length,
          lockedProgress.firstTradeCelebrationSeen === true,
        )
      ) {
        const claimed = await journeyProgress.updateOne(
          { userId, firstTradeCelebrationSeen: { $ne: true } },
          { $set: { firstTradeCelebrationSeen: true, updatedAt: createdAt } },
          { session },
        );
        celebrateFirstTrade = claimed.modifiedCount === 1;
      } else if (
        userTrades.length > 0 &&
        lockedProgress.firstTradeCelebrationSeen !== true
      ) {
        await journeyProgress.updateOne(
          { userId },
          { $set: { firstTradeCelebrationSeen: true, updatedAt: createdAt } },
          { session },
        );
      }

      await demoTrades.insertOne(
        {
          id: await nextMongoId("demo_trades", session),
          userId,
          symbol: input.symbol,
          side: input.side,
          quantity: input.quantity,
          priceKwd: currentPriceKwd.toFixed(3),
          notionalKwd: notionalKwd.toFixed(3),
          marketTime: stock?.stock.marketTime ?? null,
          sample: stock?.stock.sample ?? true,
          stale: stock?.stock.stale ?? true,
          sector: stock?.stock.sector ?? null,
          createdAt,
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  try {
    await ensureWeeklyChallengeProgress(
      userId,
      getKuwaitWeekWindow(createdAt).weekStartKey,
      {
        challengeId: "first-practice-trade",
        progress: 1,
        goal: 1,
        completedAt: createdAt,
      },
    );
  } catch (error) {
    logger.warn({ err: error }, "Weekly practice challenge progress will be refreshed on the next summary view");
  }

  return {
    ...(await getJourneyState(userId)),
    celebrateFirstTrade,
  };
}

export async function resetPracticeWallet(
  userId: string,
): Promise<JourneyStateResponse> {
  const progress = await ensureJourneyProgress(userId);
  if (progress.furthestStep < 5) {
    throw new JourneyError("Reach the practice phase before resetting the wallet.");
  }

  const { demoTrades, journeyProgress, weeklyChallenges } = getMongoCollections();
  const currentWeekStart = getKuwaitWeekWindow(new Date()).weekStartKey;
  const session = getMongoClient().startSession();
  try {
    await session.withTransaction(async () => {
      const locked = await journeyProgress.findOne({ userId }, { session });
      if (!locked || locked.furthestStep < 5) {
        throw new JourneyError("Reach the practice phase before resetting the wallet.");
      }
      const hadTradesBeforeReset = Boolean(
        await demoTrades.findOne({ userId }, { session, projection: { _id: 1 } }),
      );
      await demoTrades.deleteMany({ userId }, { session });
      await weeklyChallenges.deleteMany({ userId, weekStart: currentWeekStart }, { session });
      await journeyProgress.updateOne(
        { userId },
        {
          $set: {
            currentStep: "practice",
            furthestStep: 5,
            practiceSkipped: false,
            firstTradeCelebrationSeen:
              locked.firstTradeCelebrationSeen ?? hadTradesBeforeReset,
            watchlistUpdatedAt: null,
            roiResult: null,
            updatedAt: new Date(),
          },
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  return getJourneyState(userId);
}

export async function saveRoiResult(
  userId: string,
  input: {
    symbol: string;
    budgetKwd: number;
    buyPriceKwd: number;
    targetPriceKwd: number;
    annualDividendKwd?: number;
    yearsHeld: number;
  },
): Promise<JourneyStateResponse> {
  const progress = await ensureJourneyProgress(userId);
  if (progress.furthestStep < 7) {
    throw new JourneyError("Reach the ROI calculator phase before calculating.");
  }

  let result: JourneyRoiResult;
  try {
    result = { ...calculateRoiScenario(input), createdAt: new Date() };
  } catch (error) {
    if (error instanceof RangeError) throw new JourneyError(error.message, 400);
    throw error;
  }

  await getMongoCollections().journeyProgress.updateOne(
    { userId },
    { $set: { roiResult: result, currentStep: "roi", updatedAt: new Date() } },
  );
  return getJourneyState(userId);
}

export async function resetJourney(
  userId: string,
): Promise<JourneyStateResponse> {
  await ensureJourneyProgress(userId);
  const { demoTrades, journeyProgress, weeklyChallenges } = getMongoCollections();
  const session = getMongoClient().startSession();
  try {
    await session.withTransaction(async () => {
      const locked = await journeyProgress.findOne({ userId }, { session });
      const hadTradesBeforeReset = Boolean(
        await demoTrades.findOne({ userId }, { session, projection: { _id: 1 } }),
      );
      await demoTrades.deleteMany({ userId }, { session });
      await weeklyChallenges.deleteMany({ userId }, { session });
      await journeyProgress.updateOne(
        { userId },
        {
          $set: {
            currentStep: "scan-intro",
            furthestStep: 0,
            watchlistSymbols: [],
            watchlistUpdatedAt: null,
            researchCompleted: false,
            practiceSkipped: false,
            firstTradeCelebrationSeen:
              locked?.firstTradeCelebrationSeen ?? hadTradesBeforeReset,
            roiResult: null,
            updatedAt: new Date(),
          },
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  return getJourneyState(userId);
}

export async function markResearchComplete(userId: string | undefined): Promise<void> {
  if (!userId) {
    return;
  }
  await getMongoCollections().journeyProgress.updateOne(
    { userId, furthestStep: { $gte: 3 } },
    { $set: { researchCompleted: true, updatedAt: new Date() } },
  );
}

export async function getCompanyResearchContext(
  symbol: string,
): Promise<CompanyResearchContext> {
  const result = await getMarketStock(symbol);
  if (!result?.stock) {
    throw new JourneyError("Company is not available in the market scanner.", 404);
  }
  const [profile, scanner] = await Promise.all([
    getYahooCompanyProfile(symbol),
    getMarketScanner(),
  ]);
  return {
    ...result,
    companySector: result.stock.sector ?? profile.sector,
    companyDescription: profile.description,
    ratingReason: getRatingReason(result.stock, scanner.stocks),
  };
}

