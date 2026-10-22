export const roundKwd = (value: number): number => Math.round((value + Number.EPSILON) * 1000) / 1000;
export const roundPercent = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export function shouldCelebrateFirstPracticeTrade(
  tradeCount: number,
  celebrationSeen: boolean,
): boolean {
  return tradeCount === 0 && !celebrationSeen;
}

const KUWAIT_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function getKuwaitWeekWindow(now: Date): { weekStart: Date; weekStartKey: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kuwait",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const getPart = (type: string) => parts.find((part) => part.type === type)?.value;
  const year = Number(getPart("year"));
  const month = Number(getPart("month"));
  const day = Number(getPart("day"));
  if (![year, month, day].every(Number.isInteger)) {
    throw new RangeError("A valid date is required to calculate the Kuwait week.");
  }

  const localCalendarDate = new Date(Date.UTC(year, month - 1, day));
  const daysSinceMonday = (localCalendarDate.getUTCDay() + 6) % 7;
  const mondayCalendarDate = new Date(localCalendarDate.getTime() - daysSinceMonday * DAY_MS);
  const weekStartKey = [
    mondayCalendarDate.getUTCFullYear(),
    String(mondayCalendarDate.getUTCMonth() + 1).padStart(2, "0"),
    String(mondayCalendarDate.getUTCDate()).padStart(2, "0"),
  ].join("-");

  return {
    weekStartKey,
    weekStart: new Date(mondayCalendarDate.getTime() - KUWAIT_OFFSET_MS),
  };
}

export interface WeeklyTradeEntry {
  symbol: string;
  side: string;
  quantity: number;
  notionalKwd: string | number;
  createdAt: Date;
  sample?: boolean;
  stale?: boolean;
  sector?: string | null;
}

export interface WeeklyQuoteEntry {
  symbol: string;
  companyName: string;
  priceKwd: number | null;
  sparkline: { date: string | Date; closeKwd: number }[];
  sample: boolean;
  stale: boolean;
}

export interface WeeklyHoldingPerformance {
  symbol: string;
  companyName: string;
  profitLossKwd: number;
}

export type WeeklyChallengeId =
  | "first-practice-trade"
  | "new-sector-trade"
  | "two-company-watchlist";

export interface WeeklyChallengeSnapshot {
  challengeId: WeeklyChallengeId;
  progress: number;
  goal: number;
  completedAt: Date | null;
}

export function deriveWeeklyChallenges(input: {
  trades: WeeklyTradeEntry[];
  weekStart: Date;
  watchlistSymbols: string[];
  watchlistUpdatedAt: Date | null;
  sectorBySymbol: Map<string, string | null>;
}): WeeklyChallengeSnapshot[] {
  const earlierTrades = input.trades.filter((trade) => trade.createdAt.getTime() < input.weekStart.getTime());
  const thisWeekTrades = input.trades
    .filter((trade) => trade.createdAt.getTime() >= input.weekStart.getTime())
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const sectorForTrade = (trade: WeeklyTradeEntry) => trade.sector ?? input.sectorBySymbol.get(trade.symbol) ?? null;
  const earlierSectors = new Set(
    earlierTrades
      .map(sectorForTrade)
      .filter((sector): sector is string => typeof sector === "string" && sector.length > 0),
  );
  const firstNewSectorTrade = thisWeekTrades.find((trade) => {
    const sector = sectorForTrade(trade);
    return Boolean(sector && !earlierSectors.has(sector));
  });
  const firstTrade = thisWeekTrades[0] ?? null;
  const compareGoalProgress =
    input.watchlistUpdatedAt && input.watchlistUpdatedAt.getTime() >= input.weekStart.getTime()
      ? Math.min(input.watchlistSymbols.length, 2)
      : 0;

  return [
    {
      challengeId: "first-practice-trade",
      progress: firstTrade ? 1 : 0,
      goal: 1,
      completedAt: firstTrade?.createdAt ?? null,
    },
    {
      challengeId: "new-sector-trade",
      progress: firstNewSectorTrade ? 1 : 0,
      goal: 1,
      completedAt: firstNewSectorTrade?.createdAt ?? null,
    },
    {
      challengeId: "two-company-watchlist",
      progress: compareGoalProgress,
      goal: 2,
      completedAt: compareGoalProgress >= 2 ? input.watchlistUpdatedAt : null,
    },
  ];
}

