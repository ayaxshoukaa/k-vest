import { useEffect, useRef, type ReactNode } from 'react';
import { useAuth } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Link, Redirect, useLocation } from 'wouter';
import {
  getGetJourneyStateQueryKey,
  useAdvanceJourney,
  useGetJourneyState,
  type JourneyStateResponse,
  type JourneyStep,
} from '@workspace/api-client-react';
import { BrandMark } from '@/components/brand-mark';
import { JourneyHomeLink } from './home-link';
import {
  DATA_NOTE_AR, DATA_NOTE_EN, DISCLAIMER_AR, DISCLAIMER_EN,
  errMsg, phaseOf, stepIndex, stepOrder, stepPath, useJourneyLanguage,
} from '@/lib/journey';
import '@/pages/journey.css';

export interface JourneyCtx {
  state: JourneyStateResponse;
  isAr: boolean;
  tr: (en: string, ar: string) => string;
  setState: (s: JourneyStateResponse) => void;
  /** Move forward from `from`; revisits navigate only, new progress calls the API. */
  advance: (from: JourneyStep, next: JourneyStep) => Promise<void>;
  advancing: boolean;
  advanceError: string | null;
  go: (step: JourneyStep) => void;
}

export function JourneyShell({ step, children }: { step: JourneyStep; children: (ctx: JourneyCtx) => ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const lang = useJourneyLanguage();
  const { isAr, tr } = lang;
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const index = stepIndex(step);
  const query = useGetJourneyState({
    query: { enabled: isLoaded, queryKey: getGetJourneyStateQueryKey(), retry: false },
  });
  const advanceMutation = useAdvanceJourney();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [step]);

  const state = query.data;
  const setState = (s: JourneyStateResponse) => queryClient.setQueryData(getGetJourneyStateQueryKey(), s);

  let body: ReactNode;
  if (!isLoaded || (query.isLoading)) {
    body = (
      <div className="jx-skeleton" aria-busy="true" data-testid="status-journey-loading">
        <i /><i /><i />
        <span className="jx-sr">{tr('Loading your journey', 'جارٍ تحميل رحلتك')}</span>
      </div>
    );
  } else if (query.isError || !state) {
    body = (
      <div className="jx-card jx-error" role="alert" data-testid="status-journey-error">
        <AlertTriangle size={20} aria-hidden="true" />
        <p>{errMsg(query.error, tr('We could not load your journey.', 'تعذّر تحميل رحلتك.'))}</p>
        <button type="button" className="jx-btn jx-btn--ghost" onClick={() => void query.refetch()} data-testid="button-retry-journey">
          <RefreshCw size={16} aria-hidden="true" /> {tr('Try again', 'حاول مجددًا')}
        </button>
      </div>
    );
  } else if (index > state.furthestStep) {
    return <Redirect to={stepPath(Math.min(8, Math.max(0, state.furthestStep)))} />;
  } else {
    const ctx: JourneyCtx = {
      state, isAr, tr, setState,
      advancing: advanceMutation.isPending,
      advanceError: advanceMutation.isError ? errMsg(advanceMutation.error, tr('Could not continue. Please try again.', 'تعذّر المتابعة. حاول مجددًا.')) : null,
      go: (s) => setLocation(stepPath(s)),
      advance: async (from, next) => {
        if (state.furthestStep > stepIndex(from)) {
          setLocation(stepPath(next));
          return;
        }
        try {
          const res = await advanceMutation.mutateAsync({ data: { fromStep: from, nextStep: next } });
          setState(res);
          setLocation(stepPath(next));
        } catch {
          // surfaced through advanceError
        }
      },
    };
    body = children(ctx);
  }

  const phase = phaseOf(index);
  const furthest = state?.furthestStep ?? 0;
  const phaseNames = [tr('Scan', 'استكشف'), tr('Research', 'ابحث'), tr('Practice', 'تدرّب'), tr('ROI', 'العائد')];

  return (
    <div className={`jx${isAr ? ' jx--rtl' : ''}`} dir={isAr ? 'rtl' : 'ltr'} lang={lang.language} data-testid={`page-journey-${step}`}>
      <header className="jx-header">
        <Link href="/journey/welcome" className="jx-brand" aria-label={tr('Journey welcome', 'صفحة الترحيب')} data-testid="link-journey-brand">
          <BrandMark className="jx-logo" />
        </Link>
        <nav className="jx-progress" aria-label={tr('Journey progress', 'تقدّم الرحلة')} data-testid="nav-journey-progress">
          <ol>
            {phaseNames.map((name, i) => {
              const reachable = furthest >= i * 2;
              const cls = `jx-dot${i < phase ? ' is-done' : ''}${i === phase ? ' is-current' : ''}`;
              const inner = (
                <>
                  <span className="jx-dot__mark" aria-hidden="true" />
                  <span className="jx-dot__label">{name}</span>
                </>
              );
              return (
                <li key={name} className={cls} aria-current={i === phase ? 'step' : undefined} data-testid={`progress-dot-${i + 1}`}>
                  {reachable ? <Link href={stepPath(i * 2)} className="jx-dot__link">{inner}</Link> : <span className="jx-dot__link">{inner}</span>}
                </li>
              );
            })}
          </ol>
        </nav>
        <button
          type="button"
          className="jx-lang"
          onClick={lang.toggle}
          aria-label={tr('Switch language to Arabic', 'تغيير اللغة إلى الإنجليزية')}
          data-testid="button-toggle-language"
        >
          {tr('العربية', 'English')}
        </button>
      </header>
      <JourneyHomeLink isAr={isAr} />
      <p className="jx-saved" data-testid="text-save-location">{isSignedIn ? tr('Progress is saved to your account.', 'يُحفظ تقدّمك في حسابك.') : tr('Progress is saved in this browser.', 'يُحفظ تقدّمك في هذا المتصفح.')}</p>
      <main className="jx-main" ref={mainRef} tabIndex={-1}>{body}</main>
      <footer className="jx-footer" data-testid="footer-journey-disclaimer">
        <p className="jx-footer__strong">{isAr ? DISCLAIMER_AR : DISCLAIMER_EN}</p>
        <p data-testid="text-data-note">{isAr ? DATA_NOTE_AR : DATA_NOTE_EN}</p>
        <p>{tr('Current quotes come from Oanor; price history comes from Yahoo Finance.', 'الأسعار الحالية من Oanor، والتاريخ السعري من Yahoo Finance.')}</p>
        <p>{tr('Private classroom demo. No real money is used.', 'عرض تعليمي خاص. لا يُستخدم أي مال حقيقي.')}</p>
      </footer>
    </div>
  );
}

