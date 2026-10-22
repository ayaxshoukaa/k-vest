import { MarketQuotesResponseRefreshStatus, type MarketQuote, type MarketQuotesResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { createYahooFinanceClient } from "./yahoo-finance-client";

const CACHE_TTL_MS = 3 * 60 * 1000;
const FAILURE_RETRY_MS = 30 * 1000;
const REQUEST_TIMEOUT_MS = 12 * 1000;

const MARKET_UNIVERSE = [
  { symbol: "NBK.KW", companyName: "National Bank of Kuwait" },
  { symbol: "KFH.KW", companyName: "Kuwait Finance House" },
  { symbol: "ZAIN.KW", companyName: "Mobile Telecommunications Company" },
  { symbol: "BOUBYAN.KW", companyName: "Boubyan Bank" },
  { symbol: "BOURSA.KW", companyName: "Boursa Kuwait Securities Company" },
  { symbol: "ARKAN.KW", companyName: "Arkan Al-Kuwait Real Estate Company" },
  { symbol: "EMIRATES.KW", companyName: "Kuwait Emirates Holding Company" },
  { symbol: "KRE.KW", companyName: "Kuwait Real Estate Company" },
  { symbol: "ABK.KW", companyName: "Al Ahli Bank of Kuwait" },
  { symbol: "CBK.KW", companyName: "Commercial Bank of Kuwait" },
  { symbol: "KINS.KW", companyName: "Kuwait Insurance Company" },
] as const;

interface ProviderQuote {
  symbol?: string;
  currency?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  regularMarketTime?: Date | string | number;
}

export interface MarketQuoteProvider {
  fetchQuotes(): Promise<ProviderQuote[]>;
}

interface YahooFinanceClient {
  quote(
    symbols: string[],
    queryOptions: { fields: Array<keyof ProviderQuote> },
    moduleOptions: { fetchOptions: { signal: AbortSignal } },
  ): Promise<ProviderQuote[]>;
}

class YahooFinanceQuoteProvider implements MarketQuoteProvider {
  private readonly yahooFinance = createYahooFinanceClient<YahooFinanceClient>({
    suppressNotices: ["yahooSurvey"],
  });

  async fetchQuotes(): Promise<ProviderQuote[]> {
    const quotes = await this.yahooFinance.quote(
      MARKET_UNIVERSE.map(({ symbol }) => symbol),
      {
        fields: [
          "symbol",
          "currency",
          "regularMarketPrice",
          "regularMarketChange",
          "regularMarketChangePercent",
          "regularMarketVolume",
          "regularMarketTime",
        ],
      },
      {
        fetchOptions: { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
      },
    );

    return quotes.map((quote) => ({
      symbol: quote.symbol,
      currency: quote.currency,
      regularMarketPrice: quote.regularMarketPrice,
      regularMarketChange: quote.regularMarketChange,
      regularMarketChangePercent: quote.regularMarketChangePercent,
      regularMarketVolume: quote.regularMarketVolume,
      regularMarketTime: quote.regularMarketTime,
    }));
  }
}

function toDate(value: ProviderQuote["regularMarketTime"]): Date | null {
  if (value === undefined || value === null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toKwd(value: number, currency: string): number {
  if (!Number.isFinite(value)) {
    throw new Error("Yahoo Finance returned a non-finite price value.");
  }

  if (currency === "KWF") {
    return Number((value / 1000).toFixed(3));
  }
  if (currency === "KWD") {
    return Number(value.toFixed(3));
  }

  throw new Error(`Unexpected Yahoo Finance currency for a Kuwait listing: ${currency}`);
}

export class MarketQuotesService {
  private readonly lastGoodQuotes = new Map<string, MarketQuote>();
  private lastAttemptAt: number | null = null;
  private refreshInFlight: Promise<void> | null = null;

  constructor(
    private readonly provider: MarketQuoteProvider,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async getQuotes(): Promise<MarketQuotesResponse> {
    const now = this.clock();
    const retryWindowElapsed =
      this.lastAttemptAt === null
      || now.getTime() - this.lastAttemptAt >= FAILURE_RETRY_MS;
    if (!this.isCacheFresh(now) && retryWindowElapsed) {
      await this.refresh();
    }

    return this.snapshot(this.clock());
  }

  private isCacheFresh(now: Date): boolean {
    return MARKET_UNIVERSE.every(({ symbol }) => {
      const quote = this.lastGoodQuotes.get(symbol);
      return quote?.updatedAt !== null
        && quote?.updatedAt !== undefined
        && now.getTime() - quote.updatedAt.getTime() < CACHE_TTL_MS;
    });
  }

  private async refresh(): Promise<void> {
    if (this.refreshInFlight) {
      await this.refreshInFlight;
      return;
    }

    this.lastAttemptAt = this.clock().getTime();
    this.refreshInFlight = this.fetchAndCache().finally(() => {
      this.refreshInFlight = null;
    });
    await this.refreshInFlight;
  }

  private async fetchAndCache(): Promise<void> {
    try {
      const providerQuotes = await this.provider.fetchQuotes();
      const fetchedAt = this.clock();
      const listings = new Map<string, (typeof MARKET_UNIVERSE)[number]>(
        MARKET_UNIVERSE.map((listing) => [listing.symbol, listing]),
      );
      let successfulQuotes = 0;

      for (const quote of providerQuotes) {
        if (!quote.symbol) continue;
        const listing = listings.get(quote.symbol);
        if (!listing || typeof quote.regularMarketPrice !== "number" || !quote.currency) {
          continue;
        }

        try {
          const divisorCurrency = quote.currency;
          const priceKwd = toKwd(quote.regularMarketPrice, divisorCurrency);
          const changeKwd =
            typeof quote.regularMarketChange === "number"
              ? toKwd(quote.regularMarketChange, divisorCurrency)
              : null;
          const changePercent =
            typeof quote.regularMarketChangePercent === "number"
              && Number.isFinite(quote.regularMarketChangePercent)
              ? quote.regularMarketChangePercent
              : null;

          this.lastGoodQuotes.set(quote.symbol, {
            symbol: listing.symbol,
            companyName: listing.companyName,
            priceKwd,
            changeKwd,
            changePercent,
            volume: typeof quote.regularMarketVolume === "number" && Number.isFinite(quote.regularMarketVolume)
              ? quote.regularMarketVolume
              : null,
            marketTime: toDate(quote.regularMarketTime),
            updatedAt: fetchedAt,
            stale: false,
          });
          successfulQuotes += 1;
        } catch (error) {
          logger.warn({ err: error, symbol: quote.symbol }, "Skipping an invalid Yahoo Finance quote");
        }
      }

      if (successfulQuotes === 0) {
        throw new Error("Yahoo Finance returned no usable Kuwait quotes.");
      }
    } catch (error) {
      logger.warn({ err: error }, "Yahoo Finance refresh failed; retaining last successful quotes");
    }
  }

  private snapshot(now: Date): MarketQuotesResponse {
    const quotes = MARKET_UNIVERSE.map(({ symbol, companyName }) => {
      const cached = this.lastGoodQuotes.get(symbol);
      if (!cached) {
        return {
          symbol,
          companyName,
          priceKwd: null,
          changeKwd: null,
          changePercent: null,
          volume: null,
          marketTime: null,
          updatedAt: null,
          stale: true,
        } satisfies MarketQuote;
      }

      const quoteAge = cached.updatedAt
        ? now.getTime() - cached.updatedAt.getTime()
        : Number.POSITIVE_INFINITY;
      return {
        ...cached,
        stale: quoteAge >= CACHE_TTL_MS,
      };
    });

    const availableQuotes = quotes.filter((quote) => quote.priceKwd !== null);
    const refreshStatus = availableQuotes.length === 0
      ? MarketQuotesResponseRefreshStatus.unavailable
      : quotes.every((quote) => quote.priceKwd !== null && !quote.stale)
        ? MarketQuotesResponseRefreshStatus.fresh
        : MarketQuotesResponseRefreshStatus.stale;
    const lastUpdatedAt = availableQuotes.reduce<Date | null>((latest, quote) => {
      if (!quote.updatedAt) return latest;
      return !latest || quote.updatedAt.getTime() > latest.getTime() ? quote.updatedAt : latest;
    }, null);

    return { refreshStatus, lastUpdatedAt, quotes };
  }
}

const marketQuotesService = new MarketQuotesService(new YahooFinanceQuoteProvider());

export function getMarketQuotes(): Promise<MarketQuotesResponse> {
  return marketQuotesService.getQuotes();
}
