import YahooFinance from "yahoo-finance2";
import { logger } from "../lib/logger";

const OANOR_BASE_URL = "https://api.oanor.com/kuwait-stock-api/v1";
const REQUEST_TIMEOUT_MS = 12_000;
const HISTORY_CACHE_TTL_MS = 5 * 60 * 1000;

export interface OanorListing {
  symbol: string;
  name: string;
  sector: string | null;
  last: number;
  currency: string;
  changeAbs: number;
  changePercent: number;
  volume: number;
  marketTime: Date | null;
}

export interface OanorIndex {
  symbol: string;
  name: string;
  value: number;
  changeAbs: number;
  changePercent: number;
  marketTime: Date | null;
}

export interface MarketHistoryPoint {
  date: Date;
  closeKwd: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Date)) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toKwd(value: number, currency: string): number {
  if (!Number.isFinite(value)) {
    throw new Error("A market-data provider returned a non-finite price.");
  }
  if (currency === "KWF") return Number((value / 1000).toFixed(3));
  if (currency === "KWD") return Number(value.toFixed(3));
  throw new Error(`Unexpected currency for a Kuwait listing: ${currency}`);
}

function requiredKey(): string {
  const key = process.env.OANOR_KEY?.trim();
  if (!key) {
    throw new Error("OANOR_KEY is not configured.");
  }
  return key;
}

async function fetchOanorJson(url: URL): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "x-oanor-key": requiredKey(),
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Oanor API returned HTTP ${response.status}.`);
  }

  return response.json() as Promise<unknown>;
}

function parseListing(value: unknown, marketTime: Date | null): OanorListing | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.symbol !== "string"
    || !/^[A-Z0-9]{1,12}$/.test(value.symbol)
    || typeof value.name !== "string"
    || typeof value.currency !== "string"
    || !isFiniteNumber(value.last)
    || !isFiniteNumber(value.change_abs)
    || !isFiniteNumber(value.change_pct)
    || !isFiniteNumber(value.volume)
  ) {
    return null;
  }

  return {
    symbol: value.symbol,
    name: value.name,
    sector: typeof value.sector === "string" ? value.sector : null,
    last: value.last,
    currency: value.currency,
    changeAbs: value.change_abs,
    changePercent: value.change_pct,
    volume: value.volume,
    marketTime,
  };
}

function parseListings(payload: unknown, field: "results" | "quotes"): OanorListing[] {
  if (!isRecord(payload) || payload.success !== true || !isRecord(payload.data)) {
    throw new Error("Oanor returned an invalid stock response.");
  }

  const rows = payload.data[field];
  if (!Array.isArray(rows)) {
    throw new Error("Oanor returned an invalid stock list.");
  }
  const marketTime = isRecord(payload.meta) ? toDate(payload.meta.timestamp) : null;
  const listings = rows
    .map((row) => parseListing(row, marketTime))
    .filter((row): row is OanorListing => row !== null);

  if (listings.length === 0) {
    throw new Error("Oanor returned no usable stock quotes.");
  }
  return listings;
}

export class OanorMarketDataProvider {
  async fetchScreener(): Promise<OanorListing[]> {
    const url = new URL(`${OANOR_BASE_URL}/screener`);
    url.searchParams.set("sort", "market_cap");
    url.searchParams.set("order", "desc");
    url.searchParams.set("limit", "100");
    return parseListings(await fetchOanorJson(url), "results");
  }

  async fetchQuote(symbol: string): Promise<OanorListing> {
    const url = new URL(`${OANOR_BASE_URL}/quote`);
    url.searchParams.set("symbols", symbol);
    const quotes = parseListings(await fetchOanorJson(url), "quotes");
    const quote = quotes.find((item) => item.symbol === symbol);
    if (!quote) {
      throw new Error("Oanor did not return a quote for the requested stock.");
    }
    return quote;
  }

  async fetchPremierIndex(): Promise<OanorIndex> {
    const payload = await fetchOanorJson(new URL(`${OANOR_BASE_URL}/index`));
    if (!isRecord(payload) || payload.success !== true || !isRecord(payload.data)) {
      throw new Error("Oanor returned an invalid index response.");
    }

    const indices = payload.data.indices;
    if (!Array.isArray(indices)) {
      throw new Error("Oanor returned an invalid index list.");
    }
    const candidate = indices.find((item) => isRecord(item) && item.index === "BKP")
      ?? indices.find((item) => isRecord(item) && typeof item.name === "string" && item.name.includes("Premier Market"));

    if (
      !isRecord(candidate)
      || typeof candidate.index !== "string"
      || typeof candidate.name !== "string"
      || !isFiniteNumber(candidate.value)
      || !isFiniteNumber(candidate.change_abs)
      || !isFiniteNumber(candidate.change_pct)
    ) {
      throw new Error("Oanor did not return the Premier Market index.");
    }

    return {
      symbol: candidate.index,
      name: candidate.name,
      value: candidate.value,
      changeAbs: candidate.change_abs,
      changePercent: candidate.change_pct,
      marketTime: isRecord(payload.meta) ? toDate(payload.meta.timestamp) : null,
    };
  }
}

export class YahooHistoryProvider {
  private readonly yahooFinance = new YahooFinance({
    suppressNotices: ["yahooSurvey"],
    queue: { concurrency: 3, interval: 250 },
  });
  private readonly historyCache = new Map<string, { points: MarketHistoryPoint[]; cachedAt: number }>();

  async fetchOneMonth(symbol: string, currency: string): Promise<MarketHistoryPoint[]> {
    const normalizedSymbol = symbol.endsWith(".KW") ? symbol : `${symbol}.KW`;
    const cached = this.historyCache.get(normalizedSymbol);
    if (cached && Date.now() - cached.cachedAt < HISTORY_CACHE_TTL_MS) {
      return cached.points;
    }

    try {
      const now = new Date();
      const period1 = new Date(now.getTime() - 32 * 24 * 60 * 60 * 1000);
      const result = await this.yahooFinance.chart(
        normalizedSymbol,
        { period1, period2: now, interval: "1d", return: "array" },
        {
          validateResult: true,
          fetchOptions: { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
        },
      );
      const points = result.quotes
        .filter((quote) => quote.date instanceof Date && isFiniteNumber(quote.close) && quote.close > 0)
        .map((quote) => ({
          date: quote.date,
          closeKwd: toKwd(quote.close as number, currency),
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      if (points.length > 0) {
        this.historyCache.set(normalizedSymbol, { points, cachedAt: Date.now() });
      }
      return points;
    } catch (error) {
      logger.warn({ err: error, symbol: normalizedSymbol }, "Yahoo Finance history refresh failed");
      return cached?.points ?? [];
    }
  }
}
