import {
  GetMarketScannerResponse,
  GetMarketStockResponse,
  type MarketIndex,
  type MarketScannerResponse,
  type MarketScannerStock,
  type MarketStockDetailResponse,
} from "@workspace/api-zod";
import { getCacheEntry, getCached, setCache } from "../lib/cache";
import { logger } from "../lib/logger";
import {
  OanorMarketDataProvider,
  YahooHistoryProvider,
  toKwd,
  type YahooCompanyProfile,
  type MarketHistoryPoint,
  type OanorIndex,
  type OanorListing,
} from "./market-data-providers";
import { getMarketQuotes } from "./market-quotes";
import { publishedSampleAt, publishedSampleIndex, publishedSampleStocks } from "./market-scanner-samples";

const SCANNER_CACHE_KEY = "market-scanner-v2";
const STOCK_CACHE_PREFIX = "market-stock-v1:";
const SAMPLE_WARNING =
  "Oanor is unavailable. Published example quotes are shown as sample data, not live prices.";

function median(values: number[]): number | null {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function getMonthlyMomentum(points: MarketHistoryPoint[]): number | null {
  const valid = points.filter((point) => Number.isFinite(point.closeKwd) && point.closeKwd > 0);
  if (valid.length < 2) return null;
  const first = valid[0].closeKwd;
  const last = valid[valid.length - 1].closeKwd;
  return first > 0 ? ((last - first) / first) * 100 : null;
}

function getRating(
  momentumPercent: number | null,
  volume: number | null,
  medianVolume: number | null,
): MarketScannerStock["rating"] {
  if (momentumPercent === null || volume === null || medianVolume === null) {
    return "Unavailable";
  }
  if (volume < medianVolume) return "Neutral";
  if (momentumPercent > 0) return "Strong";
  if (momentumPercent < 0) return "Weak";
  return "Neutral";
}

export function getRatingReason(
  stock: Pick<MarketScannerStock, "rating" | "momentumPercent" | "volume">,
  universe: MarketScannerStock[],
): string {
  const medianVolume = median(
    universe
      .map((candidate) => candidate.volume ?? 0)
      .filter((volume) => volume > 0),
  );
  const calculatedRating = getRating(stock.momentumPercent, stock.volume, medianVolume);
  const currentVolume = stock.volume?.toLocaleString("en-US") ?? "unavailable";
  const medianVolumeText = medianVolume?.toLocaleString("en-US") ?? "unavailable";

  if (calculatedRating !== stock.rating) {
    return `The displayed rating is ${stock.rating}, but the current inputs would produce ${calculatedRating}; the quote and scanner may be from different refreshes.`;
  }
  if (calculatedRating === "Unavailable") {
    const missing = [
      stock.momentumPercent === null ? "one-month price momentum" : null,
      stock.volume === null ? "current trading volume" : null,
      medianVolume === null ? "scanner median volume" : null,
    ].filter((item): item is string => item !== null);
    return `Unavailable because ${missing.join(", ") || "the market inputs are incomplete"}.`;
  }
  if (stock.volume !== null && medianVolume !== null && stock.volume < medianVolume) {
    return `Neutral because current trading volume (${stock.volume.toLocaleString("en-US")}) is below the scanner median (${medianVolume.toLocaleString("en-US")}).`;
  }
  if (stock.momentumPercent !== null && stock.momentumPercent > 0) {
    return `Strong because one-month price momentum is positive (${stock.momentumPercent.toFixed(2)}%) and current volume (${currentVolume}) is at or above the scanner median (${medianVolumeText}).`;
  }
  if (stock.momentumPercent !== null && stock.momentumPercent < 0) {
    return `Weak because one-month price momentum is negative (${stock.momentumPercent.toFixed(2)}%) while current volume (${currentVolume}) is at or above the scanner median (${medianVolumeText}).`;
  }
  return `Neutral because one-month price momentum is flat while current volume (${currentVolume}) is at or above the scanner median (${medianVolumeText}).`;
}

function toMarketStock(
  listing: OanorListing,
  history: MarketHistoryPoint[],
  medianVolume: number | null,
): MarketScannerStock {
  const momentumPercent = getMonthlyMomentum(history);
  return {
    symbol: listing.symbol,
    companyName: listing.name,
    sector: listing.sector,
    priceKwd: toKwd(listing.last, listing.currency),
    changeKwd: toKwd(listing.changeAbs, listing.currency),
    changePercent: listing.changePercent,
    volume: listing.volume,
    marketTime: listing.marketTime,
    momentumPercent,
    rating: getRating(momentumPercent, listing.volume, medianVolume),
    sparkline: history,
    stale: false,
    sample: false,
  };
}

function toMarketIndex(index: OanorIndex): MarketIndex {
  return {
    symbol: index.symbol,
    name: index.name,
    value: index.value,
    changeAbs: index.changeAbs,
    changePercent: index.changePercent,
    marketTime: index.marketTime,
  };
}

function latestDate(dates: Array<Date | null>): Date | null {
  return dates.reduce<Date | null>((latest, date) => {
    if (!date) return latest;
    return !latest || date.getTime() > latest.getTime() ? date : latest;
  }, null);
}

function parseScannerCache(value: unknown): MarketScannerResponse | null {
  const parsed = GetMarketScannerResponse.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseStockCache(value: unknown): MarketStockDetailResponse | null {
  const parsed = GetMarketStockResponse.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function asStale(response: MarketScannerResponse): MarketScannerResponse {
  return {
    ...response,
    refreshStatus: "stale",
    warning: "Oanor could not refresh. Showing the last successful market data.",
    stocks: response.stocks.map((stock) => ({ ...stock, stale: true })),
  };
}

function asStaleStock(response: MarketStockDetailResponse): MarketStockDetailResponse {
  return {
    ...response,
    refreshStatus: "stale",
    warning: "Oanor could not refresh. Showing the last successful quote and history.",
    stock: { ...response.stock, stale: true },
  };
}

class MarketScannerService {
  private readonly oanor = new OanorMarketDataProvider();
  private readonly yahooHistory = new YahooHistoryProvider();
  private scannerRefreshInFlight: Promise<MarketScannerResponse> | null = null;
  private readonly stockRefreshes = new Map<string, Promise<MarketStockDetailResponse | null>>();

  async getScanner(): Promise<MarketScannerResponse> {
    const cached = await getCached<unknown>(SCANNER_CACHE_KEY);
    const fresh = parseScannerCache(cached);
    if (fresh) return fresh;

    const previousEntry = await getCacheEntry(SCANNER_CACHE_KEY);
    const previous = previousEntry ? parseScannerCache(previousEntry.responseData) : null;
    if (this.scannerRefreshInFlight) {
      return this.scannerRefreshInFlight;
    }

    this.scannerRefreshInFlight = this.refreshScanner(previous).finally(() => {
      this.scannerRefreshInFlight = null;
    });
    return this.scannerRefreshInFlight;
  }

  private async refreshScanner(previous: MarketScannerResponse | null): Promise<MarketScannerResponse> {
    try {
      const [screenerResult, indexResult] = await Promise.allSettled([
        this.oanor.fetchScreener(),
        this.oanor.fetchPremierIndex(),
      ]);
      if (screenerResult.status === "rejected") {
        throw screenerResult.reason;
      }

      const listings = screenerResult.value;
      const index = indexResult.status === "fulfilled" ? toMarketIndex(indexResult.value) : null;
      if (indexResult.status === "rejected") {
        logger.warn({ err: indexResult.reason }, "Oanor Premier Market index refresh failed");
      }

      const medianVolume = median(listings.map((listing) => listing.volume));
      const stocks = await Promise.all(
        listings.map(async (listing) => {
          const history = await this.yahooHistory.fetchOneMonth(listing.symbol, listing.currency);
          return toMarketStock(listing, history, medianVolume);
        }),
      );
      const lastUpdatedAt = latestDate([
        ...listings.map((listing) => listing.marketTime),
        index?.marketTime ?? null,
      ]);
      const response: MarketScannerResponse = {
        refreshStatus: "fresh",
        lastUpdatedAt,
        warning: index ? null : "The Premier Market index is temporarily unavailable.",
        index,
        stocks,
      };

      try {
        await setCache(SCANNER_CACHE_KEY, response);
      } catch (error) {
        logger.error({ err: error }, "Could not save the market scanner cache");
      }
      return response;
    } catch (error) {
      logger.warn({ err: error }, "Oanor market scanner refresh failed");
      if (previous) return asStale(previous);
      return this.getYahooFallback();
    }
  }

  private async getPublishedSample(): Promise<MarketScannerResponse> {
    const stocks = await Promise.all(
      publishedSampleStocks.map(async (stock) => ({
        ...stock,
        sparkline: await this.yahooHistory.fetchOneMonth(stock.symbol, "KWF"),
      })),
    );
    return {
      refreshStatus: "sample",
      lastUpdatedAt: publishedSampleAt,
      warning: SAMPLE_WARNING,
      index: publishedSampleIndex,
      stocks,
    };
  }

  private async getYahooFallback(): Promise<MarketScannerResponse> {
    try {
      const quoteResponse = await getMarketQuotes();
      const quoteBySymbol = new Map(quoteResponse.quotes.map((quote) => [quote.symbol, quote]));
      const yahooQuoteCount = quoteResponse.quotes.filter((quote) => quote.priceKwd !== null).length;
      if (yahooQuoteCount === 0) return this.getPublishedSample();

      const availableVolumes = quoteResponse.quotes
        .map((quote) => quote.volume)
        .filter((volume): volume is number => volume !== null && volume > 0);
      const medianVolume = median(availableVolumes);
      const stocks = await Promise.all(
        publishedSampleStocks.map(async (sampleStock) => {
          const quote = quoteBySymbol.get(`${sampleStock.symbol}.KW`);
          const history = await this.yahooHistory.fetchOneMonth(sampleStock.symbol, "KWF");
          if (!quote || quote.priceKwd === null) {
            return {
              ...sampleStock,
              sparkline: history.length > 0 ? history : sampleStock.sparkline,
            };
          }

          const momentumPercent = getMonthlyMomentum(history);
          return {
            ...sampleStock,
            priceKwd: quote.priceKwd,
            changeKwd: quote.changeKwd,
            changePercent: quote.changePercent,
            volume: quote.volume,
            marketTime: quote.marketTime ?? quote.updatedAt,
            momentumPercent,
            rating: getRating(momentumPercent, quote.volume, medianVolume),
            sparkline: history,
            stale: quote.stale,
            sample: false,
          };
        }),
      );

      return {
        refreshStatus: quoteResponse.refreshStatus === "fresh" && yahooQuoteCount === publishedSampleStocks.length
          ? "fresh"
          : "stale",
        lastUpdatedAt: quoteResponse.lastUpdatedAt,
        warning: `Oanor is unavailable. Delayed Yahoo Finance quotes are shown for ${yahooQuoteCount} of ${publishedSampleStocks.length} learning stocks; the Premier Market index is unavailable.`,
        index: null,
        stocks,
      };
    } catch (error) {
      logger.warn({ err: error }, "Yahoo Finance fallback for the market scanner failed");
      return this.getPublishedSample();
    }
  }

  async getStock(symbol: string): Promise<MarketStockDetailResponse | null> {
    const cacheKey = `${STOCK_CACHE_PREFIX}${symbol}`;
    const cached = await getCached<unknown>(cacheKey);
    const fresh = parseStockCache(cached);
    if (fresh) return fresh;

    const previousEntry = await getCacheEntry(cacheKey);
    const previous = previousEntry ? parseStockCache(previousEntry.responseData) : null;
    const inFlight = this.stockRefreshes.get(symbol);
    if (inFlight) return inFlight;

    const refresh = this.refreshStock(symbol, previous).finally(() => {
      this.stockRefreshes.delete(symbol);
    });
    this.stockRefreshes.set(symbol, refresh);
    return refresh;
  }

  async getCompanyProfile(symbol: string): Promise<YahooCompanyProfile> {
    return this.yahooHistory.fetchCompanyProfile(symbol);
  }

  private async refreshStock(
    symbol: string,
    previous: MarketStockDetailResponse | null,
  ): Promise<MarketStockDetailResponse | null> {
    const scanner = await this.getScanner();
    const baseStock = scanner.stocks.find((stock) => stock.symbol === symbol);
    if (!baseStock && !previous) return null;

    try {
      const quote = await this.oanor.fetchQuote(symbol);
      const history = await this.yahooHistory.fetchOneMonth(symbol, quote.currency);
      const medianVolume = median(scanner.stocks.map((stock) => stock.volume ?? 0).filter((value) => value > 0));
      const stock = toMarketStock(quote, history, medianVolume);
      const response: MarketStockDetailResponse = {
        refreshStatus: "fresh",
        lastUpdatedAt: quote.marketTime,
        warning: history.length > 0 ? null : "Yahoo Finance history is temporarily unavailable.",
        stock,
      };

      try {
        await setCache(`${STOCK_CACHE_PREFIX}${symbol}`, response);
      } catch (error) {
        logger.error({ err: error, symbol }, "Could not save the market stock cache");
      }
      return response;
    } catch (error) {
      logger.warn({ err: error, symbol }, "Oanor stock quote refresh failed");
      if (previous) return asStaleStock(previous);

      const fallbackStock = baseStock;
      if (!fallbackStock) return null;
      const currency = "KWF";
      const history = await this.yahooHistory.fetchOneMonth(symbol, currency);
      const isSample = fallbackStock.sample;
      return {
        refreshStatus: isSample ? "sample" : fallbackStock.stale ? "stale" : "fresh",
        lastUpdatedAt: fallbackStock.marketTime,
        warning: isSample
          ? SAMPLE_WARNING
          : scanner.warning ?? "Oanor could not refresh. Showing the last successful market data.",
        stock: {
          ...fallbackStock,
          sparkline: history.length > 0 ? history : fallbackStock.sparkline,
          stale: fallbackStock.stale,
          sample: isSample,
        },
      };
    }
  }
}

const marketScannerService = new MarketScannerService();

export function getMarketScanner(): Promise<MarketScannerResponse> {
  return marketScannerService.getScanner();
}

export function getMarketStock(symbol: string): Promise<MarketStockDetailResponse | null> {
  return marketScannerService.getStock(symbol);
}

export function getYahooCompanyProfile(symbol: string): Promise<YahooCompanyProfile> {
  return marketScannerService.getCompanyProfile(symbol);
}
