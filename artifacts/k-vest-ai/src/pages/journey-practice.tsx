import { useState } from 'react';
import { ArrowRight, CalendarDays, PartyPopper, RotateCcw } from 'lucide-react';
import { Link } from 'wouter';
import {
  getGetMarketStockQueryKey,
  useCreateJourneyTrade,
  getGetMarketScannerQueryKey,
  useGetMarketScanner,
  useGetMarketStock,
  useResetJourneyWallet,
} from '@workspace/api-client-react';
import { ConfirmDialog, DataWarning, JourneyShell, type JourneyCtx } from '@/components/journey/shell';
import { InvestmentSkeleton } from '@/components/investment-loader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { errMsg, fmtKwd, fmtTime, mergeSymbols } from '@/lib/journey';

function PracticeBody({ ctx }: { ctx: JourneyCtx }) {
  const { tr, state } = ctx;
  const na = tr('Unavailable', 'غير متاح');
  const scanner = useGetMarketScanner({ query: { queryKey: getGetMarketScannerQueryKey(), retry: false } });
  const trade = useCreateJourneyTrade();
  const reset = useResetJourneyWallet();
  const symbols = state.watchlistSymbols;
  const allSymbols = mergeSymbols([...symbols, ...state.holdings.map((h) => h.symbol)], (scanner.data?.stocks ?? []).map((x) => x.symbol));
  const [symbol, setSymbol] = useState(symbols[0] ?? '');
  const [qty, setQty] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [firstTradeCelebrationOpen, setFirstTradeCelebrationOpen] = useState(false);

  const quote = useGetMarketStock(symbol, { query: { enabled: !!symbol, queryKey: getGetMarketStockQueryKey(symbol), retry: false } });
  const stock = quote.data?.stock;
  const nameOf = (s: string) => scanner.data?.stocks.find((x) => x.symbol === s)?.companyName ?? s;
  const quantity = Number(qty);
  const validQty = Number.isInteger(quantity) && quantity >= 1;
  const estimate = stock?.priceKwd != null && validQty ? stock.priceKwd * quantity : null;

  const place = async (side: 'buy' | 'sell') => {
    setError(null);
    if (!validQty) { setError(tr('Enter a whole number of shares, 1 or more.', 'أدخل عددًا صحيحًا من الأسهم، 1 أو أكثر.')); return; }
    try {
      const nextState = await trade.mutateAsync({ data: { symbol, side, quantity } });
      ctx.setState({ ...nextState, celebrateFirstTrade: false });
      if (nextState.celebrateFirstTrade) setFirstTradeCelebrationOpen(true);
    } catch (e) {
      setError(errMsg(e, tr('The trade could not be completed.', 'تعذّر تنفيذ الصفقة.')));
    }
  };

  const doReset = async () => {
    setResetError(null);
    try {
      ctx.setState(await reset.mutateAsync());
      setConfirm(false);
    } catch (e) {
      setResetError(errMsg(e, tr('Could not reset the wallet.', 'تعذّرت إعادة ضبط المحفظة.')));
    }
  };

  if (!symbols.length) {
    return (
      <div className="jx-card jx-error" data-testid="status-practice-empty">
        <p>{tr('Select at least one company in the scan phase first.', 'اختر شركة واحدة على الأقل في مرحلة الاستكشاف أولًا.')}</p>
        <button type="button" className="jx-btn" onClick={() => ctx.go('scan')} data-testid="button-back-scan">{tr('Back to scan', 'العودة للاستكشاف')}</button>
      </div>
    );
  }

  const busy = trade.isPending || ctx.advancing;
  const hasTrades = state.trades.length > 0;
  const anySample = state.holdings.some((h) => h.sample) || state.trades.some((t) => t.sample) || !!stock?.sample;
  const anyStale = state.holdings.some((h) => h.stale) || !!stock?.stale;

  return (
    <>
      <div className="jx-page-head">
        <span className="jx-eyebrow">{tr('Phase 3 of 4', 'المرحلة 3 من 4')}</span>
        <h1>{tr('Practice wallet', 'محفظة التدريب')}</h1>
        <p className="jx-muted">{tr('Demo money only. Trades happen at the latest price our feed has.', 'مال تجريبي فقط. تتم الصفقات بآخر سعر لدى مصدر البيانات.')}</p>
      </div>
      <DataWarning
        sample={anySample}
        stale={anyStale}
        warning={state.marketDataNote || quote.data?.warning}
        tr={tr}
        onRetry={() => void Promise.all([scanner.refetch(), quote.refetch()])}
        retrying={scanner.isFetching || quote.isFetching}
      />
      <div className="jx-stats" data-testid="section-wallet-stats">
        <div className="jx-stat"><span>{tr('Cash', 'النقد')}</span><b data-testid="text-cash">{fmtKwd(state.cashKwd, na)}</b></div>
        <div className="jx-stat"><span>{tr('Holdings value', 'قيمة الأسهم')}</span><b data-testid="text-market-value">{fmtKwd(state.marketValueKwd, na)}</b></div>
        <div className="jx-stat"><span>{tr('Portfolio total', 'إجمالي المحفظة')}</span><b data-testid="text-portfolio-value">{fmtKwd(state.portfolioValueKwd, na)}</b></div>
        <div className="jx-stat"><span>{tr('Profit / loss', 'الربح / الخسارة')}</span>
          <b className={(state.profitLossKwd ?? 0) >= 0 ? 'is-pos' : 'is-neg'} data-testid="text-profit-loss">{fmtKwd(state.profitLossKwd, na)}</b></div>
      </div>

      <div className="jx-grid jx-grid--even" style={{ marginTop: 16 }}>
        <section className="jx-card" aria-labelledby="trade-h">
          <h2 id="trade-h">{tr('Place a demo trade', 'نفّذ صفقة تجريبية')}</h2>
          <p className="jx-tip" data-testid="text-first-trade-tip">{hasTrades
            ? tr('First trade done. Watch how value and profit or loss move with the price, then continue when ready.', 'تمت أول صفقة. راقب كيف تتغير القيمة والربح أو الخسارة مع السعر، ثم تابع عندما تكون جاهزًا.')
            : tr('Try a practice trade to see how it works. Trading is optional—continue whenever you’re ready.', 'جرّب صفقة تدريبية لتعرف كيف تعمل. التداول اختياري—تابع متى شئت.')}</p>
          <div className="jx-form">
            <label className="jx-label">{tr('Company', 'الشركة')}
              <select className="jx-input" value={symbol} onChange={(e) => setSymbol(e.target.value)} data-testid="select-trade-company">
                {allSymbols.map((s) => <option key={s} value={s}>{nameOf(s)} ({s}){symbols.includes(s) ? ` - ${tr('selected', 'مختارة')}` : ''}</option>)}
              </select>
              {scanner.isLoading && <small className="jx-company-options-loading" data-testid="status-practice-scanner-loading"><InvestmentSkeleton variant="text" label={tr('Loading companies', 'جارٍ تحميل الشركات')} /></small>}
              {scanner.isError && <small className="jx-field-error" role="alert" data-testid="status-practice-scanner-error">{tr('Full company list unavailable; showing your selection.', 'قائمة الشركات الكاملة غير متاحة؛ تظهر شركاتك المختارة.')} <button type="button" className="jx-chip" onClick={() => void scanner.refetch()} data-testid="button-retry-practice-scanner">{tr('Retry', 'إعادة')}</button></small>}
            </label>
            <div data-testid="text-trade-price">
              <span className="jx-muted">{tr('Latest price', 'آخر سعر')}</span>
              <p className="jx-result-big" style={{ fontSize: 28 }}>{quote.isLoading ? <InvestmentSkeleton variant="price-large" label={tr('Loading price', 'جارٍ تحميل السعر')} /> : fmtKwd(stock?.priceKwd, na)}</p>
              {fmtTime(stock?.marketTime) && <span className="jx-muted">{fmtTime(stock?.marketTime)}</span>}
              {quote.isError && <p className="jx-field-error" role="alert">{errMsg(quote.error, tr('Price could not be loaded.', 'تعذّر تحميل السعر.'))} <button type="button" className="jx-chip" onClick={() => void quote.refetch()} data-testid="button-retry-price">{tr('Retry', 'إعادة')}</button></p>}
            </div>
            <label className="jx-label">{tr('Shares (whole numbers)', 'عدد الأسهم (أرقام صحيحة)')}
              <input className="jx-input" type="number" inputMode="numeric" min={1} step={1} value={qty} onChange={(e) => setQty(e.target.value)} data-testid="input-trade-quantity" />
              <small>{tr('Estimated value', 'القيمة التقديرية')}: {fmtKwd(estimate, na)}</small>
            </label>
            <div className="jx-btn-row">
              <button type="button" className="jx-btn" disabled={busy || stock?.priceKwd == null} onClick={() => void place('buy')} data-testid="button-buy">{tr('Buy', 'شراء')}</button>
              <button type="button" className="jx-btn jx-btn--ghost" disabled={busy || stock?.priceKwd == null} onClick={() => void place('sell')} data-testid="button-sell">{tr('Sell', 'بيع')}</button>
            </div>
            {error && <p className="jx-field-error" role="alert" data-testid="text-trade-error">{error}</p>}
          </div>
        </section>

        <section className="jx-card" aria-labelledby="hold-h">
          <h2 id="hold-h">{tr('Your holdings', 'أسهمك')}</h2>
          {state.holdings.length === 0 ? (
            <p className="jx-muted" data-testid="status-holdings-empty">{tr('No shares yet. Your first buy will appear here.', 'لا أسهم بعد. ستظهر أول عملية شراء هنا.')}</p>
          ) : (
            <div className="jx-table-wrap"><table className="jx-table">
              <thead><tr><th>{tr('Company', 'الشركة')}</th><th>{tr('Qty', 'الكمية')}</th><th>{tr('Avg cost', 'متوسط التكلفة')}</th><th>{tr('Value', 'القيمة')}</th><th>{tr('P/L', 'ر/خ')}</th></tr></thead>
              <tbody>{state.holdings.map((h) => (
                <tr key={h.symbol} data-testid={`row-holding-${h.symbol}`}>
                  <td>{h.companyName}{h.sample ? ` (${tr('sample', 'تجريبي')})` : ''}</td><td>{h.quantity}</td>
                  <td>{fmtKwd(h.averageCostKwd, na)}</td><td>{fmtKwd(h.marketValueKwd, na)}</td>
                  <td className={(h.profitLossKwd ?? 0) >= 0 ? 'is-pos' : 'is-neg'}>{fmtKwd(h.profitLossKwd, na)}</td>
                </tr>))}</tbody>
            </table></div>
          )}
        </section>
      </div>

      <section className="jx-card" aria-labelledby="hist-h">
        <h2 id="hist-h">{tr('Trade history', 'سجل الصفقات')}</h2>
        {!hasTrades ? <p className="jx-muted" data-testid="status-history-empty">{tr('No trades yet.', 'لا صفقات بعد.')}</p> : (
          <div className="jx-table-wrap"><table className="jx-table">
            <thead><tr><th>{tr('Time', 'الوقت')}</th><th>{tr('Company', 'الشركة')}</th><th>{tr('Side', 'النوع')}</th><th>{tr('Qty', 'الكمية')}</th><th>{tr('Price', 'السعر')}</th><th>{tr('Total', 'الإجمالي')}</th></tr></thead>
            <tbody>{[...state.trades].reverse().map((t) => (
              <tr key={t.id} data-testid={`row-trade-${t.id}`}>
                <td>{fmtTime(t.createdAt) ?? na}</td><td>{t.companyName}{t.sample ? ` (${tr('sample', 'تجريبي')})` : t.stale ? ` (${tr('delayed', 'متأخر')})` : ''}</td>
                <td>{t.side === 'buy' ? tr('Buy', 'شراء') : tr('Sell', 'بيع')}</td><td>{t.quantity}</td>
                <td>{fmtKwd(t.priceKwd, na)}</td><td>{fmtKwd(t.notionalKwd, na)}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </section>

      <div className="jx-sticky-bar">
        <button type="button" className="jx-btn jx-btn--ghost" onClick={() => { setResetError(null); setConfirm(true); }} data-testid="button-reset-wallet">
          <RotateCcw size={16} aria-hidden="true" /> {tr('Reset wallet', 'إعادة ضبط المحفظة')}
        </button>
        <div className="jx-btn-row">
          <Link href="/journey/weekly" className="jx-btn jx-btn--ghost" data-testid="link-weekly-summary">
            <CalendarDays size={16} aria-hidden="true" /> {tr('This week', 'هذا الأسبوع')}
          </Link>
          <button type="button" className="jx-btn" disabled={busy} onClick={() => void ctx.advance('practice', 'roi-intro')} data-testid="button-practice-next">
            {tr('Next', 'التالي')} <ArrowRight size={18} aria-hidden="true" className="jx-flip" />
          </button>
        </div>
      </div>
      {ctx.advanceError && <p className="jx-field-error" role="alert">{ctx.advanceError}</p>}

      <Dialog open={firstTradeCelebrationOpen} onOpenChange={setFirstTradeCelebrationOpen}>
        <DialogContent
          className="jx-first-trade-dialog"
          dir={ctx.isAr ? 'rtl' : 'ltr'}
          closeLabel={tr('Close', 'إغلاق')}
          data-testid="dialog-first-practice-trade"
        >
          <div className="jx-first-trade-celebration__art" aria-hidden="true">
            <span className="jx-first-trade-celebration__confetti" />
            <span className="jx-first-trade-celebration__confetti" />
            <span className="jx-first-trade-celebration__confetti" />
            <span className="jx-first-trade-celebration__confetti" />
            <span className="jx-first-trade-celebration__confetti" />
            <span className="jx-first-trade-celebration__confetti" />
            <span className="jx-first-trade-celebration__confetti" />
            <span className="jx-first-trade-celebration__confetti" />
            <span className="jx-first-trade-celebration__badge"><PartyPopper size={36} strokeWidth={1.8} /></span>
          </div>
          <DialogHeader className="jx-first-trade-dialog__header">
            <DialogTitle className="jx-first-trade-dialog__title">
              {tr('You made your first practice trade! 🎉', 'نفّذت أول صفقة تدريبية لك! 🎉')}
            </DialogTitle>
            <DialogDescription className="jx-first-trade-dialog__description">
              {tr(
                'You recorded a trade with demo money and updated your practice portfolio.',
                'سجّلت صفقة بمال تجريبي وتم تحديث محفظة التدريب.',
              )}
            </DialogDescription>
          </DialogHeader>
          <button
            type="button"
            className="jx-btn jx-first-trade-dialog__continue"
            onClick={() => setFirstTradeCelebrationOpen(false)}
            data-testid="button-continue-first-trade-celebration"
          >
            {tr('Continue', 'متابعة')}
          </button>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={confirm} testid="reset-wallet" pending={reset.isPending} error={resetError}
        title={tr('Reset the practice wallet?', 'إعادة ضبط محفظة التدريب؟')}
        body={tr('This restores 1,000 KWD, clears your trades and this week’s challenge progress, and also clears your ROI calculator and any later progress.', 'سيعيد 1,000 دينار ويمسح صفقاتك وتقدّم تحديات هذا الأسبوع وحاسبة العائد وأي تقدّم لاحق.')}
        confirmLabel={tr('Reset', 'إعادة ضبط')} cancelLabel={tr('Cancel', 'إلغاء')}
        onConfirm={() => void doReset()} onCancel={() => setConfirm(false)} />
    </>
  );
}

export default function JourneyPracticePage() {
  return <JourneyShell step="practice">{(ctx) => <PracticeBody ctx={ctx} />}</JourneyShell>;
}
