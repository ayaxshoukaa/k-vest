import { useMemo, useState } from 'react';
import { ArrowRight, RefreshCw, Search, Sparkles, Star } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  getGetMarketStockQueryKey,
  getGetMarketScannerQueryKey,
  useGetMarketScanner,
  useGetMarketStock,
  useSaveJourneyWatchlist,
  type MarketScannerStock,
} from '@workspace/api-client-react';
import { DataWarning, JourneyShell, Sparkline, type JourneyCtx } from '@/components/journey/shell';
import { CompanyLogo } from '@/components/company-logo';
import { InvestmentArrows, InvestmentLoader, LearningStockRowSkeleton } from '@/components/investment-loader';
import { RatingInfo, RatingPresentation } from '@/components/rating-presentation';
import { errMsg, fmtKwd, fmtPct, fmtTime } from '@/lib/journey';

type Tab = 'all' | 'gainers' | 'losers' | 'active';

function StockRow({ s, selected, active, onStar, onOpen, ctx }: {
  s: MarketScannerStock; selected: boolean; active: boolean; onStar: () => void; onOpen: () => void; ctx: JourneyCtx;
}) {
  const { tr } = ctx;
  const language = ctx.isAr ? 'ar' : 'en';
  const na = tr('Unavailable', 'غير متاح');
  return (
    <li className={`jx-row${active ? ' is-active' : ''}`} data-testid={`row-stock-${s.symbol}`}>
      <button type="button" className="jx-star" aria-pressed={selected} onClick={onStar}
        aria-label={`${selected ? tr('Remove', 'إزالة') : tr('Add', 'إضافة')} ${s.companyName}`} data-testid={`button-star-${s.symbol}`}>
        <Star size={20} aria-hidden="true" />
      </button>
      <button type="button" className="jx-row__main" onClick={onOpen} aria-expanded={active} aria-controls="journey-company-details" data-testid={`button-open-${s.symbol}`}>
        <div className="jx-row__company-brand">
          <CompanyLogo key={s.symbol} symbol={s.symbol} companyName={s.companyName} />
          <strong>{s.companyName}</strong>
        </div>
        <div className="jx-row__meta">
          <span>{s.symbol}{s.sample ? ` · ${tr('Sample', 'تجريبي')}` : ''}</span>
        </div>
        <RatingPresentation rating={s.rating} language={language} />
      </button>
      <Sparkline points={s.sparkline} />
      <div className="jx-price">
        <b>{fmtKwd(s.priceKwd, na)}</b>
        <span className={(s.changePercent ?? 0) >= 0 ? 'is-pos' : 'is-neg'}>{fmtPct(s.changePercent, na)}</span>
      </div>
    </li>
  );
}

