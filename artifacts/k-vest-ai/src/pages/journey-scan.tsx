import { useMemo, useState } from 'react';
import { ArrowRight, RefreshCw, Search, Sparkles, Star } from 'lucide-react';
import {
  getGetMarketStockQueryKey,
  getGetMarketScannerQueryKey,
  useGetMarketScanner,
  useGetMarketStock,
  useSaveJourneyWatchlist,
  type MarketScannerStock,
} from '@workspace/api-client-react';
import { DataWarning, JourneyShell, Sparkline, type JourneyCtx } from '@/components/journey/shell';
import { errMsg, fmtKwd, fmtPct, fmtTime } from '@/lib/journey';

type Tab = 'all' | 'gainers' | 'losers' | 'active';

function StockRow({ s, selected, active, onStar, onOpen, ctx }: {
  s: MarketScannerStock; selected: boolean; active: boolean; onStar: () => void; onOpen: () => void; ctx: JourneyCtx;
}) {
  const { tr } = ctx;
  const na = tr('Unavailable', 'غير متاح');
  return (
    <li className={`jx-row${active ? ' is-active' : ''}`} data-testid={`row-stock-${s.symbol}`}>
      <button type="button" className="jx-star" aria-pressed={selected} onClick={onStar}
        aria-label={`${selected ? tr('Remove', 'إزالة') : tr('Add', 'إضافة')} ${s.companyName}`} data-testid={`button-star-${s.symbol}`}>
        <Star size={20} aria-hidden="true" />
      </button>
      <button type="button" className="jx-row__main" onClick={onOpen} aria-expanded={active} aria-controls="journey-company-details" data-testid={`button-open-${s.symbol}`}>
        <strong>{s.companyName}</strong>
        <div className="jx-row__meta">
          <span>{s.symbol}{s.sample ? ` · ${tr('Sample', 'تجريبي')}` : ''}</span>
          <b className={`jx-badge jx-badge--${s.rating}`}>{ratingLabel(s.rating, tr)}</b>
        </div>
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
  const { tr } = ctx;
  const q = useGetMarketStock(symbol, { query: { queryKey: getGetMarketStockQueryKey(symbol), retry: false } });
  const na = tr('Unavailable', 'غير متاح');
  if (q.isLoading) return <div className="jx-card jx-skeleton" aria-busy="true"><i /><i /></div>;
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
      <DataWarning sample={stock.sample || refreshStatus === 'sample'} stale={stock.stale || refreshStatus === 'stale'} warning={warning} tr={tr} />
      <h2>{stock.companyName}</h2>
      <p className="jx-muted">{stock.symbol}{stock.sector ? ` · ${stock.sector}` : ''}</p>
      <p className="jx-result-big" style={{ marginTop: 10 }} data-testid="text-detail-price">{fmtKwd(stock.priceKwd, na)}</p>
      <div className="jx-detail-chart">
        <p className="jx-muted">{tr('One-month price trend', 'الاتجاه السعري لشهر')}</p>
        {stock.sparkline.length > 1 ? <Sparkline points={stock.sparkline} /> : (
          <p className="jx-muted" role="status">{tr('Price history is temporarily unavailable.', 'التاريخ السعري غير متاح مؤقتًا.')}</p>
        )}
      </div>
      <dl className="jx-kv">
        <div><dt>{tr('Change', 'التغيّر')}</dt><dd>{fmtKwd(stock.changeKwd, na)} ({fmtPct(stock.changePercent, na)})</dd></div>
        <div><dt>{tr('Volume', 'حجم التداول')}</dt><dd>{stock.volume === null ? na : stock.volume.toLocaleString('en-US')}</dd></div>
        <div><dt>{tr('Momentum', 'الزخم')}</dt><dd>{fmtPct(stock.momentumPercent, na)}</dd></div>
        <div><dt>{tr('Rating', 'التقييم')}</dt><dd><span className={`jx-badge jx-badge--${stock.rating}`}>{ratingLabel(stock.rating, tr)}</span></dd></div>
      </dl>
      {time && <p className="jx-muted" style={{ marginTop: 10 }}>{tr('Quote time', 'وقت السعر')}: {time}</p>}
    </div>
  );
}

function ratingLabel(r: string, tr: JourneyCtx['tr']) {
  if (r === 'Strong') return tr('Strong', 'قوي');
  if (r === 'Neutral') return tr('Neutral', 'محايد');
  if (r === 'Weak') return tr('Weak', 'ضعيف');
  return tr('Unavailable', 'غير متاح');
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
      {scanner.data && <DataWarning sample={scanner.data.refreshStatus === 'sample' || (stocks ?? []).some((s) => s.sample)} stale={scanner.data.refreshStatus === 'stale'} warning={scanner.data.warning} tr={tr} />}

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
          {scanner.isLoading && <div className="jx-skeleton" aria-busy="true" data-testid="status-scan-loading"><i /><i /><i /><i /></div>}
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
            <h3>{tr('What do the ratings mean?', 'ماذا تعني التقييمات؟')}</h3>
            <p className="jx-muted">{tr('Strong, Neutral and Weak combine recent price momentum and relative volume. They are a learning aid, not a prediction or advice.', 'قوي ومحايد وضعيف تجمع زخم السعر الأخير وحجم التداول النسبي. هي أداة تعليمية وليست توقعًا أو نصيحة.')}</p>
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
          <button type="button" className="jx-btn" disabled={busy || selected.length < 1} onClick={() => void saveAndGo(selected)} data-testid="button-scan-continue">
            {busy ? tr('Saving…', 'جارٍ الحفظ…') : tr('Continue', 'متابعة')} <ArrowRight size={18} aria-hidden="true" className="jx-flip" />
          </button>
        </div>
      </div>
    </>
  );
}

export default function JourneyScanPage() {
  return <JourneyShell step="scan">{(ctx) => <ScanBody ctx={ctx} />}</JourneyShell>;
}
