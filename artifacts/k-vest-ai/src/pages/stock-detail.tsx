import { useMemo } from 'react';
import { Link, useParams } from 'wouter';
import { getGetMarketScannerQueryKey, getGetMarketStockQueryKey, useGetMarketScanner, useGetMarketStock } from '@workspace/api-client-react';
import { ArrowLeft, Download, FileText, RefreshCw, Star } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  downloadCsv, formatKwd, formatMarketTime, formatPercent, LearningDisclosure, MarketFrame, SourceBadges,
  useSavedSymbols,
} from '@/components/market-tools';

const CHART_COLOR = '#10B981';

function formatHistoryDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-KW', {
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kuwait',
    }).format(date);
}

export default function StockDetailPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = decodeURIComponent(params.symbol ?? '').trim();
  const query = useGetMarketStock(symbol, {
    query: { enabled: Boolean(symbol), queryKey: getGetMarketStockQueryKey(symbol), staleTime: 300_000, refetchOnWindowFocus: false, retry: 0 },
  });
  const marketQuery = useGetMarketScanner({
    query: { queryKey: getGetMarketScannerQueryKey(), staleTime: 300_000, refetchOnWindowFocus: false, retry: 0 },
  });
  const { symbols, toggle } = useSavedSymbols();
  const stock = query.data?.stock;
  const history = useMemo(() => stock?.sparkline ?? [], [stock?.sparkline]);
  const start = history[0]?.closeKwd ?? null;
  const latest = history[history.length - 1]?.closeKwd ?? null;
  const oneMonthChange = start !== null && latest !== null && start !== 0 ? ((latest - start) / start) * 100 : null;
  const status = query.data?.refreshStatus;
  const isError = query.isError || query.isRefetchError;

  return (
    <MarketFrame>
      <div className="market-wrap market-detail-wrap">
        <div className="market-detail-backline"><Link href="/scanner" className="market-back-link" data-testid="link-back-scanner"><ArrowLeft size={15} /> Back to scanner</Link><Link href="/watchlist" className="market-back-link" data-testid="link-detail-watchlist">Watchlist</Link></div>
        {query.isLoading && !query.data ? (
          <div className="market-detail-loading" role="status" data-testid="loading-stock-detail"><i /><i /><i /></div>
        ) : isError && !query.data ? (
          <div className="market-error-card" role="alert" data-testid="alert-stock-error"><h1>Stock details unavailable</h1><p>We could not load this listing right now. No replacement values are displayed.</p><button type="button" className="market-action-btn" onClick={() => void query.refetch()} disabled={query.isFetching} data-testid="button-retry-stock"><span>Try again</span></button></div>
        ) : !stock ? (
          <div className="market-empty market-detail-empty" data-testid="empty-stock-detail"><h1>Listing not found</h1><p>This symbol is not available in the current Kuwait scanner list.</p><Link href="/scanner" className="market-action-btn">Return to scanner</Link></div>
        ) : (
          <>
            <div className="market-page-head market-detail-head">
              <div>
                <span className="market-eyebrow"><i /> Kuwait listed company · delayed research</span>
                <h1>{stock.companyName}<span>.</span></h1>
                <div className="market-detail-sub"><strong>{stock.symbol}</strong><span>{stock.sector ?? 'Sector unavailable'}</span>
                  {(stock.stale || stock.sample || status === 'stale' || status === 'sample') && <span className={`market-row-flag ${stock.sample || status === 'sample' ? 'sample' : ''}`}>{stock.sample || status === 'sample' ? 'Sample data' : 'Stale data'}</span>}
                </div>
                <p>One-month view of available delayed market data. Historical movement describes the period shown; it is not a forecast.</p>
                <SourceBadges />
              </div>
              <div className="market-actions">
                <button type="button" className="market-action-btn" onClick={() => void query.refetch()} disabled={query.isFetching} data-testid="button-refresh-stock"><RefreshCw size={15} className={query.isFetching ? 'market-spinning' : ''} /> {query.isFetching ? 'Refreshing' : 'Refresh'}</button>
                <button type="button" className={`market-action-btn ${symbols.includes(stock.symbol) ? 'is-saved' : ''}`} onClick={() => toggle(stock.symbol)} aria-pressed={symbols.includes(stock.symbol)} data-testid="button-toggle-detail-watchlist"><Star size={15} fill={symbols.includes(stock.symbol) ? 'currentColor' : 'none'} /> {symbols.includes(stock.symbol) ? 'Saved' : 'Save stock'}</button>
                <button type="button" className="market-action-btn" onClick={() => window.print()} data-testid="button-export-stock-pdf"><FileText size={15} /> Export PDF</button>
              </div>
            </div>
            {query.data?.warning && <div className="market-warning" role="status" data-testid="status-stock-warning">{query.data.warning}</div>}
            {isError && <div className="market-warning" role="alert" data-testid="alert-stock-refresh">Refresh failed. Showing the last available values, which may be stale.</div>}
            <div className="market-detail-quote">
              <div><span>{stock.sample ? 'Published sample price' : 'Latest available price'}</span><strong>{formatKwd(stock.priceKwd)}</strong><small>{formatMarketTime(stock.marketTime)}</small></div>
              <div className={stock.changePercent === null ? '' : stock.changePercent >= 0 ? 'positive' : 'negative'}><span>Daily change</span><strong>{stock.changeKwd === null ? 'Unavailable' : `${stock.changeKwd > 0 ? '+' : ''}${stock.changeKwd.toFixed(3)} KWD`}</strong><small>{formatPercent(stock.changePercent)}</small></div>
              <div><span>1-month history</span><strong>{history.length ? `${history.length} data points` : 'Unavailable'}</strong><small>{oneMonthChange === null ? 'Change unavailable' : `${formatPercent(oneMonthChange)} across available history`}</small></div>
              <div><span>Learning signal</span><strong><span className={`market-rating rating-${stock.rating.toLowerCase()}`}>{stock.rating}</span></strong><small>Educational signal only</small></div>
            </div>
            <section className="market-detail-chart-panel">
              <div className="market-chart-head">
                <div><span className="market-eyebrow">Yahoo Finance · one month</span><h2>Closing price history</h2><p>Historical closes, in KWD. Dates and values reflect the source data provided.</p></div>
                <button type="button" className="market-chart-export" disabled={!history.length} onClick={() => downloadCsv(`${stock.symbol.toLowerCase()}-one-month-history.csv`, history.map((point) => ({ Date: point.date, 'Close (KWD)': point.closeKwd })))} aria-label="Export stock history chart data as CSV" data-testid="button-export-stock-chart-csv"><Download size={14} /> CSV</button>
              </div>
              {history.length ? (
                <div className="market-detail-chart">
                  <ResponsiveContainer width="100%" height={330} debounce={0}>
                    <AreaChart data={history} margin={{ top: 12, right: 18, bottom: 4, left: -8 }}>
                      <defs><linearGradient id="stockHistoryFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART_COLOR} stopOpacity={0.3} /><stop offset="100%" stopColor={CHART_COLOR} stopOpacity={0.015} /></linearGradient></defs>
                      <CartesianGrid stroke="rgba(89,65,57,.45)" strokeDasharray="3 5" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#c9b8b3' }} axisLine={false} tickLine={false} minTickGap={24} tickFormatter={formatHistoryDate} />
                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#929db7' }} axisLine={false} tickLine={false} tickFormatter={(value: number) => Number(value).toFixed(3)} />
                      <Tooltip isAnimationActive={false} cursor={{ stroke: '#929db7', strokeDasharray: '3 3' }} contentStyle={{ background: '#161b2d', border: '1px solid rgba(89,65,57,.7)', borderRadius: 8, color: '#dde1fb' }} labelStyle={{ color: '#c9b8b3' }} formatter={(value) => [`${Number(value).toFixed(3)} KWD`, 'Closing price']} />
                      <Area type="monotone" dataKey="closeKwd" name="Closing price" stroke={CHART_COLOR} fill="url(#stockHistoryFill)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: CHART_COLOR, stroke: '#161b2d', strokeWidth: 2 }} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="market-chart-empty market-history-empty">One-month history is not available for this listing. No estimated values are shown.</div>}
            </section>
            <div className="market-detail-footnote">
              <div><span className="market-note-mark">i</span><p><strong>How to read this:</strong> the learning signal is a simplified description of recent momentum, not a valuation or recommendation. Delayed data can differ from live market prices.</p></div>
              {marketQuery.data?.index && <small>Premier Market index: {marketQuery.data.index.name} · {marketQuery.data.index.value.toLocaleString('en-KW', { maximumFractionDigits: 3 })}</small>}
            </div>
          </>
        )}
        <LearningDisclosure />
      </div>
    </MarketFrame>
  );
}
