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
const { calculateLedger, calculateRoiScenario } = await import(pathToFileURL(outfile));
after(() => rm(dir, { recursive: true, force: true }));

test("demo wallet starts with exactly 1,000 KWD", () => {
  assert.equal(calculateLedger([]).cashKwd, 1000);
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