export function calculateWeeklyPortfolio(
  trades: WeeklyTradeEntry[],
  quotes: WeeklyQuoteEntry[],
  weekStart: Date,
) {
  const openingTrades = trades.filter((trade) => trade.createdAt.getTime() < weekStart.getTime());
  const weekTrades = trades.filter((trade) => trade.createdAt.getTime() >= weekStart.getTime());
  const opening = calculateLedger(openingTrades);
  const ending = calculateLedger(trades);
  const quoteBySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
  const tradeCashFlowBySymbol = new Map<string, number>();

  for (const trade of weekTrades) {
    const signedNotional = Number(trade.notionalKwd) * (trade.side === "sell" ? 1 : -1);
    tradeCashFlowBySymbol.set(
      trade.symbol,
      (tradeCashFlowBySymbol.get(trade.symbol) ?? 0) + signedNotional,
    );
  }

  const priceAtWeekStart = (symbol: string): number | null => {
    const quote = quoteBySymbol.get(symbol);
    if (!quote) return null;
    const priorPoints = quote.sparkline
      .map((point) => ({ time: new Date(point.date).getTime(), price: point.closeKwd }))
      .filter((point) => Number.isFinite(point.time) && point.time < weekStart.getTime()
        && Number.isFinite(point.price) && point.price > 0)
      .sort((a, b) => a.time - b.time);
    return priorPoints.at(-1)?.price ?? null;
  };

  let openingValueKwd = opening.cashKwd;
  let currentValueKwd = ending.cashKwd;
  let performanceAvailable = true;

  for (const [symbol, position] of opening.positions) {
    const priorPrice = priceAtWeekStart(symbol);
    if (priorPrice === null) {
      performanceAvailable = false;
    } else {
      openingValueKwd += position.quantity * priorPrice;
    }
  }

  for (const [symbol, position] of ending.positions) {
    const currentPrice = quoteBySymbol.get(symbol)?.priceKwd;
    if (currentPrice == null || !Number.isFinite(currentPrice) || currentPrice <= 0) {
      performanceAvailable = false;
    } else {
      currentValueKwd += position.quantity * currentPrice;
    }
  }

  const holdings: WeeklyHoldingPerformance[] = [];
  for (const [symbol, position] of ending.positions) {
    const startPosition = opening.positions.get(symbol);
    const startQuantity = startPosition?.quantity ?? 0;
    const startPrice = startQuantity > 0 ? priceAtWeekStart(symbol) : 0;
    const currentPrice = quoteBySymbol.get(symbol)?.priceKwd;
    if (startPrice === null || currentPrice == null || !Number.isFinite(currentPrice) || currentPrice <= 0) {
      continue;
    }
    const startValue = startQuantity * startPrice;
    const currentHoldingValue = position.quantity * currentPrice;
    const tradeCashFlow = tradeCashFlowBySymbol.get(symbol) ?? 0;
    const profitLossKwd = roundKwd(currentHoldingValue - startValue + tradeCashFlow);
    const quote = quoteBySymbol.get(symbol);
    holdings.push({
      symbol,
      companyName: quote?.companyName ?? symbol,
      profitLossKwd,
    });
  }

  const relevantSymbols = new Set([
    ...opening.positions.keys(),
    ...ending.positions.keys(),
    ...weekTrades.map((trade) => trade.symbol),
  ]);
  const relevantQuotes = [...relevantSymbols].map((symbol) => quoteBySymbol.get(symbol)).filter(Boolean);
  const sampleData =
    weekTrades.some((trade) => trade.sample) || relevantQuotes.some((quote) => quote?.sample);
  const delayedData =
    weekTrades.some((trade) => trade.stale) || relevantQuotes.some((quote) => quote?.stale);

  return {
    profitLossKwd: performanceAvailable ? roundKwd(currentValueKwd - openingValueKwd) : null,
    tradeCount: weekTrades.length,
    bestHolding: holdings.length
      ? [...holdings].sort((a, b) => b.profitLossKwd - a.profitLossKwd)[0]
      : null,
    worstHolding: holdings.length
      ? [...holdings].sort((a, b) => a.profitLossKwd - b.profitLossKwd)[0]
      : null,
    sampleData: Boolean(sampleData),
    delayedData: Boolean(delayedData),
  };
}

