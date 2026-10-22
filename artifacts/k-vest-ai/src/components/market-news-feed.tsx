import { getGetMarketNewsQueryKey, useGetMarketNews } from "@workspace/api-client-react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { friendlyWarning } from "@/lib/journey";
import "./market-news-feed.css";

export type NewsLanguage = "en" | "ar";

type MarketNewsFeedProps = {
  language: NewsLanguage;
  limit?: number;
};

const messages = {
  en: {
    loading: "Loading the latest headlines…",
    unavailable: "We couldn't load the headlines right now. Please try again in a moment.",
    noNews: "No headlines are available right now. Please check again soon.",
    retry: "Try again",
    refreshing: "Refreshing",
    stale: "Showing the last successful update.",
    source: "Yahoo Finance",
    publishedUnknown: "Publication time unavailable",
  },
  ar: {
    loading: "جارٍ تحميل أحدث العناوين…",
    unavailable: "تعذّر تحميل العناوين الآن. يُرجى المحاولة مجددًا بعد قليل.",
    noNews: "لا توجد عناوين متاحة الآن. يرجى المحاولة لاحقًا.",
    retry: "إعادة المحاولة",
    refreshing: "جارٍ التحديث",
    stale: "نعرض آخر تحديث ناجح.",
    source: "Yahoo Finance",
    publishedUnknown: "وقت النشر غير متاح",
  },
} as const;

function formatPublishedAt(value: string | null, language: NewsLanguage): string {
  if (!value) return messages[language].publishedUnknown;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return messages[language].publishedUnknown;

  return new Intl.DateTimeFormat(language === "ar" ? "ar-KW" : "en-KW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuwait",
  }).format(date);
}

export function MarketNewsFeed({ language, limit }: MarketNewsFeedProps) {
  const query = useGetMarketNews({
    query: {
      queryKey: getGetMarketNewsQueryKey(),
      staleTime: 5 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
    },
  });
  const text = messages[language];
  const articles = query.data?.articles.slice(0, limit);

  return (
    <div className="market-news-feed" data-testid="market-news-feed">
      {query.isLoading && !query.data && (
        <div className="market-news-feed__grid" aria-live="polite" aria-label={text.loading}>
          {Array.from({ length: Math.min(limit ?? 6, 6) }, (_, index) => (
            <div className="market-news-feed__skeleton" key={index} aria-hidden="true" />
          ))}
        </div>
      )}

      {query.isError && !query.data && (
        <div className="market-news-feed__state" role="alert">
          <p>{text.unavailable}</p>
          <button
            type="button"
            className="market-news-feed__retry"
            onClick={() => void query.refetch()}
            data-testid="button-retry-market-news"
          >
            <RefreshCw size={15} aria-hidden="true" />
            {text.retry}
          </button>
        </div>
      )}

      {query.data && (
        <>
          <div className="market-news-feed__meta" data-testid="status-market-news">
            <span className={`market-news-feed__status is-${query.data.status}`}>
              <i aria-hidden="true" />
              {query.data.status === "fresh"
                ? text.source
                : query.data.status === "stale"
                  ? text.stale
                  : text.unavailable}
            </span>
            {query.isFetching && <span>{text.refreshing}</span>}
          </div>

          {query.data.warning && (
            <p className="market-news-feed__warning" role="status" data-testid="text-market-news-warning">
              {friendlyWarning(query.data.warning, language)}
              <button
                type="button"
                className="market-news-feed__retry"
                onClick={() => void query.refetch()}
                disabled={query.isFetching}
                data-testid="button-retry-market-news-warning"
              >
                <RefreshCw size={15} aria-hidden="true" />
                {query.isFetching ? text.refreshing : text.retry}
              </button>
            </p>
          )}

          {articles?.length ? (
            <div className="market-news-feed__grid">
              {articles.map((article) => (
                <article className="market-news-feed__article" key={article.id} data-testid={`card-market-news-${article.id}`}>
                  <div className="market-news-feed__article-meta">
                    <span>{article.publisher}</span>
                    <time dateTime={article.publishedAt ?? undefined}>
                      {formatPublishedAt(article.publishedAt, language)}
                    </time>
                  </div>
                  <h3>{article.title}</h3>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="market-news-feed__read-link"
                    aria-label={`${language === "ar" ? "اقرأ المقال" : "Read article"}: ${article.title}`}
                    data-testid={`link-market-news-${article.id}`}
                  >
                    {language === "ar" ? "اقرأ الخبر" : "Read story"}
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <div className="market-news-feed__state" data-testid="text-market-news-empty">
              <p>{text.noNews}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
