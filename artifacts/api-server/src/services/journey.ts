import { and, asc, eq, gte } from "drizzle-orm";
import {
  demoTradesTable,
  journeyProgressTable,
  type JourneyProgress,
} from "@workspace/db";
import type {
  DemoHolding,
  DemoTrade,
  JourneyRoiResult,
  JourneyStateResponse,
  JourneyStep,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import { getMarketScanner, getMarketStock } from "./market-scanner";
import { calculateLedger as calculateAccount, calculateRoiScenario, roundKwd, roundPercent } from "./journey-calculations";

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

export async function ensureJourneyProgress(userId: string): Promise<JourneyProgress> {
  await db.insert(journeyProgressTable).values({ userId }).onConflictDoNothing();
  const [progress] = await db
    .select()
    .from(journeyProgressTable)
    .where(eq(journeyProgressTable.userId, userId))
    .limit(1);

  if (!progress) {
    throw new Error("Journey progress could not be initialized.");
  }
  return progress;
}

async function buildJourneyState(
  userId: string,
  progress?: JourneyProgress,
): Promise<JourneyStateResponse> {
  const savedProgress = progress ?? (await ensureJourneyProgress(userId));
  const trades = await db
    .select()
    .from(demoTradesTable)
    .where(eq(demoTradesTable.userId, userId))
    .orderBy(asc(demoTradesTable.createdAt), asc(demoTradesTable.id));
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

  await db
    .update(journeyProgressTable)
    .set({ watchlistSymbols: [...new Set(symbols)] })
    .where(eq(journeyProgressTable.userId, userId));
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
  if (fromStep === "practice" && !progress.practiceSkipped) {
    const [trade] = await db
      .select({ id: demoTradesTable.id })
      .from(demoTradesTable)
      .where(eq(demoTradesTable.userId, userId))
      .limit(1);
    if (!trade) {
      throw new JourneyError("Make one practice trade or choose Skip to continue.");
    }
  }
  if (fromStep === "roi" && !progress.roiResult) {
    throw new JourneyError("Calculate your scenario before finishing.");
  }

  await db
    .update(journeyProgressTable)
    .set({
      currentStep: nextStep,
      furthestStep: Math.max(progress.furthestStep, nextIndex),
    })
    .where(eq(journeyProgressTable.userId, userId));
  return getJourneyState(userId);
}

export async function skipPractice(
  userId: string,
): Promise<JourneyStateResponse> {
  const progress = await ensureJourneyProgress(userId);
  if (progress.furthestStep < 5) {
    throw new JourneyError("Reach the practice phase before skipping it.");
  }

  await db
    .update(journeyProgressTable)
    .set({
      practiceSkipped: true,
      currentStep: "roi-intro",
      furthestStep: Math.max(progress.furthestStep, 6),
    })
    .where(eq(journeyProgressTable.userId, userId));
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

  await db.transaction(async (tx) => {
    const [lockedProgress] = await tx
      .select()
      .from(journeyProgressTable)
      .where(eq(journeyProgressTable.userId, userId))
      .for("update")
      .limit(1);
    if (!lockedProgress) {
      throw new JourneyError("Start the journey before placing a practice trade.");
    }
    if (lockedProgress.furthestStep < 5) {
      throw new JourneyError("Reach the practice phase before trading.");
    }

    const userTrades = await tx
      .select()
      .from(demoTradesTable)
      .where(eq(demoTradesTable.userId, userId))
      .orderBy(asc(demoTradesTable.createdAt), asc(demoTradesTable.id))
      .for("update");
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

    await tx.insert(demoTradesTable).values({
      userId,
      symbol: input.symbol,
      side: input.side,
      quantity: input.quantity,
      priceKwd: currentPriceKwd.toFixed(3),
      notionalKwd: notionalKwd.toFixed(3),
      marketTime: stock?.stock.marketTime ?? null,
      sample: stock?.stock.sample ?? true,
      stale: stock?.stock.stale ?? true,
    });
  });

  return getJourneyState(userId);
}

export async function resetPracticeWallet(
  userId: string,
): Promise<JourneyStateResponse> {
  const progress = await ensureJourneyProgress(userId);
  if (progress.furthestStep < 5) {
    throw new JourneyError("Reach the practice phase before resetting the wallet.");
  }

  await db.transaction(async (tx) => {
    const [locked] = await tx.select().from(journeyProgressTable)
      .where(eq(journeyProgressTable.userId, userId)).for("update").limit(1);
    if (!locked || locked.furthestStep < 5) {
      throw new JourneyError("Reach the practice phase before resetting the wallet.");
    }
    await tx.delete(demoTradesTable).where(eq(demoTradesTable.userId, userId));
    await tx
      .update(journeyProgressTable)
      .set({
        currentStep: "practice",
        furthestStep: 5,
        practiceSkipped: false,
        roiResult: null,
      })
      .where(eq(journeyProgressTable.userId, userId));
  });
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

  await db
    .update(journeyProgressTable)
    .set({ roiResult: result, currentStep: "roi" })
    .where(eq(journeyProgressTable.userId, userId));
  return getJourneyState(userId);
}

export async function resetJourney(
  userId: string,
): Promise<JourneyStateResponse> {
  await ensureJourneyProgress(userId);
  await db.transaction(async (tx) => {
    await tx.select().from(journeyProgressTable)
      .where(eq(journeyProgressTable.userId, userId)).for("update");
    await tx.delete(demoTradesTable).where(eq(demoTradesTable.userId, userId));
    await tx
      .update(journeyProgressTable)
      .set({
        currentStep: "scan-intro",
        furthestStep: 0,
        watchlistSymbols: [],
        researchCompleted: false,
        practiceSkipped: false,
        roiResult: null,
      })
      .where(eq(journeyProgressTable.userId, userId));
  });
  return getJourneyState(userId);
}

export async function markResearchComplete(userId: string | undefined): Promise<void> {
  if (!userId) {
    return;
  }
  await db
    .update(journeyProgressTable)
    .set({ researchCompleted: true })
    .where(
      and(
        eq(journeyProgressTable.userId, userId),
        // Only mark the phase complete if the user has reached it.
        gte(journeyProgressTable.furthestStep, 3),
      ),
    );
}

export async function getCompanyResearchContext(symbol: string) {
  const result = await getMarketStock(symbol);
  if (!result?.stock) {
    throw new JourneyError("Company is not available in the market scanner.", 404);
  }
  return result;
}

