import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, RefreshCw, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  getGetJourneyStateQueryKey,
  useAnalyzeJourneyCompany,
  getGetMarketScannerQueryKey,
  useGetMarketScanner,
} from '@workspace/api-client-react';
import { DataWarning, JourneyShell, type JourneyCtx } from '@/components/journey/shell';
import { errMsg, friendlyWarning } from '@/lib/journey';

interface Msg { role: 'user' | 'ai'; text: string; sample?: boolean; stale?: boolean; warning?: string | null }

function ResearchBody({ ctx }: { ctx: JourneyCtx }) {
  const { tr, state, isAr } = ctx;
  const queryClient = useQueryClient();
  const scanner = useGetMarketScanner({ query: { queryKey: getGetMarketScannerQueryKey(), retry: false } });
  const analyze = useAnalyzeJourneyCompany();
  const [symbol, setSymbol] = useState(state.watchlistSymbols[0] ?? '');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [failed, setFailed] = useState<{ q: string; message: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const nameOf = (s: string) => scanner.data?.stocks.find((x) => x.symbol === s)?.companyName ?? s;
  const first = tr(
    'Explain this company simply: its strengths, its risks and the outlook.',
    'اشرح هذه الشركة ببساطة: نقاط القوة والمخاطر والتوقعات.',
  );
  const suggestions = [
    tr('What does this company actually do?', 'ما الذي تفعله هذه الشركة فعليًا؟'),
    tr('What are the biggest risks for a beginner?', 'ما أكبر المخاطر لمبتدئ؟'),
    tr('How has the price moved recently, and why might that be?', 'كيف تحرك السعر مؤخرًا ولماذا؟'),
    tr('What should I check before comparing it with another company?', 'ماذا أتحقق منه قبل مقارنتها بشركة أخرى؟'),
  ];

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || !symbol || analyze.isPending) return;
    setFailed(null);
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setDraft('');
    try {
      const res = await analyze.mutateAsync({ data: { symbol, question: q, language: isAr ? 'ar' : 'en' } });
      setMsgs((m) => [...m, { role: 'ai', text: res.analysisText, sample: res.sample, stale: res.stale, warning: res.warning }]);
      await queryClient.invalidateQueries({ queryKey: getGetJourneyStateQueryKey() });
    } catch (e) {
      setFailed({ q, message: errMsg(e, tr('The AI helper could not answer right now.', 'تعذّر على المساعد الإجابة الآن.')) });
    }
    setTimeout(() => endRef.current?.scrollIntoView({ block: 'nearest' }), 50);
  };

  if (!state.watchlistSymbols.length) {
    return (
      <div className="jx-card jx-error" data-testid="status-research-empty">
        <p>{tr('Select at least one company in the scan phase first.', 'اختر شركة واحدة على الأقل في مرحلة الاستكشاف أولًا.')}</p>
        <button type="button" className="jx-btn" onClick={() => ctx.go('scan')} data-testid="button-back-scan">{tr('Back to scan', 'العودة للاستكشاف')}</button>
      </div>
    );
  }

  return (
    <>
      <div className="jx-page-head">
        <span className="jx-eyebrow">{tr('Phase 2 of 4', 'المرحلة 2 من 4')}</span>
        <h1>{tr('Research with the AI helper', 'ابحث مع المساعد الذكي')}</h1>
        <p className="jx-muted">{tr('Pick one of your companies, then ask anything. The AI explains; it never tells you what to buy.', 'اختر إحدى شركاتك ثم اسأل ما تشاء. المساعد يشرح ولا ينصحك بما تشتريه.')}</p>
      </div>
      <section className="jx-card" aria-label={tr('Conversation', 'المحادثة')}>
        <div className="jx-chips" role="group" aria-label={tr('Your companies', 'شركاتك')}>
          {state.watchlistSymbols.map((s) => (
            <button key={s} type="button" className="jx-chip" aria-pressed={s === symbol} onClick={() => setSymbol(s)} data-testid={`button-company-${s}`}>
              {nameOf(s)} <small>({s})</small>
            </button>
          ))}
        </div>
        <div className="jx-btn-row" style={{ marginTop: 14 }}>
          <button type="button" className="jx-btn" disabled={analyze.isPending || !symbol} onClick={() => void ask(first)} data-testid="button-analyze">
            {tr('Analyze', 'حلّل')} {nameOf(symbol)}
          </button>
        </div>
        <div className="jx-chat" aria-live="polite" data-testid="list-chat">
          {msgs.map((m, i) => (
            <div key={i} className={`jx-bubble jx-bubble--${m.role}`} data-testid={`bubble-${m.role}-${i}`}>
              {m.role === 'ai' ? (
                <div className="jx-markdown" dir="auto" lang={isAr ? 'ar' : 'en'} data-testid={`markdown-answer-${i}`}>
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
              ) : m.text}
              {m.role === 'ai' && (m.sample || m.stale || m.warning) && (
                <small>{m.sample ? tr('Based on sample data, not live prices. ', 'مبني على بيانات تجريبية وليست أسعارًا حية. ') : m.stale ? tr('Based on delayed prices. ', 'مبني على أسعار متأخرة. ') : ''}{friendlyWarning(m.warning, isAr ? 'ar' : 'en')}</small>
              )}
            </div>
          ))}
          {analyze.isPending && (
            <div className="jx-bubble jx-bubble--ai" role="status" data-testid="status-typing">
              <span className="jx-typing" aria-hidden="true"><i /><i /><i /></span>
              <span className="jx-sr">{tr('The AI helper is writing', 'المساعد يكتب')}</span>
            </div>
          )}
          <div ref={endRef} />
        </div>
        {failed && (
          <div className="jx-warn" role="alert" data-testid="status-research-error">
            <div><strong>{failed.message}</strong></div>
            <button type="button" className="jx-btn jx-btn--ghost jx-btn--sm" onClick={() => void ask(failed.q)} data-testid="button-retry-analysis">
              <RefreshCw size={14} aria-hidden="true" /> {tr('Retry', 'إعادة')}
            </button>
          </div>
        )}
        <DataWarning sample={false} tr={tr} />
        <p className="jx-muted">{tr('Suggested questions', 'أسئلة مقترحة')}</p>
        <div className="jx-chips" style={{ marginTop: 8 }}>
          {suggestions.map((q, i) => (
            <button key={q} type="button" className="jx-chip" disabled={analyze.isPending} onClick={() => void ask(q)} data-testid={`button-suggestion-${i + 1}`}>{q}</button>
          ))}
        </div>
        <form className="jx-ask" onSubmit={(e) => { e.preventDefault(); void ask(draft); }}>
          <label className="jx-sr" htmlFor="research-q">{tr('Your question', 'سؤالك')}</label>
          <input id="research-q" className="jx-input" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500}
            placeholder={tr('Ask a follow-up question', 'اطرح سؤالًا إضافيًا')} data-testid="input-research-question" />
          <button type="submit" className="jx-btn" disabled={analyze.isPending || !draft.trim()} aria-label={tr('Send', 'إرسال')} data-testid="button-send-question"><Send size={16} aria-hidden="true" className="jx-flip" /></button>
        </form>
      </section>
      <div className="jx-sticky-bar">
        <p className="jx-muted" data-testid="text-research-hint">
          {state.researchCompleted ? tr('Research complete. Ready for practice.', 'اكتمل البحث. جاهز للتدريب.') : tr('Get one analysis to continue.', 'احصل على تحليل واحد للمتابعة.')}
        </p>
        <div>
          {ctx.advanceError && <p className="jx-field-error" role="alert">{ctx.advanceError}</p>}
          <button type="button" className="jx-btn" disabled={!state.researchCompleted || ctx.advancing} onClick={() => void ctx.advance('research', 'practice-intro')} data-testid="button-research-continue">
            {tr('Continue', 'متابعة')} <ArrowRight size={18} aria-hidden="true" className="jx-flip" />
          </button>
        </div>
      </div>
    </>
  );
}

export default function JourneyResearchPage() {
  return <JourneyShell step="research">{(ctx) => <ResearchBody ctx={ctx} />}</JourneyShell>;
}