export function calculateLedger(
  trades: { symbol: string; side: string; quantity: number; notionalKwd: string | number }[],
) {
  let cashKwd = 1000;
  const positions = new Map<string, { quantity: number; costBasisKwd: number }>();
  for (const trade of trades) {
    const notional = Number(trade.notionalKwd);
    const position = positions.get(trade.symbol) ?? { quantity: 0, costBasisKwd: 0 };
    if (trade.side === "buy") {
      cashKwd -= notional;
      position.quantity += trade.quantity;
      position.costBasisKwd += notional;
    } else {
      const averageCost = position.quantity > 0 ? position.costBasisKwd / position.quantity : 0;
      cashKwd += notional;
      position.quantity -= trade.quantity;
      position.costBasisKwd -= averageCost * trade.quantity;
    }
    if (position.quantity <= 0) positions.delete(trade.symbol);
    else positions.set(trade.symbol, position);
  }
  return { cashKwd: roundKwd(cashKwd), positions };
}

export interface RoiScenarioInput {
  symbol: string;
  budgetKwd: number;
  buyPriceKwd: number;
  targetPriceKwd: number;
  annualDividendKwd?: number;
  yearsHeld: number;
}

export function calculateRoiScenario(input: RoiScenarioInput) {
  const dividend = input.annualDividendKwd ?? 0;
  if (![input.budgetKwd, input.buyPriceKwd, input.targetPriceKwd, dividend, input.yearsHeld].every(Number.isFinite)
    || input.budgetKwd <= 0 || input.buyPriceKwd <= 0 || input.targetPriceKwd < 0 || dividend < 0 || input.yearsHeld <= 0) {
    throw new RangeError("Budget, buy price and years must be positive. Target and dividends cannot be negative.");
  }
  const shares = input.budgetKwd / input.buyPriceKwd;
  const dividendTotal = shares * dividend * input.yearsHeld;
  const finalValue = shares * input.targetPriceKwd + dividendTotal;
  const profitLoss = finalValue - input.budgetKwd;
  const roi = (profitLoss / input.budgetKwd) * 100;
  const annualized = finalValue <= 0 ? -100 : (Math.pow(finalValue / input.budgetKwd, 1 / input.yearsHeld) - 1) * 100;
  const move = Math.abs((input.targetPriceKwd - input.buyPriceKwd) / input.buyPriceKwd) * 100;
  if (![shares, dividendTotal, finalValue, profitLoss, roi, annualized, move].every(Number.isFinite)) {
    throw new RangeError("These assumptions produce a result too large to calculate. Use a longer holding period or smaller amounts.");
  }
  return {
    symbol: input.symbol,
    budgetKwd: input.budgetKwd,
    buyPriceKwd: input.buyPriceKwd,
    targetPriceKwd: input.targetPriceKwd,
    annualDividendKwd: dividend,
    yearsHeld: input.yearsHeld,
    shares: roundKwd(shares),
    dividendTotalKwd: roundKwd(dividendTotal),
    finalValueKwd: roundKwd(finalValue),
    profitLossKwd: roundKwd(profitLoss),
    roiPercent: roundPercent(roi),
    annualizedReturnPercent: roundPercent(annualized),
    riskLabel: (move <= 5 ? "Low" : move <= 20 ? "Medium" : "High") as "Low" | "Medium" | "High",
  };
}