function Detail({ symbol, ctx }: { symbol: string; ctx: JourneyCtx }) {
  const { tr, isAr } = ctx;
  const language = ctx.isAr ? 'ar' : 'en';
  const q = useGetMarketStock(symbol, { query: { queryKey: getGetMarketStockQueryKey(symbol), retry: false } });
  const na = tr('Unavailable', 'غير متاح');
  const historyData = useMemo(() => {
    const dateFormatter = new Intl.DateTimeFormat(isAr ? 'ar-KW' : 'en-KW', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Kuwait',
    });
    return (q.data?.stock.sparkline ?? [])
      .filter((point) => Number.isFinite(Date.parse(point.date)) && Number.isFinite(point.closeKwd) && point.closeKwd > 0)
      .map((point) => {
        const date = new Date(point.date);
        return { time: date.getTime(), label: dateFormatter.format(date), price: point.closeKwd };
      })
      .sort((a, b) => a.time - b.time);
  }, [isAr, q.data?.stock.sparkline]);
  const trendColor = historyData.length > 1 && historyData[historyData.length - 1].price >= historyData[0].price
    ? '#45DFA4'
    : '#4CD7F6';
  if (q.isLoading) {
    return (
      <div className="jx-card jx-detail-loading" aria-busy="true" data-testid={`status-company-loading-${symbol}`}>
        <div className="jx-detail-loading__placeholders" aria-hidden="true">
          <i className="is-heading" /><i className="is-price" /><i className="is-chart" /><i className="is-copy" />
        </div>
        <InvestmentLoader size="md" language={isAr ? 'ar' : 'en'} message="company" className="jx-detail-loading__loader" />
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="jx-card" role="alert" data-testid="status-detail-error">
        <p className="jx-field-error">{errMsg(q.error, tr('Could not load this company.', 'تعذّر تحميل هذه الشركة.'))}</p>
        <button type="button" className="jx-btn jx-btn--ghost jx-btn--sm" onClick={() => void q.refetch()} data-testid="button-retry-detail">
          <RefreshCw size={14} aria-hidden="true" /> {tr('Try again', 'حاول مجددًا')}
        </button>
      </div>
    );
  }
  const { stock, warning, refreshStatus, lastUpdatedAt } = q.data;
  const time = fmtTime(stock.marketTime ?? lastUpdatedAt);
  return (
    <div className="jx-card" data-testid={`panel-detail-${symbol}`}>
      <DataWarning
        sample={stock.sample || refreshStatus === 'sample'}
        stale={stock.stale || refreshStatus === 'stale'}
        warning={warning}
        tr={tr}
        onRetry={() => void q.refetch()}
        retrying={q.isFetching}
      />
      <div className="jx-detail-company-heading">
        <CompanyLogo key={stock.symbol} symbol={stock.symbol} companyName={stock.companyName} />
        <div>
          <h2>{stock.companyName}</h2>
          <p className="jx-muted">{stock.symbol}{stock.sector ? ` · ${stock.sector}` : ''}</p>
        </div>
      </div>
      <p className="jx-result-big" style={{ marginTop: 10 }} data-testid="text-detail-price">{fmtKwd(stock.priceKwd, na)}</p>
      <section className="jx-detail-chart" aria-labelledby="company-price-chart-title" aria-describedby="company-price-chart-caption">
        <h3 id="company-price-chart-title">{tr('Price over the last 30 days', 'السعر خلال آخر 30 يومًا')}</h3>
        <p id="company-price-chart-caption" className="jx-muted">
          {tr('This chart shows how the price changed over the last 30 days.', 'يوضح هذا الرسم كيف تغيّر السعر خلال آخر 30 يومًا.')}
        </p>
        {historyData.length > 1 ? (
          <div className="jx-detail-chart__plot" data-testid="chart-company-month-price">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
                <XAxis
                  dataKey="label"
                  reversed={isAr}
                  tick={{ fill: '#BBCABF', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                  interval="preserveStartEnd"
                />
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Tooltip
                  cursor={{ stroke: 'rgba(76,215,246,.25)' }}
                  contentStyle={{ background: '#090D16', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10 }}
                  labelStyle={{ color: '#BBCABF' }}
                  itemStyle={{ color: '#E1E2E9' }}
                  labelFormatter={(label) => String(label)}
                  formatter={(value) => [fmtKwd(Number(value), na), tr('Price', 'السعر')]}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={trendColor}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: trendColor, stroke: '#090D16', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="jx-muted" role="status">{tr('Price history is temporarily unavailable.', 'التاريخ السعري غير متاح مؤقتًا.')}</p>
        )}
      </section>
      <dl className="jx-kv">
        <div><dt>{tr('Change', 'التغيّر')}</dt><dd>{fmtKwd(stock.changeKwd, na)} ({fmtPct(stock.changePercent, na)})</dd></div>
        <div><dt>{tr('Volume', 'حجم التداول')}</dt><dd>{stock.volume === null ? na : stock.volume.toLocaleString('en-US')}</dd></div>
        <div><dt>{tr('Momentum', 'الزخم')}</dt><dd>{fmtPct(stock.momentumPercent, na)}</dd></div>
        <div><dt>{tr('Rating', 'التقييم')}</dt><dd><RatingPresentation rating={stock.rating} language={language} /></dd></div>
      </dl>
      {time && <p className="jx-muted" style={{ marginTop: 10 }}>{tr('Quote time', 'وقت السعر')}: {time}</p>}
    </div>
  );
}

function ScanBody({ ctx }: { ctx: JourneyCtx }) {
  const { tr, state } = ctx;
  const scanner = useGetMarketScanner({ query: { queryKey: getGetMarketScannerQueryKey(), retry: false } });
  const save = useSaveJourneyWatchlist();
  const [selected, setSelected] = useState<string[]>(state.watchlistSymbols);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const stocks = scanner.data?.stocks;
  const visible = useMemo(() => {
    let list = [...(stocks ?? [])];
    const term = search.trim().toLowerCase();
    if (term) list = list.filter((s) => s.companyName.toLowerCase().includes(term) || s.symbol.toLowerCase().includes(term));
    if (tab === 'gainers') list = list.filter((s) => (s.changePercent ?? 0) > 0).sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
    if (tab === 'losers') list = list.filter((s) => (s.changePercent ?? 0) < 0).sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0));
    if (tab === 'active') list = list.filter((s) => s.volume !== null).sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    return list;
  }, [stocks, tab, search]);
  const changeChartData = useMemo(() => visible
    .filter((stock): stock is MarketScannerStock & { changePercent: number } => stock.changePercent !== null)
    .sort((a, b) => b.changePercent - a.changePercent)
    .map((stock) => ({
      symbol: stock.symbol,
      companyName: stock.companyName,
      changePercent: stock.changePercent,
    })), [visible]);

  const toggle = (symbol: string) => {
    const next = selected.includes(symbol) ? selected.filter((x) => x !== symbol) : [...selected, symbol];
    setSelected(next);
    if (next.length === 0) {
      setSaveError(null);
      save.mutateAsync({ data: { symbols: [] } }).then(ctx.setState).catch((e: unknown) => {
        setSaveError(errMsg(e, tr('Could not save your selection.', 'تعذّر حفظ اختيارك.')));
      });
    }
  };

  const saveAndGo = async (symbols: string[]) => {
    setSaveError(null);
    try {
      const res = await save.mutateAsync({ data: { symbols } });
      ctx.setState(res);
      await ctx.advance('scan', 'research-intro');
    } catch (e) {
      setSaveError(errMsg(e, tr('Could not save your selection.', 'تعذّر حفظ اختيارك.')));
    }
  };

  const pickForMe = () => {
    const picks = [...(stocks ?? [])]
      .filter((s) => s.priceKwd !== null && s.rating !== 'Unavailable')
      .sort((a, b) => (b.momentumPercent ?? -Infinity) - (a.momentumPercent ?? -Infinity))
      .slice(0, 3)
      .map((s) => s.symbol);
    const fallback = picks.length ? picks : (stocks ?? []).slice(0, 3).map((s) => s.symbol);
    if (!fallback.length) return;
    setSelected(fallback);
    void saveAndGo(fallback);
  };

  const tabs: [Tab, string][] = [
    ['all', tr('Premier Market', 'السوق الأول')],
    ['gainers', tr('Top gainers', 'الأكثر ارتفاعًا')],
    ['losers', tr('Top losers', 'الأكثر انخفاضًا')],
    ['active', tr('Most active', 'الأكثر تداولًا')],
  ];
  const busy = save.isPending || ctx.advancing;

  return (
    <>
      <div className="jx-page-head">
        <span className="jx-eyebrow">{tr('Phase 1 of 4', 'المرحلة 1 من 4')}</span>
        <h1>{tr('Scan the Kuwait market', 'استكشف سوق الكويت')}</h1>
        <p className="jx-muted">{tr('Star the companies you want to learn about. Open a name for details.', 'ضع نجمة على الشركات التي تريد التعرف عليها. افتح أي اسم لرؤية التفاصيل.')}</p>
      </div>
      {scanner.data && <DataWarning
        sample={scanner.data.refreshStatus === 'sample' || (stocks ?? []).some((s) => s.sample)}
        stale={scanner.data.refreshStatus === 'stale'}
        warning={scanner.data.warning}
        tr={tr}
        onRetry={() => void scanner.refetch()}
        retrying={scanner.isFetching}
      />}

      <section className="jx-card jx-change-chart" aria-labelledby="scan-change-heading" data-testid="chart-kuwait-stock-changes">
        <div>
          <h2 id="scan-change-heading">{tr('Kuwait stock changes', 'تغيّرات الأسهم الكويتية')}</h2>
          <p id="scan-change-caption" className="jx-muted">
            {tr('Daily percentage change for stocks in this view. Emerald shows a gain; coral shows a decline. Quotes may be delayed.', 'التغيّر اليومي بالنسبة المئوية للأسهم في هذا العرض. الأخضر للارتفاع والمرجاني للانخفاض. قد تتأخر الأسعار.')}
          </p>
        </div>
        {changeChartData.length > 0 ? (
          <div className="jx-change-chart__plot" role="img" aria-labelledby="scan-change-heading" aria-describedby="scan-change-caption">
            <ResponsiveContainer width="100%" height={Math.max(240, changeChartData.length * 34 + 48)}>
              <BarChart data={changeChartData} layout="vertical" margin={{ top: 8, right: 18, bottom: 8, left: 4 }}>
                <CartesianGrid stroke="rgba(255,255,255,.08)" strokeDasharray="3 3" vertical />
                <XAxis
                  type="number"
                  tickFormatter={(value: number) => `${Number(value).toFixed(1)}%`}
                  tick={{ fill: '#BBCABF', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="symbol"
                  width={72}
                  tick={{ fill: '#E1E2E9', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ReferenceLine x={0} stroke="#4CD7F6" strokeDasharray="4 4" />
                <Tooltip
                  contentStyle={{ background: '#090D16', border: '1px solid rgba(255,255,255,.14)', borderRadius: 10, color: '#E1E2E9' }}
                  labelFormatter={(label) => {
                    const point = changeChartData.find((item) => item.symbol === String(label));
                    return point ? `${point.companyName} (${point.symbol})` : String(label);
                  }}
                  formatter={(value) => [`${Number(value).toFixed(2)}%`, tr('Daily change', 'التغيّر اليومي')]}
                />
                <Bar dataKey="changePercent" name={tr('Daily change', 'التغيّر اليومي')} radius={4} barSize={18} isAnimationActive={false}>
                  {changeChartData.map((point) => (
                    <Cell key={point.symbol} fill={point.changePercent >= 0 ? '#10B981' : '#FB7185'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="jx-muted" role="status" data-testid="status-no-chart-data">
            {tr('Verified daily price changes are not available for this view yet.', 'لا تتوفر تغيّرات يومية موثوقة لهذا العرض حاليًا.')}
          </p>
        )}
      </section>

      <div className="jx-grid jx-grid--2">
        <section aria-label={tr('Companies', 'الشركات')}>
          <label className="jx-label">
            <span className="jx-sr">{tr('Search companies', 'ابحث عن شركة')}</span>
            <span style={{ position: 'relative', display: 'block' }}>
              <Search size={16} aria-hidden="true" style={{ position: 'absolute', insetInlineStart: 14, top: 15, color: '#52647d' }} />
              <input className="jx-input" style={{ paddingInlineStart: 38 }} type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={tr('Search by name or symbol', 'ابحث بالاسم أو الرمز')} data-testid="input-scan-search" />
            </span>
          </label>
          <div className="jx-tabs" role="group" aria-label={tr('Filter', 'تصفية')}>
            {tabs.map(([k, label]) => (
              <button key={k} type="button" className="jx-tab" aria-pressed={tab === k} onClick={() => setTab(k)} data-testid={`button-tab-${k}`}>{label}</button>
            ))}
          </div>
          {scanner.isLoading && (
            <div className="jx-scan-loading" aria-busy="true" data-testid="status-scan-loading">
              <div aria-hidden="true">{Array.from({ length: 11 }, (_, item) => <LearningStockRowSkeleton key={item} />)}</div>
              <InvestmentLoader size="md" language={ctx.isAr ? 'ar' : 'en'} message="market" className="jx-scan-loading__overlay" />
            </div>
          )}
          {scanner.isError && (
            <div className="jx-card jx-error" role="alert" data-testid="status-scan-error">
              <p>{errMsg(scanner.error, tr('Market data could not be loaded.', 'تعذّر تحميل بيانات السوق.'))}</p>
              <button type="button" className="jx-btn jx-btn--ghost jx-btn--sm" onClick={() => void scanner.refetch()} data-testid="button-retry-scan">
                <RefreshCw size={14} aria-hidden="true" /> {tr('Try again', 'حاول مجددًا')}
              </button>
            </div>
          )}
          {scanner.data && (visible.length === 0 ? (
            <div className="jx-card" data-testid="status-scan-empty"><p className="jx-muted">{tr('No companies match. Try another search or filter.', 'لا توجد شركات مطابقة. جرّب بحثًا أو تصفية أخرى.')}</p></div>
          ) : (
            <ul className="jx-list" data-testid="list-scan-stocks">
              {visible.map((s) => (
                <StockRow key={s.symbol} s={s} ctx={ctx} selected={selected.includes(s.symbol)} active={open === s.symbol}
                  onStar={() => toggle(s.symbol)} onOpen={() => setOpen(open === s.symbol ? null : s.symbol)} />
              ))}
            </ul>
          ))}
        </section>

        <aside id="journey-company-details" aria-label={tr('Details', 'التفاصيل')}>
          {open && (
            <button type="button" className="jx-btn jx-btn--ghost jx-btn--sm" style={{ marginBottom: 12 }}
              data-testid="button-close-company-details" onClick={() => {
                const symbol = open;
                setOpen(null);
                document.querySelector<HTMLButtonElement>(`[data-testid="button-open-${symbol}"]`)?.focus();
              }}>{tr('Close details', 'إغلاق التفاصيل')}</button>
          )}
          {open ? <Detail symbol={open} ctx={ctx} /> : (
            <div className="jx-card" data-testid="status-detail-empty">
              <h3>{tr('Pick a company', 'اختر شركة')}</h3>
              <p className="jx-muted">{tr('Open any company to see its price, one-month trend and rating.', 'افتح أي شركة لترى سعرها واتجاه الشهر وتقييمها.')}</p>
            </div>
          )}
          <div className="jx-card" data-testid="text-rating-explainer">
            <RatingInfo language={ctx.isAr ? 'ar' : 'en'} className="rating-info--embedded" />
          </div>
        </aside>
      </div>

      <div className="jx-sticky-bar">
        <div>
          <strong data-testid="text-selected-count">{tr(`${selected.length} selected`, `تم اختيار ${selected.length}`)}</strong>
          {saveError && <p className="jx-field-error" role="alert" data-testid="text-save-error">{saveError}</p>}
          {ctx.advanceError && <p className="jx-field-error" role="alert">{ctx.advanceError}</p>}
        </div>
        <div className="jx-btn-row">
          <button type="button" className="jx-btn jx-btn--ghost" disabled={busy || !stocks?.length} onClick={pickForMe} data-testid="button-pick-for-me">
            <Sparkles size={16} aria-hidden="true" /> {tr('Pick for me', 'اختر لي')}
          </button>
          <button type="button" className="jx-btn" disabled={busy || selected.length < 1} aria-busy={busy} onClick={() => void saveAndGo(selected)} data-testid="button-scan-continue">
            {busy ? <span className="jx-inline-loading"><InvestmentArrows size="sm" className="kv-investment-arrows--button" />{tr('Saving', 'جارٍ الحفظ')}</span> : tr('Continue', 'متابعة')}
            {!busy && <ArrowRight size={18} aria-hidden="true" className="jx-flip" />}
          </button>
        </div>
      </div>
    </>
  );
}

export default function JourneyScanPage() {
  return <JourneyShell step="scan">{(ctx) => <ScanBody ctx={ctx} />}</JourneyShell>;
}
