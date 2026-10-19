import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { RotateCcw } from 'lucide-react';
import { useResetJourney } from '@workspace/api-client-react';
import { ConfirmDialog, JourneyShell, type JourneyCtx } from '@/components/journey/shell';
import { errMsg, fmtKwd, fmtPct, stepPath } from '@/lib/journey';

function FinishBody({ ctx }: { ctx: JourneyCtx }) {
  const { tr, state } = ctx;
  const na = tr('Unavailable', 'غير متاح');
  const reset = useResetJourney();
  const [, setLocation] = useLocation();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const r = state.roiResult;

  const restart = async () => {
    setError(null);
    try {
      ctx.setState(await reset.mutateAsync());
      setConfirm(false);
      setLocation(stepPath(0));
    } catch (e) {
      setError(errMsg(e, tr('Could not start again.', 'تعذّرت إعادة البدء.')));
    }
  };

  const links: [number, string][] = [[0, tr('Scan', 'استكشف')], [2, tr('Research', 'ابحث')], [4, tr('Practice', 'تدرّب')], [6, tr('ROI', 'العائد')]];

  return (
    <section className="jx-intro" style={{ maxWidth: 720 }} aria-labelledby="finish-title" data-testid="section-finish">
      <span className="jx-eyebrow">{tr('Journey complete', 'اكتملت الرحلة')}</span>
      <h1 id="finish-title">{tr('You took your first look at stocks.', 'ألقيت أول نظرة على الأسهم.')}</h1>
      <ul className="jx-summary">
        <li data-testid="text-summary-stocks">
          {tr(`You selected ${state.watchlistSymbols.length} stock(s): `, `اخترت ${state.watchlistSymbols.length} سهمًا: `)}
          <strong>{state.watchlistSymbols.join(', ') || na}</strong>
        </li>
        <li data-testid="text-summary-demo">
          {tr('Demo portfolio: ', 'المحفظة التجريبية: ')}
          <strong>{fmtKwd(state.portfolioValueKwd, na)}</strong> ({tr('ROI', 'العائد')} {fmtPct(state.roiPercent, na)})
        </li>
        <li data-testid="text-summary-calculator">
          {r ? <>{tr('Calculator for ', 'الحاسبة لـ ')}{r.symbol}: <strong>{fmtKwd(r.finalValueKwd)}</strong> ({fmtPct(r.roiPercent)})</> : tr('Calculator: no result saved.', 'الحاسبة: لا توجد نتيجة محفوظة.')}
        </li>
      </ul>
      <div className="jx-chips" data-testid="nav-revisit">
        {links.map(([i, label]) => <Link key={i} href={stepPath(i)} className="jx-chip" data-testid={`link-revisit-${i}`}>{label}</Link>)}
      </div>
      <div className="jx-intro__actions">
        <button type="button" className="jx-btn jx-btn--ghost" onClick={() => { setError(null); setConfirm(true); }} data-testid="button-start-again">
          <RotateCcw size={16} aria-hidden="true" /> {tr('Start again', 'ابدأ من جديد')}
        </button>
      </div>
      <ConfirmDialog open={confirm} testid="start-again" pending={reset.isPending} error={error}
        title={tr('Start the journey again?', 'البدء من جديد؟')}
        body={tr('This clears your selections, practice wallet and calculator result.', 'سيمسح اختياراتك ومحفظة التدريب ونتيجة الحاسبة.')}
        confirmLabel={tr('Start again', 'ابدأ من جديد')} cancelLabel={tr('Cancel', 'إلغاء')}
        onConfirm={() => void restart()} onCancel={() => setConfirm(false)} />
    </section>
  );
}

export default function JourneyFinishPage() {
  return <JourneyShell step="finish">{(ctx) => <FinishBody ctx={ctx} />}</JourneyShell>;
}
