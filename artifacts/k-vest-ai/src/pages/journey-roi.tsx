import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  getGetMarketStockQueryKey,
  useCalculateJourneyRoi,
  getGetMarketScannerQueryKey,
  useGetMarketScanner,
  useGetMarketStock,
} from '@workspace/api-client-react';
import { DataWarning, JourneyShell, type JourneyCtx } from '@/components/journey/shell';
import { BidiValue } from '@/components/bidi-value';
import { InvestmentArrows, InvestmentSkeleton } from '@/components/investment-loader';
import { errMsg, fmtKwd, fmtPct, mergeSymbols } from '@/lib/journey';

function useCountUp(target: number, run: boolean) {
  const [v, setV] = useState(target);
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!run || reduce) { setV(target); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return v;
}

function RoiBody({ ctx }: { ctx: JourneyCtx }) {
  const { tr, state } = ctx;
  const na = tr('Unavailable', 'غير متاح');
  const prior = state.roiResult;
  const symbols = mergeSymbols([...state.watchlistSymbols, ...state.holdings.map((h) => h.symbol), ...state.trades.map((t) => t.symbol)], prior ? [prior.symbol] : []);
  const scanner = useGetMarketScanner({ query: { queryKey: getGetMarketScannerQueryKey(), retry: false } });
  const calc = useCalculateJourneyRoi();
  const [symbol, setSymbol] = useState(prior?.symbol ?? symbols[0] ?? '');
  const [budget, setBudget] = useState(String(prior?.budgetKwd ?? 1000));
  const [buy, setBuy] = useState(prior ? String(prior.buyPriceKwd) : '');
  const [target, setTarget] = useState(prior ? String(prior.targetPriceKwd) : '');
  const [div, setDiv] = useState(prior && prior.annualDividendKwd ? String(prior.annualDividendKwd) : '');
  const [years, setYears] = useState(String(prior?.yearsHeld ?? 1));
  const [error, setError] = useState<string | null>(null);
  const touched = useRef(!!prior);

  const quote = useGetMarketStock(symbol, { query: { enabled: !!symbol, queryKey: getGetMarketStockQueryKey(symbol), retry: false } });
  const stock = quote.data?.stock;
  const price = stock?.priceKwd ?? null;
  useEffect(() => {
    if (price !== null && !touched.current) setBuy(String(price));
  }, [price, symbol]);

  const nameOf = (s: string) => scanner.data?.stocks.find((x) => x.symbol === s)?.companyName ?? s;
  const r = state.roiResult;
  const animate = !!r;
  const finalV = useCountUp(r?.finalValueKwd ?? 0, animate);
  const plV = useCountUp(r?.profitLossKwd ?? 0, animate);
  const roiV = useCountUp(r?.roiPercent ?? 0, animate);

  const lastBuy = [...state.trades].reverse().find((t) => t.side === 'buy');
  const holding = state.holdings[0];
  const canUseDemo = !!holding || !!lastBuy;
  const useDemo = () => {
    setError(null);
    touched.current = true;
    const sym = holding?.symbol ?? lastBuy!.symbol;
    const cost = holding?.costBasisKwd ?? lastBuy!.notionalKwd;
    const avg = holding?.averageCostKwd ?? lastBuy!.priceKwd;
    const current = holding?.currentPriceKwd ?? scanner.data?.stocks.find((x) => x.symbol === sym)?.priceKwd ?? null;
    setSymbol(sym);
    setBudget(String(cost));
    setBuy(String(avg));
    setTarget(current !== null ? String(current) : '');
    setYears('1');
    if (current === null) setError(tr('Current price is unavailable, so enter your own target price.', 'السعر الحالي غير متاح، لذا أدخل سعرك المستهدف.'));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const nums = { b: Number(budget), p: Number(buy), t: Number(target), y: Number(years), d: div.trim() === '' ? undefined : Number(div) };
    if (!(nums.b > 0) || !(nums.p > 0) || !(nums.t >= 0) || !(nums.y > 0) || (nums.d !== undefined && !(nums.d >= 0)) || !symbol || target.trim() === '') {
      setError(tr('Check your numbers: budget, prices and years must be positive; dividend cannot be negative.', 'تحقق من الأرقام: يجب أن تكون الميزانية والأسعار والسنوات موجبة والتوزيعات غير سالبة.'));
      return;
    }
    try {
      ctx.setState(await calc.mutateAsync({ data: { symbol, budgetKwd: nums.b, buyPriceKwd: nums.p, targetPriceKwd: nums.t, yearsHeld: nums.y, ...(nums.d !== undefined ? { annualDividendKwd: nums.d } : {}) } }));
    } catch (err) {
      setError(errMsg(err, tr('The calculation could not be completed.', 'تعذّر إتمام الحساب.')));
    }
  };

  if (!state.watchlistSymbols.length && !symbols.length) {
    return (
      <div className="jx-card jx-error" data-testid="status-roi-empty">
        <p>{tr('Select at least one company in the scan phase first.', 'اختر شركة واحدة على الأقل في مرحلة الاستكشاف أولًا.')}</p>
        <button type="button" className="jx-btn" onClick={() => ctx.go('scan')} data-testid="button-back-scan">{tr('Back to scan', 'العودة للاستكشاف')}</button>
      </div>
    );
  }

  const riskText = r && (r.riskLabel === 'Low' ? tr('Low: the target is a small move from the buy price.', 'منخفض: الهدف حركة صغيرة عن سعر الشراء.')
    : r.riskLabel === 'Medium' ? tr('Medium: the target is a moderate move from the buy price.', 'متوسط: الهدف حركة معتدلة عن سعر الشراء.')
    : tr('High: the target is a large move from the buy price.', 'مرتفع: الهدف حركة كبيرة عن سعر الشراء.'));
  const fld = (label: string, val: string, set: (v: string) => void, id: string, hint?: string) => (
    <label className="jx-label">{label}
      <input className="jx-input" type="number" inputMode="decimal" step="any" min={0} value={val} onChange={(e) => { touched.current = true; set(e.target.value); }} data-testid={`input-roi-${id}`} />
      {hint && <small>{hint}</small>}
    </label>
  );

  return (
    <>
      <div className="jx-page-head">
        <span className="jx-eyebrow">{tr('Phase 4 of 4', 'المرحلة 4 من 4')}</span>
        <h1>{tr('What if? ROI scenarios', 'ماذا لو؟ سيناريوهات العائد')}</h1>
        <p className="jx-muted">{tr('Try a budget, a buy price and a target. Results are demo numbers.', 'جرّب ميزانية وسعر شراء وهدفًا. النتائج أرقام تجريبية.')}</p>
      </div>
      <DataWarning sample={!!stock?.sample} stale={!!stock?.stale} warning={quote.data?.warning} tr={tr}
        onRetry={() => void quote.refetch()} retrying={quote.isFetching} />
      <div className="jx-grid jx-grid--even">
        <form className="jx-card jx-form" onSubmit={(e) => void submit(e)} data-testid="form-roi">
          <label className="jx-label">{tr('Company', 'الشركة')}
            <select className="jx-input" value={symbol} onChange={(e) => { touched.current = false; setSymbol(e.target.value); }} data-testid="select-roi-company">
              {symbols.map((s) => <option key={s} value={s} dir="auto">{nameOf(s)} ({s})</option>)}
            </select>
          </label>
          <div>
            <button type="button" className="jx-btn jx-btn--ghost jx-btn--sm" disabled={!canUseDemo} onClick={useDemo} data-testid="button-use-demo-results">{tr('Use my demo results', 'استخدم نتائجي التجريبية')}</button>
            {!canUseDemo && <p className="jx-muted" style={{ marginBlockStart: 6 }} data-testid="text-demo-disabled-reason">{tr('Make a practice trade first, then your holding can fill this form.', 'أجرِ صفقة تدريب أولًا ليملأ سهمك هذا النموذج.')}</p>}
          </div>
          <p className="jx-muted" data-testid="text-roi-market-price">{tr('Latest price', 'آخر سعر')}: {quote.isLoading ? <InvestmentSkeleton variant="price" label={tr('Loading price', 'جارٍ تحميل السعر')} /> : <BidiValue>{fmtKwd(price, na)}</BidiValue>}</p>
          {quote.isError && (
            <p className="jx-field-error" role="alert" data-testid="status-roi-price-error">
              {tr("We couldn't load the latest price. You can enter one yourself, or try again.", 'تعذّر تحميل أحدث سعر. يمكنك إدخاله بنفسك أو المحاولة مجددًا.')}
              {' '}
              <button type="button" className="jx-chip" onClick={() => void quote.refetch()} disabled={quote.isFetching} data-testid="button-retry-roi-price">
                {tr('Try again', 'حاول مجددًا')}
              </button>
            </p>
          )}
          <div className="jx-form-row">
            {fld(tr('Budget (KWD)', 'الميزانية (د.ك)'), budget, setBudget, 'budget')}
            {fld(tr('Buy price (KWD)', 'سعر الشراء (د.ك)'), buy, setBuy, 'buy', price === null ? tr('Price unavailable. Enter your own.', 'السعر غير متاح. أدخل سعرك.') : tr('Filled from the latest price', 'معبأ من آخر سعر'))}
          </div>
          <div className="jx-form-row">
            {fld(tr('Target price (KWD)', 'السعر المستهدف (د.ك)'), target, setTarget, 'target')}
            {fld(tr('Years held', 'سنوات الاحتفاظ'), years, setYears, 'years')}
          </div>
          {fld(tr('Annual dividend per share (KWD, optional)', 'توزيعات سنوية للسهم (د.ك، اختياري)'), div, setDiv, 'dividend', tr('Enter the yearly dividend for ONE share, not your total. Leave blank for none.', 'أدخل التوزيعات السنوية لسهم واحد وليس إجماليها. اتركه فارغًا إن لم يوجد.'))}
          <p className="jx-muted" data-testid="text-roi-assumption">{tr('Assumption: your whole budget buys shares at the buy price, including fractions of a share. Practice trades use whole shares only.', 'افتراض: كامل ميزانيتك تشتري أسهمًا بسعر الشراء، بما في ذلك أجزاء من السهم. صفقات التدريب بأسهم كاملة فقط.')}</p>
          {error && <p className="jx-field-error" role="alert" data-testid="text-roi-error">{error}</p>}
          <button type="submit" className="jx-btn" disabled={calc.isPending} aria-busy={calc.isPending} data-testid="button-roi-calculate">
            {calc.isPending ? <><InvestmentArrows size="sm" className="kv-investment-arrows--button" />{tr('Calculating', 'جارٍ الحساب')}</> : tr('Calculate', 'احسب')}
          </button>
        </form>
        <section className="jx-card" aria-live="polite" data-testid="section-roi-result">
          {!r ? (
            <><h2>{tr('Your result', 'نتيجتك')}</h2><p className="jx-muted" data-testid="status-roi-placeholder">{tr('Fill in the form and press Calculate.', 'املأ النموذج واضغط احسب.')}</p></>
          ) : (
            <>
              <span className="jx-eyebrow" dir="auto">{nameOf(r.symbol)}</span>
              <p className="jx-result-big" data-testid="text-roi-final"><BidiValue>{fmtKwd(finalV)}</BidiValue></p>
              <p className="jx-muted">{tr('Final value', 'القيمة النهائية')}</p>
              <dl className="jx-kv">
                <div><dt>{tr('Profit / loss', 'الربح / الخسارة')}</dt><dd className={r.profitLossKwd >= 0 ? 'is-pos' : 'is-neg'} data-testid="text-roi-pl"><BidiValue>{fmtKwd(plV)}</BidiValue></dd></div>
                <div><dt>ROI</dt><dd data-testid="text-roi-percent"><BidiValue>{fmtPct(roiV)}</BidiValue></dd></div>
                <div><dt>{tr('Per year', 'سنويًا')}</dt><dd><BidiValue>{fmtPct(r.annualizedReturnPercent)}</BidiValue></dd></div>
                <div><dt>{tr('Shares', 'الأسهم')}</dt><dd><BidiValue>{r.shares.toLocaleString('en-US', { maximumFractionDigits: 3 })}</BidiValue></dd></div>
                <div><dt>{tr('Dividends', 'التوزيعات')}</dt><dd><BidiValue>{fmtKwd(r.dividendTotalKwd)}</BidiValue></dd></div>
                <div><dt>{tr('Target-move level', 'مستوى حركة الهدف')}</dt><dd data-testid="text-roi-risk">{r.riskLabel === 'Low' ? tr('Low', 'منخفض') : r.riskLabel === 'Medium' ? tr('Medium', 'متوسط') : tr('High', 'مرتفع')}</dd></div>
              </dl>
              <p className="jx-risk">{riskText} {tr('This label is a simple heuristic based on how far the target is from the buy price. It is not investment advice.', 'هذا التصنيف قاعدة مبسطة تعتمد على بعد الهدف عن سعر الشراء، وليس نصيحة استثمارية.')}</p>
            </>
          )}
        </section>
      </div>
      <div className="jx-sticky-bar">
        <span className="jx-muted">{r
          ? tr('Calculation saved.', 'تم حفظ الحساب.')
          : tr('Try a calculation to see how it works, or finish whenever you’re ready.', 'جرّب الحساب لترى كيف يعمل، أو أنهِ الرحلة متى شئت.')}</span>
        <div>
          {ctx.advanceError && <p className="jx-field-error" role="alert">{ctx.advanceError}</p>}
          <button type="button" className="jx-btn" disabled={calc.isPending || ctx.advancing} onClick={() => void ctx.advance('roi', 'finish')} data-testid="button-roi-next">
            {tr('Finish', 'إنهاء')} <ArrowRight size={18} aria-hidden="true" className="jx-flip" />
          </button>
        </div>
      </div>
    </>
  );
}

export default function JourneyRoiPage() {
  return <JourneyShell step="roi">{(ctx) => <RoiBody ctx={ctx} />}</JourneyShell>;
}
