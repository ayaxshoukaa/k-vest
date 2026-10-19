export const roundKwd = (value: number): number => Math.round((value + Number.EPSILON) * 1000) / 1000;
export const roundPercent = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

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
