import { useMemo } from 'react';
import { Link } from 'wouter';
import { getGetMarketScannerQueryKey, useGetMarketScanner } from '@workspace/api-client-react';
import { ArrowRight, Download, FileText, RefreshCw, Star, Trash2 } from 'lucide-react';
import {
  downloadCsv, formatKwd, formatMarketTime, formatPercent, LearningDisclosure, MarketFrame, SourceBadges,
  stockCsvRow, useSavedSymbols,
} from '@/components/market-tools';
import { RatingInfo, RatingPresentation } from '@/components/rating-presentation';
import { friendlyWarning, readLanguage } from '@/lib/journey';

export default function WatchlistPage() {
  const isAr = readLanguage() === 'ar';
  const query = useGetMarketScanner({
    query: { queryKey: getGetMarketScannerQueryKey(), staleTime: 300_000, refetchOnWindowFocus: false, retry: 0 },
  });
  const { symbols, remove } = useSavedSymbols();
  const savedStocks = useMemo(
    () => (query.data?.stocks ?? []).filter((stock) => symbols.includes(stock.symbol)),
    [query.data?.stocks, symbols],
  );
  const hasError = query.isError || query.isRefetchError;

  return (
    <MarketFrame>
      <div className="market-wrap">
        <div className="market-page-head">
          <div>
            <span className="market-eyebrow"><i /> Your research list</span>
            <h1>Watchlist<span>.</span></h1>
            <p>A local list of Kuwait companies you want to revisit while learning about the market.</p>
            <SourceBadges />
            <div className="market-meta"><span>{query.data?.lastUpdatedAt ? `Data updated ${formatMarketTime(query.data.lastUpdatedAt)}` : 'Delayed market data'}</span><span>Saved on this device only</span></div>
          </div>
          <div className="market-actions">
            <button type="button" className="market-action-btn" onClick={() => void query.refetch()} disabled={query.isFetching} data-testid="button-refresh-watchlist"><RefreshCw size={15} className={query.isFetching ? 'market-spinning' : ''} /> Refresh</button>
            <button type="button" className="market-action-btn" onClick={() => window.print()} data-testid="button-export-watchlist-pdf"><FileText size={15} /> Export PDF</button>
            <button type="button" className="market-action-btn market-action-primary" disabled={!savedStocks.length} onClick={() => downloadCsv('k-vest-watchlist.csv', savedStocks.map(stockCsvRow))} data-testid="button-export-watchlist-csv"><Download size={15} /> CSV</button>
          </div>
        </div>
        {query.data?.warning && <div className="market-warning" role="status" data-testid="status-watchlist-warning">{friendlyWarning(query.data.warning, isAr ? 'ar' : 'en')}</div>}
        {hasError && <div className="market-warning" role="alert" data-testid="alert-watchlist-error">{isAr ? 'تعذّر تحديث بيانات السوق. قد تكون الأسعار السابقة متأخرة.' : "We couldn't refresh market data. Previously available prices may be delayed."}</div>}
        {query.isLoading && !query.data ? (
          <div className="market-detail-loading" role="status" aria-label="Loading watchlist"><i /><i /><i /></div>
        ) : query.isError && !query.data ? (
          <div className="market-error-card" role="alert" data-testid="error-watchlist-unavailable">
            <h2>{isAr ? 'تعذّر تحميل بيانات السوق' : "We couldn't load market data"}</h2>
            <p>{isAr ? 'قائمتك المحفوظة باقية في هذا المتصفح. حاول مجددًا بعد قليل.' : 'Your saved list is still in this browser. Please try again in a moment.'}</p>
            <button type="button" className="market-action-btn" onClick={() => void query.refetch()} disabled={query.isFetching} data-testid="button-retry-watchlist">{isAr ? 'حاول مجددًا' : 'Try again'}</button>
          </div>
        ) : !symbols.length ? (
          <section className="market-watch-empty" data-testid="empty-watchlist">
            <div className="market-empty-mark"><Star size={24} /></div>
            <span className="market-eyebrow">Start a learning list</span>
            <h2>No companies saved yet</h2>
            <p>Use the star beside any scanner listing to keep it here. Your choices stay in this browser.</p>
            <Link href="/scanner" className="market-action-btn market-action-primary" data-testid="link-empty-watchlist-scanner">Explore the scanner <ArrowRight size={15} /></Link>
          </section>
        ) : (
          <section className="market-watchlist-panel">
            <div className="market-table-heading">
              <div><span className="market-eyebrow">Saved on this device</span><h2>{symbols.length} {symbols.length === 1 ? 'company' : 'companies'}</h2><p>Quote values are delayed and may be stale or unavailable.</p></div>
              <Link href="/scanner" className="market-inline-link" data-testid="link-watchlist-scanner">Browse scanner <ArrowRight size={14} /></Link>
            </div>
            <RatingInfo language={isAr ? 'ar' : 'en'} />
            {savedStocks.length ? (
              <div className="market-watch-list">
                {savedStocks.map((stock) => (
                  <article className="market-watch-row" key={stock.symbol} data-testid={`card-watchlist-${stock.symbol}`}>
                    <Link href={`/stocks/${encodeURIComponent(stock.symbol)}`} className="market-watch-company" data-testid={`link-watch-stock-${stock.symbol}`}>
                      <span className="market-symbol">{stock.symbol}</span><strong>{stock.companyName}</strong><span>{stock.sector ?? 'Sector unavailable'}</span>
                    </Link>
                    <div className="market-watch-value"><span>Price</span><strong>{formatKwd(stock.priceKwd)}</strong></div>
                    <div className={`market-watch-value ${stock.changePercent === null ? '' : stock.changePercent >= 0 ? 'positive' : 'negative'}`}><span>Daily change</span><strong>{formatPercent(stock.changePercent)}</strong></div>
                    <div className="market-watch-signal"><RatingPresentation rating={stock.rating} language={isAr ? 'ar' : 'en'} />{(stock.stale || stock.sample) && <small>{stock.sample ? 'Sample data' : 'Stale data'}</small>}</div>
                    <div className="market-watch-controls"><Link href={`/stocks/${encodeURIComponent(stock.symbol)}`} className="market-watch-open" data-testid={`link-watch-detail-${stock.symbol}`}>Details <ArrowRight size={14} /></Link><button type="button" onClick={() => remove(stock.symbol)} className="market-star market-remove" aria-label={`Remove ${stock.companyName} from watchlist`} data-testid={`button-remove-watchlist-${stock.symbol}`}><Trash2 size={16} /></button></div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="market-empty" data-testid="empty-watchlist-unavailable"><h3>Saved symbols are not in the current scanner list</h3><p>Your local saved list remains intact. These companies are not available in the current market response.</p></div>
            )}
          </section>
        )}
        <LearningDisclosure />
      </div>
    </MarketFrame>
  );
}
