import { GetMarketNewsResponse } from "@workspace/api-zod";
import { createYahooFinanceClient } from "./yahoo-finance-client";

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_STALE_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12_000;
const NEWS_SEARCH_TERMS = ["stock market today", "global financial markets"] as const;

type MarketNewsResponse = ReturnType<typeof GetMarketNewsResponse.parse>;
type MarketNewsArticle = MarketNewsResponse["articles"][number];
type CachedNews = {
  articles: MarketNewsArticle[];
  cachedAt: number;
};

interface YahooNewsItem {
  uuid?: unknown;
  title?: unknown;
  publisher?: unknown;
  link?: unknown;
  providerPublishTime?: unknown;
}

interface YahooFinanceNewsClient {
  search(
    query: string,
    searchOptions: {
      lang: string;
      region: string;
      quotesCount: number;
      newsCount: number;
      enableFuzzyQuery: boolean;
    },
    moduleOptions: { fetchOptions: { signal: AbortSignal } },
  ): Promise<{ news: YahooNewsItem[] }>;
}

const yahooFinance = createYahooFinanceClient<YahooFinanceNewsClient>({
  suppressNotices: ["yahooSurvey"],
  queue: { concurrency: 2, interval: 300 },
});

let cachedNews: CachedNews | null = null;

function toArticle(item: YahooNewsItem): MarketNewsArticle | null {
  if (
    typeof item.title !== "string"
    || typeof item.publisher !== "string"
    || typeof item.link !== "string"
  ) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(item.link);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const publishedAt = item.providerPublishTime instanceof Date
    && Number.isFinite(item.providerPublishTime.getTime())
    ? item.providerPublishTime
    : null;

  return {
    id: typeof item.uuid === "string" && item.uuid.length > 0 ? item.uuid : url.toString(),
    title: item.title,
    publisher: item.publisher,
    url: url.toString(),
    publishedAt,
  };
}

function makeResponse(
  status: MarketNewsResponse["status"],
  articles: MarketNewsArticle[],
  lastUpdatedAt: Date | null,
  warning: string | null,
): MarketNewsResponse {
  return GetMarketNewsResponse.parse({
    status,
    articles,
    lastUpdatedAt,
    warning,
    source: "Yahoo Finance",
  });
}

export async function getMarketNews(
  onRefreshError?: (error: unknown) => void,
): Promise<MarketNewsResponse> {
  const now = Date.now();
  if (cachedNews && now - cachedNews.cachedAt < CACHE_TTL_MS) {
    return makeResponse("fresh", cachedNews.articles, new Date(cachedNews.cachedAt), null);
  }

  try {
    const results = await Promise.allSettled(
      NEWS_SEARCH_TERMS.map((query) => yahooFinance.search(
        query,
        {
          lang: "en-US",
          region: "US",
          quotesCount: 0,
          newsCount: 8,
          enableFuzzyQuery: false,
        },
        { fetchOptions: { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) } },
      )),
    );
    const failedSearches = results.filter((result) => result.status === "rejected");
    if (failedSearches.length === results.length) {
      throw failedSearches[0]?.status === "rejected"
        ? failedSearches[0].reason
        : new Error("Yahoo Finance returned no successful news searches.");
    }

    const articleByUrl = new Map<string, MarketNewsArticle>();
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const item of result.value.news) {
        const article = toArticle(item);
        if (article && !articleByUrl.has(article.url)) {
          articleByUrl.set(article.url, article);
        }
      }
    }

    const articles = [...articleByUrl.values()]
      .sort((a, b) => {
        if (!a.publishedAt) return 1;
        if (!b.publishedAt) return -1;
        return b.publishedAt.getTime() - a.publishedAt.getTime();
      })
      .slice(0, 12);
    const refreshedAt = Date.now();
    cachedNews = { articles, cachedAt: refreshedAt };

    return makeResponse(
      "fresh",
      articles,
      new Date(refreshedAt),
      failedSearches.length > 0 ? "Some Yahoo Finance news searches could not be refreshed." : null,
    );
  } catch (error) {
    onRefreshError?.(error);
    if (cachedNews && Date.now() - cachedNews.cachedAt < MAX_STALE_MS) {
      return makeResponse(
        "stale",
        cachedNews.articles,
        new Date(cachedNews.cachedAt),
        "Yahoo Finance could not refresh the headlines. Showing the last successful update.",
      );
    }

    return makeResponse(
      "unavailable",
      [],
      null,
      "Yahoo Finance news is temporarily unavailable. Please try again later.",
    );
  }
}