export function DataWarning({ sample, stale, warning, tr }: { sample?: boolean; stale?: boolean; warning?: string | null; tr: JourneyCtx['tr'] }) {
  if (!sample && !stale && !warning) return null;
  return (
    <div className={`jx-warn${sample ? ' jx-warn--sample' : ''}`} role="status" data-testid="alert-data-warning">
      <AlertTriangle size={18} aria-hidden="true" />
      <div>
        {sample && <strong>{tr('Sample data, not live prices. These numbers are illustrative only.', 'بيانات تجريبية وليست أسعارًا حية. الأرقام للتوضيح فقط.')}</strong>}
        {!sample && stale && <strong>{tr('Delayed or out-of-date prices.', 'أسعار متأخرة أو غير محدّثة.')}</strong>}
        {warning && <span>{warning}</span>}
      </div>
    </div>
  );
}

export function ConfirmDialog(props: {
  open: boolean; title: string; body: string; confirmLabel: string; cancelLabel: string;
  pending?: boolean; error?: string | null; onConfirm: () => void; onCancel: () => void; testid: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnRef = useRef<HTMLElement | null>(null);
  const pendingRef = useRef(!!props.pending);
  pendingRef.current = !!props.pending;
  const cancelFnRef = useRef(props.onCancel);
  cancelFnRef.current = props.onCancel;
  useEffect(() => {
    if (!props.open) return;
    returnRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!pendingRef.current) cancelFnRef.current();
        return;
      }
      if (e.key !== 'Tab' || !cardRef.current) return;
      const items = Array.from(cardRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'));
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!cardRef.current.contains(active)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      returnRef.current?.focus();
    };
  }, [props.open]);
  if (!props.open) return null;
  return (
    <div className="jx-modal" role="presentation" data-testid={`dialog-${props.testid}`}>
      <div ref={cardRef} className="jx-modal__card" role="alertdialog" aria-modal="true" aria-labelledby={`${props.testid}-t`} aria-busy={props.pending}>
        <h2 id={`${props.testid}-t`}>{props.title}</h2>
        <p>{props.body}</p>
        {props.error && <p className="jx-field-error" role="alert">{props.error}</p>}
        <div className="jx-modal__actions">
          <button ref={cancelRef} type="button" className="jx-btn jx-btn--ghost" disabled={props.pending} onClick={props.onCancel} data-testid={`button-cancel-${props.testid}`}>{props.cancelLabel}</button>
          <button type="button" className="jx-btn" disabled={props.pending} onClick={props.onConfirm} data-testid={`button-confirm-${props.testid}`}>{props.confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function Sparkline({ points }: { points: { closeKwd: number }[] }) {
  if (points.length < 2) return <span className="jx-spark jx-spark--empty" aria-hidden="true" />;
  const vals = points.map((p) => p.closeKwd);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const d = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / (vals.length - 1)) * 60).toFixed(1)},${(18 - ((v - min) / span) * 16 - 1).toFixed(1)}`).join(' ');
  const up = vals[vals.length - 1] >= vals[0];
  return (
    <svg className={`jx-spark${up ? ' is-up' : ' is-down'}`} viewBox="0 0 60 18" aria-hidden="true">
      <path d={d} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export { stepOrder };
