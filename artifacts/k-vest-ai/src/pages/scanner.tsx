import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { getGetMarketScannerQueryKey, useGetMarketScanner, type MarketScannerStock } from '@workspace/api-client-react';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, FileText, RefreshCw, Search, Star } from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  downloadCsv, formatKwd, formatMarketTime, formatPercent, LearningDisclosure, MarketFrame, SourceBadges,
  stockCsvRow, useSavedSymbols,
} from '@/components/market-tools';
import { RatingInfo, RatingPresentation } from '@/components/rating-presentation';
import { InvestmentLoader, InvestmentSkeleton, MarketRowSkeleton } from '@/components/investment-loader';
import { friendlyWarning, readLanguage } from '@/lib/journey';

type ViewMode = 'all' | 'gainers' | 'losers' | 'active';
type SortKey = 'companyName' | 'priceKwd' | 'changePercent' | 'volume' | 'momentumPercent';
const CHART_COLORS = { main: '#10B981', positive: '#4EDEA3', negative: '#FB7185', secondary: '#4CD7F6' };

function formatCompact(value: number | null) {
  return value === null ? 'Unavailable' : new Intl.NumberFormat('en-KW', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function Sparkline({ stock }: { stock: MarketScannerStock }) {
  if (stock.sparkline.length < 2) return <span className="market-no-chart">No history</span>;
  const positive = stock.sparkline[stock.sparkline.length - 1].closeKwd >= stock.sparkline[0].closeKwd;
  return (
    <div className="market-spark">
      <ResponsiveContainer width="100%" height={34} debounce={0}>
        <AreaChart data={stock.sparkline}>
          <Area type="monotone" dataKey="closeKwd" stroke={positive ? CHART_COLORS.positive : CHART_COLORS.negative} fill={positive ? CHART_COLORS.positive : CHART_COLORS.negative} fillOpacity={0.12} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function MarketSkeleton({ isAr }: { isAr: boolean }) {
  return (
    <div className="market-skeleton" data-testid="loading-market-scanner">
      <div className="market-skeleton__content" aria-hidden="true">
        <div className="market-skeleton-hero" />
        <div className="market-skeleton-stats">{[0, 1, 2, 3].map((item) => <i key={item} />)}</div>
        <div className="market-skeleton-table">{Array.from({ length: 11 }, (_, item) => <MarketRowSkeleton key={item} />)}</div>
        <div className="market-skeleton__charts"><i /><i /></div>
      </div>
      <InvestmentLoader size="lg" language={isAr ? 'ar' : 'en'} message="market" className="market-skeleton__loader" />
    </div>
  );
}

export default function ScannerPage() {
  const isAr = readLanguage() === 'ar';
  const query = useGetMarketScanner({
    query: { queryKey: getGetMarketScannerQueryKey(), staleTime: 300_000, refetchOnWindowFocus: false, retry: 0 },
  });
  const { symbols, toggle } = useSavedSymbols();
  const [view, setView] = useState<ViewMode>('all');
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('changePercent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const allStocks = query.data?.stocks ?? [];
  const sectors = useMemo(() => [...new Set(allStocks.map((stock) => stock.sector).filter((value): value is string => Boolean(value)))].sort(), [allStocks]);
  const filtered = useMemo(() => {
    let rows = [...allStocks];
    const needle = search.trim().toLocaleLowerCase();
    if (needle) rows = rows.filter((stock) => `${stock.symbol} ${stock.companyName} ${stock.sector ?? ''}`.toLocaleLowerCase().includes(needle));
    if (sector) rows = rows.filter((stock) => stock.sector === sector);
    if (view === 'gainers') rows = rows.filter((stock) => (stock.changePercent ?? -Infinity) > 0);
    if (view === 'losers') rows = rows.filter((stock) => (stock.changePercent ?? Infinity) < 0);
    if (view === 'active') rows = rows.filter((stock) => stock.volume !== null);
    return rows.sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      const comparison = typeof left === 'string' && typeof right === 'string'
        ? left.localeCompare(right)
        : ((left as number | null) ?? -Infinity) - ((right as number | null) ?? -Infinity);
      return comparison * (sortDirection === 'asc' ? 1 : -1);
    });
  }, [allStocks, search, sector, view, sortKey, sortDirection]);
  const priced = filtered.filter((stock) => stock.priceKwd !== null);
  const changes = filtered.map((stock) => stock.changePercent).filter((value): value is number => value !== null);
  const averageChange = changes.length ? changes.reduce((total, value) => total + value, 0) / changes.length : null;
  const activeVolume = filtered.reduce((total, stock) => total + (stock.volume ?? 0), 0);
  const gainersCount = filtered.filter((stock) => (stock.changePercent ?? 0) > 0).length;
  const chartData = filtered.filter((stock) => stock.changePercent !== null).slice(0, 10).map((stock) => ({
    symbol: stock.symbol,
    changePercent: stock.changePercent,
    name: stock.companyName,
  }));
  const sectorData = [...new Set(filtered.map((stock) => stock.sector).filter((value): value is string => Boolean(value)))].map((name) => {
    const values = filtered.filter((stock) => stock.sector === name).map((stock) => stock.changePercent).filter((value): value is number => value !== null);
    return { sector: name, averageChange: values.length ? values.reduce((total, value) => total + value, 0) / values.length : null, companies: values.length };
  }).filter((row) => row.averageChange !== null);

  function sortBy(key: SortKey) {
    if (sortKey === key) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDirection(key === 'companyName' ? 'asc' : 'desc');
    }
  }

  function selectView(nextView: ViewMode) {
    setView(nextView);
    if (nextView === 'gainers') {
      setSortKey('changePercent');
      setSortDirection('desc');
    } else if (nextView === 'losers') {
      setSortKey('changePercent');
      setSortDirection('asc');
    } else if (nextView === 'active') {
      setSortKey('volume');
      setSortDirection('desc');
    } else {
      setSortKey('changePercent');
      setSortDirection('desc');
    }
  }

  const views: Array<{ key: ViewMode; label: string }> = [
    { key: 'all', label: 'All listings' },
    { key: 'gainers', label: 'Top gainers' },
    { key: 'losers', label: 'Top losers' },
    { key: 'active', label: 'Most active' },
  ];
  const status = query.data?.refreshStatus;
  const hasError = query.isError || query.isRefetchError;

  return (
    <MarketFrame>
      <div className="market-wrap">
        <div className="market-page-head">
          <div>
            <span className="market-eyebrow"><i /> Kuwait market · delayed research</span>
            <h1>Market scanner<span>.</span></h1>
            <p>Explore Oanor-screened Kuwait listings and learn how their recent market data compares.</p>
            <SourceBadges />
            <div className="market-meta">
              <span className={`market-feed-state ${status === 'stale' || hasError ? 'is-stale' : ''}`}>
                {hasError ? 'Refresh issue · showing last available data' : status === 'sample' ? 'Sample data' : status === 'stale' ? 'Stale data' : status === 'unavailable' ? 'Data unavailable' : 'Delayed data'}
              </span>
              <span>{query.data?.lastUpdatedAt ? `Updated ${formatMarketTime(query.data.lastUpdatedAt)}` : 'Waiting for market update'}</span>
            </div>
          </div>
          <div className="market-actions">
            <button type="button" className="market-action-btn" onClick={() => void query.refetch()} disabled={query.isFetching} data-testid="button-refresh-scanner">
              <RefreshCw size={15} className={query.isFetching ? 'market-spinning' : ''} /> {query.isFetching ? 'Refreshing' : 'Refresh'}
            </button>
            <button type="button" className="market-action-btn" onClick={() => window.print()} data-testid="button-export-scanner-pdf">
              <FileText size={15} /> Export PDF
            </button>
            <button type="button" className="market-action-btn market-action-primary" onClick={() => downloadCsv('kuwait-market-scanner.csv', filtered.map(stockCsvRow))} disabled={!filtered.length} data-testid="button-export-scanner-csv">
              <Download size={15} /> CSV
            </button>
          </div>
        </div>

        {query.data?.warning && <div className="market-warning" role="status" data-testid="status-scanner-warning">{friendlyWarning(query.data.warning, isAr ? 'ar' : 'en')}</div>}
        {hasError && <div className="market-warning" role="alert" data-testid="alert-scanner-error">{isAr
          ? query.data ? 'تعذّر تحديث بيانات السوق. قد تكون الأسعار المعروضة متأخرة.' : 'تعذّر تحميل بيانات السوق الآن. يُرجى المحاولة مجددًا.'
          : query.data ? "We couldn't refresh market data. The prices shown may be delayed." : "We couldn't load market data right now. Please try again."}</div>}

        <section className="market-index-panel" aria-label="Premier Market index" data-testid="card-premier-index">
          <div className="market-index-copy">
            <span className="market-index-label">Premier Market index</span>
            <strong>{query.data?.index ? query.data.index.name : query.isLoading ? <InvestmentSkeleton variant="text" label={isAr ? 'جارٍ تحميل المؤشر' : 'Loading index'} /> : 'Index unavailable'}</strong>
            <span className="market-index-symbol">{query.data?.index?.symbol ?? 'Kuwait market benchmark'}</span>
          </div>
          {query.data?.index ? (
            <>
              <div className="market-index-value">{query.data.index.value.toLocaleString('en-KW', { maximumFractionDigits: 3 })}</div>
              <div className={`market-index-change ${(query.data.index.changePercent) >= 0 ? 'positive' : 'negative'}`}>
                <span>{query.data.index.changeAbs > 0 ? '+' : ''}{query.data.index.changeAbs.toLocaleString('en-KW', { maximumFractionDigits: 3 })}</span>
                <b>{formatPercent(query.data.index.changePercent)}</b>
              </div>
              <span className="market-index-time">{formatMarketTime(query.data.index.marketTime)}</span>
            </>
          ) : <span className="market-index-time">{query.isLoading ? <InvestmentSkeleton variant="price" label={isAr ? 'جارٍ تحميل قيمة المؤشر' : 'Loading index value'} /> : 'No index value available'}</span>}
        </section>

        {query.isLoading && !query.data ? <MarketSkeleton isAr={isAr} /> : (
          <>
            <div className="market-stat-grid" aria-live="polite">
              <div className="market-stat"><span>Filtered listings</span><strong>{filtered.length}<small> / {allStocks.length}</small></strong><em>Current view</em></div>
              <div className="market-stat"><span>Average daily move</span><strong className={averageChange === null ? '' : averageChange >= 0 ? 'positive' : 'negative'}>{formatPercent(averageChange)}</strong><em>{changes.length} quotes with a change</em></div>
              <div className="market-stat"><span>Positive movers</span><strong>{gainersCount}<small> / {filtered.length}</small></strong><em>Within current filters</em></div>
              <div className="market-stat"><span>Reported volume</span><strong>{formatCompact(activeVolume)}</strong><em>Across filtered listings</em></div>
            </div>

            <div className="market-view-tabs" role="tablist" aria-label="Scanner views">
              {views.map((item) => <button type="button" key={item.key} role="tab" aria-selected={view === item.key} className={view === item.key ? 'active' : ''} onClick={() => selectView(item.key)} data-testid={`tab-scanner-${item.key}`}>{item.label}</button>)}
              <Link className="market-watchlist-shortcut" href="/watchlist" data-testid="link-open-watchlist"><Star size={14} /> Watchlist <span>{symbols.length}</span></Link>
            </div>

            <div className="market-explorer-grid">
              <aside className="market-filter-panel">
                <div className="market-section-title"><span>Refine listings</span><small>{filtered.length} shown</small></div>
                <label className="market-field">
                  <span>Search company or symbol</span>
                  <span className="market-search-wrap"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="e.g. NBK" data-testid="input-scanner-search" /></span>
                </label>
                <label className="market-field">
                  <span>Sector</span>
                  <select value={sector} onChange={(event) => setSector(event.target.value)} data-testid="select-scanner-sector">
                    <option value="">All sectors</option>
                    {sectors.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </label>
                <button type="button" className="market-reset" onClick={() => { setSearch(''); setSector(''); setView('all'); setSortKey('changePercent'); setSortDirection('desc'); }} data-testid="button-reset-scanner-filters">Reset filters</button>
                <div className="market-learning-note"><span className="market-note-mark">i</span><p>Signals summarize recent data patterns. They do not assess suitability or predict future performance.</p></div>
              </aside>

              <section className="market-table-panel" aria-label="Kuwait stock listings">
                  <div className="market-table-heading">
                   <div><span className="market-eyebrow">Oanor screened listings</span><h2>{view === 'all' ? 'Company overview' : views.find((item) => item.key === view)?.label}</h2><p>Views compare the largest market-cap listings returned by Oanor.</p></div>
                  <span className="market-row-count">{filtered.length} of {allStocks.length} companies</span>
                </div>
                <RatingInfo language={isAr ? 'ar' : 'en'} />
                {query.isError && !query.data ? (
                  <div className="market-error-card" role="alert" data-testid="error-scanner-unavailable">
                    <h3>{isAr ? 'تعذّر تحميل بيانات السوق' : "We couldn't load market data"}</h3>
                    <p>{isAr ? 'يُرجى المحاولة مجددًا بعد قليل.' : 'Please try again in a moment.'}</p>
                    <button type="button" className="market-action-btn" onClick={() => void query.refetch()} disabled={query.isFetching} data-testid="button-retry-scanner">{isAr ? 'حاول مجددًا' : 'Try again'}</button>
                  </div>
                ) : query.data?.refreshStatus === 'unavailable' && !allStocks.length ? (
                  <div className="market-empty" data-testid="empty-scanner-unavailable"><h3>Market data unavailable</h3><p>No replacement prices are shown. Refresh later to check for an update.</p></div>
                ) : filtered.length ? (
                  <div className="market-table-scroll">
                    <table className="market-table">
                      <thead><tr>
                        <th><button onClick={() => sortBy('companyName')} type="button" data-testid="sort-scanner-company">Company <SortIcon active={sortKey === 'companyName'} direction={sortDirection} /></button></th>
                        <th><button onClick={() => sortBy('priceKwd')} type="button" data-testid="sort-scanner-price">Price <SortIcon active={sortKey === 'priceKwd'} direction={sortDirection} /></button></th>
                        <th><button onClick={() => sortBy('changePercent')} type="button" data-testid="sort-scanner-change">Daily change <SortIcon active={sortKey === 'changePercent'} direction={sortDirection} /></button></th>
                        <th>1 month</th>
                        <th><button onClick={() => sortBy('volume')} type="button" data-testid="sort-scanner-volume">Volume <SortIcon active={sortKey === 'volume'} direction={sortDirection} /></button></th>
                        <th><button onClick={() => sortBy('momentumPercent')} type="button" data-testid="sort-scanner-momentum">Learning signal <SortIcon active={sortKey === 'momentumPercent'} direction={sortDirection} /></button></th>
                        <th aria-label="Watchlist" />
                      </tr></thead>
                      <tbody>
                        {filtered.map((stock) => (
                          <tr key={stock.symbol} data-testid={`row-market-stock-${stock.symbol}`}>
                            <td className="market-company-cell">
                              <Link href={`/stocks/${encodeURIComponent(stock.symbol)}`} className="market-company-link" data-testid={`link-stock-${stock.symbol}`}>
                                <span className="market-symbol">{stock.symbol}</span><span className="market-company-name">{stock.companyName}</span><span className="market-sector">{stock.sector ?? 'Sector unavailable'}</span>
                              </Link>
                              {(stock.stale || stock.sample) && <span className={`market-row-flag ${stock.sample ? 'sample' : ''}`}>{stock.sample ? 'Sample' : 'Stale'}</span>}
                            </td>
                            <td className="market-number">{formatKwd(stock.priceKwd)}</td>
                            <td className={`market-change ${stock.changePercent === null ? '' : stock.changePercent >= 0 ? 'positive' : 'negative'}`}>
                              <strong>{stock.changeKwd === null ? 'Unavailable' : `${stock.changeKwd > 0 ? '+' : ''}${stock.changeKwd.toFixed(3)} KWD`}</strong><span>{formatPercent(stock.changePercent)}</span>
                            </td>
                            <td><Link className="market-spark-link" href={`/stocks/${encodeURIComponent(stock.symbol)}`} aria-label={`View ${stock.companyName} one-month chart`}><Sparkline stock={stock} /></Link></td>
                            <td className="market-number">{formatCompact(stock.volume)}</td>
                            <td><RatingPresentation rating={stock.rating} language={isAr ? 'ar' : 'en'} /></td>
                            <td><button type="button" className={`market-star ${symbols.includes(stock.symbol) ? 'saved' : ''}`} onClick={() => toggle(stock.symbol)} aria-label={`${symbols.includes(stock.symbol) ? 'Remove' : 'Add'} ${stock.companyName} ${symbols.includes(stock.symbol) ? 'from' : 'to'} watchlist`} aria-pressed={symbols.includes(stock.symbol)} data-testid={`button-watchlist-${stock.symbol}`}><Star size={17} fill={symbols.includes(stock.symbol) ? 'currentColor' : 'none'} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="market-empty" data-testid="empty-scanner-filter"><h3>No listings match these filters</h3><p>Try another company name, symbol, sector, or scanner view.</p><button type="button" onClick={() => { setSearch(''); setSector(''); setView('all'); }} className="market-reset">Clear filters</button></div>
                )}
                <div className="market-table-foot"><span>Market time is supplied by the data source. Blank or unavailable values are not estimated.</span><span>{priced.length} listed prices available</span></div>
              </section>
            </div>

            <section className="market-chart-grid">
              <article className="market-chart-panel">
                <div className="market-chart-head"><div><span className="market-eyebrow">Filtered view</span><h2>Daily percentage move</h2><p>Largest movers in the current results.</p></div><button type="button" className="market-chart-export" disabled={!chartData.length} onClick={() => downloadCsv('scanner-daily-percentage-move.csv', chartData)} aria-label="Export daily percentage move chart data as CSV" data-testid="button-export-movers-csv"><Download size={14} /> CSV</button></div>
                {chartData.length ? <div className="market-chart"><ResponsiveContainer width="100%" height={240} debounce={0}><BarChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}><CartesianGrid stroke="rgba(89,65,57,.45)" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="symbol" tick={{ fontSize: 10, fill: '#c9b8b3' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: '#929db7' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} /><Tooltip isAnimationActive={false} cursor={{ fill: 'rgba(255,255,255,.04)', stroke: 'none' }} contentStyle={{ background: '#161b2d', border: '1px solid rgba(89,65,57,.7)', borderRadius: 8, color: '#dde1fb' }} formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Daily change']} labelFormatter={(label) => chartData.find((row) => row.symbol === label)?.name ?? label} /><Bar dataKey="changePercent" isAnimationActive={false} radius={[4, 4, 0, 0]}>{chartData.map((entry) => <Cell key={entry.symbol} fill={(entry.changePercent ?? 0) >= 0 ? CHART_COLORS.positive : CHART_COLORS.negative} />)}</Bar></BarChart></ResponsiveContainer></div> : <div className="market-chart-empty">No percentage changes are available for this filtered view.</div>}
              </article>
              <article className="market-chart-panel">
                <div className="market-chart-head"><div><span className="market-eyebrow">Filtered view</span><h2>Average move by sector</h2><p>Mean daily change for available sector quotes.</p></div><button type="button" className="market-chart-export" disabled={!sectorData.length} onClick={() => downloadCsv('scanner-average-move-by-sector.csv', sectorData)} aria-label="Export sector chart data as CSV" data-testid="button-export-sector-csv"><Download size={14} /> CSV</button></div>
                {sectorData.length ? <div className="market-chart"><ResponsiveContainer width="100%" height={240} debounce={0}><AreaChart data={sectorData} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}><defs><linearGradient id="sectorMoveFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART_COLORS.secondary} stopOpacity={0.28} /><stop offset="100%" stopColor={CHART_COLORS.secondary} stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="rgba(89,65,57,.45)" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="sector" tick={{ fontSize: 9, fill: '#c9b8b3' }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={52} /><YAxis tick={{ fontSize: 10, fill: '#929db7' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} /><Tooltip isAnimationActive={false} cursor={{ fill: 'rgba(255,255,255,.04)', stroke: 'none' }} contentStyle={{ background: '#161b2d', border: '1px solid rgba(89,65,57,.7)', borderRadius: 8, color: '#dde1fb' }} formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Average daily change']} /><Area type="monotone" dataKey="averageChange" name="Average daily change" stroke={CHART_COLORS.secondary} fill="url(#sectorMoveFill)" strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.secondary }} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div> : <div className="market-chart-empty">Sector changes are unavailable for the current filters.</div>}
              </article>
            </section>
          </>
        )}
        <LearningDisclosure />
      </div>
    </MarketFrame>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown size={12} />;
  return direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
}
