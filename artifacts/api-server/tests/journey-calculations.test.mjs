import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const dir = await mkdtemp(path.join(tmpdir(), "kvest-math-"));
const outfile = path.join(dir, "math.mjs");
await build({ entryPoints: ["src/services/journey-calculations.ts"], bundle: true, platform: "node", format: "esm", outfile, logLevel: "silent" });
const {
  calculateLedger,
  calculateRoiScenario,
  deriveWeeklyChallenges,
  calculateWeeklyPortfolio,
  getKuwaitWeekWindow,
} = await import(pathToFileURL(outfile));
after(() => rm(dir, { recursive: true, force: true }));

test("demo wallet starts with exactly 1,000 KWD", () => {
  assert.equal(calculateLedger([]).cashKwd, 1000);
});
test("weekly summary uses Monday midnight in Kuwait as the week boundary", () => {
  const currentWeek = getKuwaitWeekWindow(new Date("2026-10-22T10:00:00.000Z"));
  assert.equal(currentWeek.weekStartKey, "2026-10-19");
  assert.equal(currentWeek.weekStart.toISOString(), "2026-10-18T21:00:00.000Z");

  const previousWeek = getKuwaitWeekWindow(new Date("2026-10-18T20:59:59.000Z"));
  assert.equal(previousWeek.weekStartKey, "2026-10-12");
});
test("weekly challenges track a first trade, a new sector, and two saved companies", () => {
  const weekStart = new Date("2026-10-18T21:00:00.000Z");
  const watchlistUpdatedAt = new Date("2026-10-22T10:00:00.000Z");
  const trades = [
    { symbol: "NBK", side: "buy", quantity: 1, notionalKwd: "10", sector: "Banking", createdAt: new Date("2026-10-16T10:00:00.000Z") },
    { symbol: "NBK", side: "buy", quantity: 1, notionalKwd: "10", sector: "Banking", createdAt: new Date("2026-10-20T10:00:00.000Z") },
    { symbol: "ZAIN", side: "buy", quantity: 1, notionalKwd: "10", sector: "Telecommunications", createdAt: new Date("2026-10-21T10:00:00.000Z") },
  ];
  const input = {
    trades,
    weekStart,
    watchlistSymbols: ["NBK"],
    watchlistUpdatedAt,
    sectorBySymbol: new Map(),
  };
  const partial = deriveWeeklyChallenges(input);
  assert.deepEqual(partial.map(({ challengeId, progress, goal }) => [challengeId, progress, goal]), [
    ["first-practice-trade", 1, 1],
    ["new-sector-trade", 1, 1],
    ["two-company-watchlist", 1, 2],
  ]);

  const complete = deriveWeeklyChallenges({ ...input, watchlistSymbols: ["NBK", "ZAIN"] });
  assert.equal(complete[2].completedAt, watchlistUpdatedAt);
});
test("a trade in a previously practiced sector does not complete the new-sector challenge", () => {
  const challenges = deriveWeeklyChallenges({
    trades: [
      { symbol: "NBK", side: "buy", quantity: 1, notionalKwd: "10", sector: "Banking", createdAt: new Date("2026-10-16T10:00:00.000Z") },
      { symbol: "GULF", side: "buy", quantity: 1, notionalKwd: "10", sector: "Banking", createdAt: new Date("2026-10-20T10:00:00.000Z") },
    ],
    weekStart: new Date("2026-10-18T21:00:00.000Z"),
    watchlistSymbols: [],
    watchlistUpdatedAt: null,
    sectorBySymbol: new Map(),
  });
  assert.equal(challenges.find((challenge) => challenge.challengeId === "new-sector-trade").progress, 0);
});
test("weekly portfolio gain includes market changes without counting trades as gains", () => {
  const weekStart = new Date("2026-10-18T21:00:00.000Z");
  const result = calculateWeeklyPortfolio([
    { symbol: "NBK", side: "buy", quantity: 10, notionalKwd: "100.000", createdAt: new Date("2026-10-16T10:00:00.000Z") },
    { symbol: "NBK", side: "buy", quantity: 2, notionalKwd: "22.000", createdAt: new Date("2026-10-20T10:00:00.000Z") },
    { symbol: "NBK", side: "sell", quantity: 1, notionalKwd: "12.000", createdAt: new Date("2026-10-21T10:00:00.000Z") },
  ], [{
    symbol: "NBK",
    companyName: "National Bank of Kuwait",
    priceKwd: 12,
    sparkline: [{ date: "2026-10-16T10:00:00.000Z", closeKwd: 10.5 }],
    sample: false,
    stale: false,
  }], weekStart);

  assert.equal(result.profitLossKwd, 17);
  assert.equal(result.tradeCount, 2);
  assert.deepEqual(result.bestHolding, { symbol: "NBK", companyName: "National Bank of Kuwait", profitLossKwd: 17 });
  assert.deepEqual(result.worstHolding, result.bestHolding);
});
test("weekly summary includes realized gains when a holding is sold", () => {
  const result = calculateWeeklyPortfolio([
    { symbol: "NBK", side: "buy", quantity: 10, notionalKwd: "100.000", createdAt: new Date("2026-10-16T10:00:00.000Z") },
    { symbol: "NBK", side: "sell", quantity: 10, notionalKwd: "110.000", createdAt: new Date("2026-10-20T10:00:00.000Z") },
  ], [{
    symbol: "NBK",
    companyName: "National Bank of Kuwait",
    priceKwd: 11,
    sparkline: [{ date: "2026-10-16T10:00:00.000Z", closeKwd: 10 }],
    sample: false,
    stale: false,
  }], new Date("2026-10-18T21:00:00.000Z"));

  assert.equal(result.profitLossKwd, 10);
  assert.equal(result.tradeCount, 1);
  assert.equal(result.bestHolding, null);
  assert.equal(result.worstHolding, null);
});
test("weekly summary does not invent a change when start-of-week prices are missing", () => {
  const result = calculateWeeklyPortfolio([
    { symbol: "NBK", side: "buy", quantity: 10, notionalKwd: "100.000", createdAt: new Date("2026-10-16T10:00:00.000Z") },
  ], [{
    symbol: "NBK",
    companyName: "National Bank of Kuwait",
    priceKwd: 11,
    sparkline: [],
    sample: false,
    stale: false,
  }], new Date("2026-10-18T21:00:00.000Z"));

  assert.equal(result.profitLossKwd, null);
  assert.equal(result.bestHolding, null);
  assert.equal(result.worstHolding, null);
});
test("partial sales preserve average cost and realize proceeds as cash", () => {
  const account = calculateLedger([
    { symbol: "NBK", side: "buy", quantity: 10, notionalKwd: "9.500" },
    { symbol: "NBK", side: "buy", quantity: 10, notionalKwd: "10.500" },
    { symbol: "NBK", side: "sell", quantity: 5, notionalKwd: "6.000" },
  ]);
  assert.equal(account.cashKwd, 986);
  assert.deepEqual(account.positions.get("NBK"), { quantity: 15, costBasisKwd: 15 });
});
test("closing a holding removes it without losing realized profit", () => {
  const account = calculateLedger([
    { symbol: "NBK", side: "buy", quantity: 10, notionalKwd: "9.500" },
    { symbol: "NBK", side: "sell", quantity: 10, notionalKwd: "10.500" },
  ]);
  assert.equal(account.cashKwd, 1001);
  assert.equal(account.positions.size, 0);
});
test("ROI includes annual dividends and compounds annualized return", () => {
  const result = calculateRoiScenario({ symbol: "NBK", budgetKwd: 1000, buyPriceKwd: 1, targetPriceKwd: 1.2, annualDividendKwd: 0.05, yearsHeld: 2 });
  assert.equal(result.shares, 1000);
  assert.equal(result.dividendTotalKwd, 100);
  assert.equal(result.profitLossKwd, 300);
  assert.equal(result.roiPercent, 30);
  assert.equal(result.annualizedReturnPercent, 14.02);
});
test("total loss yields -100 percent rather than an invalid number", () => {
  const result = calculateRoiScenario({ symbol: "NBK", budgetKwd: 1000, buyPriceKwd: 1, targetPriceKwd: 0, yearsHeld: 2 });
  assert.equal(result.profitLossKwd, -1000);
  assert.equal(result.annualizedReturnPercent, -100);
});
test("fractional scenario shares retain correct three-decimal currency output", () => {
  const result = calculateRoiScenario({ symbol: "NBK", budgetKwd: 100, buyPriceKwd: 0.955, targetPriceKwd: 1, yearsHeld: 1 });
  assert.equal(result.profitLossKwd, 4.712);
  assert.equal(result.roiPercent, 4.71);
});
test("invalid and overflowing assumptions are rejected", () => {
  for (const value of [0, -1, NaN, Infinity]) {
    assert.throws(() => calculateRoiScenario({ symbol: "NBK", budgetKwd: 1000, buyPriceKwd: value, targetPriceKwd: 2, yearsHeld: 1 }), RangeError);
  }
  assert.throws(() => calculateRoiScenario({ symbol: "NBK", budgetKwd: 1000, buyPriceKwd: 1, targetPriceKwd: 1000, yearsHeld: 0.00001 }), RangeError);
});
