import { Link } from 'wouter';
import { ArrowRight, Award, CalendarDays, RefreshCw } from 'lucide-react';
import {
  getGetJourneyWeeklySummaryQueryKey,
  useGetJourneyWeeklySummary,
} from '@workspace/api-client-react';
import { JourneyShell, type JourneyCtx } from '@/components/journey/shell';
import { fmtKwd } from '@/lib/journey';
import './journey-weekly-summary.css';

function formatWeekStart(weekStart: string, isAr: boolean) {
  const date = new Date(`${weekStart}T00:00:00+03:00`);
  return new Intl.DateTimeFormat(isAr ? 'ar-KW' : 'en-KW', {
    timeZone: 'Asia/Kuwait',
    dateStyle: 'long',
  }).format(date);
}

function WeeklySummaryBody({ ctx }: { ctx: JourneyCtx }) {
  const { tr, isAr } = ctx;
  const query = useGetJourneyWeeklySummary({
    query: {
      queryKey: getGetJourneyWeeklySummaryQueryKey(),
      retry: false,
    },
  });

  if (query.isLoading) {
    return (
      <div className="jx-card jx-weekly-loading" aria-busy="true" data-testid="status-weekly-loading">
        {tr('Loading your weekly summary…', 'جارٍ تحميل ملخصك الأسبوعي…')}
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="jx-card jx-error" role="alert" data-testid="status-weekly-error">
        <p>{tr('We could not load your weekly summary. Please try again.', 'تعذّر تحميل ملخصك الأسبوعي. حاول مجددًا.')}</p>
        <button type="button" className="jx-btn jx-btn--ghost" onClick={() => void query.refetch()} disabled={query.isFetching} data-testid="button-retry-weekly-summary">
          <RefreshCw size={16} aria-hidden="true" />
          {tr('Try again', 'حاول مجددًا')}
        </button>
      </div>
    );
  }

  const summary = query.data;
  const valueUnavailable = summary.profitLossKwd === null;
  const isPositive = summary.profitLossKwd !== null && summary.profitLossKwd >= 0;
  const challengeComplete = summary.challenge.completed;
  const na = tr('Not available', 'غير متاح');
  const holdings = [
    {
      label: tr('Best holding this week', 'أفضل سهم هذا الأسبوع'),
      value: summary.bestHolding,
      kind: 'best',
    },
    {
      label: tr('Lowest holding this week', 'أقل سهم أداءً هذا الأسبوع'),
      value: summary.worstHolding,
      kind: 'worst',
    },
  ] as const;

  return (
    <div className="jx-weekly" data-testid="page-weekly-summary">
      <div className="jx-page-head">
        <span className="jx-eyebrow">{tr('Your weekly check-in', 'مراجعتك الأسبوعية')}</span>
        <h1>{tr('Your practice portfolio this week', 'محفظة التدريب هذا الأسبوع')}</h1>
        <p className="jx-muted">
          <CalendarDays size={16} aria-hidden="true" />
          {tr('Week of', 'أسبوع يبدأ في')} {formatWeekStart(summary.weekStart, isAr)}
          {' · '}
          {tr('Demo money only', 'مال تجريبي فقط')}
        </p>
      </div>

      {(summary.sampleData || summary.delayedData) && (
        <p className="jx-weekly-data-note" role="status" data-testid="text-weekly-data-note">
          {summary.sampleData
            ? tr('Some prices are examples, so this result is only for practice.', 'بعض الأسعار أمثلة، لذا فالنتيجة للتدريب فقط.')
            : tr('Some prices may be delayed, so your result may not be up to date.', 'قد تتأخر بعض الأسعار، لذلك قد لا تكون النتيجة محدثة.')}
        </p>
      )}

      <div className="jx-weekly-stats jx-stats" data-testid="section-weekly-stats">
        <div className="jx-stat jx-weekly-stat--change">
          <span>{tr('Gain or loss this week', 'الربح أو الخسارة هذا الأسبوع')}</span>
          <b className={valueUnavailable ? '' : isPositive ? 'is-pos' : 'is-neg'} data-testid="text-weekly-change">
            {fmtKwd(summary.profitLossKwd, na)}
          </b>
          <small>
            {valueUnavailable
              ? tr('We need more recent price history to work this out.', 'نحتاج إلى سجل أسعار أحدث لحساب ذلك.')
              : isPositive
                ? tr('Your demo portfolio is up from the start of the week.', 'قيمة محفظتك التجريبية أعلى من بداية الأسبوع.')
                : tr('Your demo portfolio is down from the start of the week.', 'قيمة محفظتك التجريبية أقل من بداية الأسبوع.')}
          </small>
        </div>

        <div className="jx-stat">
          <span>{tr('Practice trades', 'صفقات التدريب')}</span>
          <b data-testid="text-weekly-trade-count">{summary.tradeCount}</b>
          <small>{tr('This week, using demo money.', 'هذا الأسبوع، باستخدام مال تجريبي.')}</small>
        </div>

        {holdings.map(({ label, value, kind }) => (
          <div className="jx-stat" key={kind} data-testid={`section-weekly-${kind}-holding`}>
            <span>{label}</span>
            {value ? (
              <>
                <b className={value.profitLossKwd >= 0 ? 'is-pos' : 'is-neg'}>{value.companyName}</b>
                <small>{fmtKwd(value.profitLossKwd, na)} {tr('this week', 'هذا الأسبوع')}</small>
              </>
            ) : (
              <>
                <b>{na}</b>
                <small>{tr('No current holding to compare yet.', 'لا توجد أسهم حالية للمقارنة بعد.')}</small>
              </>
            )}
          </div>
        ))}
      </div>

      <section className="jx-card jx-weekly-challenge" aria-labelledby="weekly-challenge-title" data-testid="section-weekly-challenge">
        <div className="jx-weekly-challenge__heading">
          <div>
            <span className="jx-eyebrow">{tr('A small goal for this week', 'هدف بسيط لهذا الأسبوع')}</span>
            <h2 id="weekly-challenge-title">{tr('Make one practice trade this week', 'نفّذ صفقة تدريبية واحدة هذا الأسبوع')}</h2>
          </div>
          <span className="jx-weekly-challenge__count" data-testid="text-weekly-challenge-count">
            {summary.challenge.progress}/{summary.challenge.goal}
          </span>
        </div>
        <progress
          className="jx-weekly-progress"
          max={summary.challenge.goal}
          value={summary.challenge.progress}
          aria-label={tr('Weekly challenge progress', 'تقدّم التحدي الأسبوعي')}
          data-testid="progress-weekly-challenge"
        />
        <p className="jx-muted">
          {challengeComplete
            ? tr('You did it. Nice work practicing at your own pace.', 'أحسنت. واصلت التدريب بالسرعة التي تناسبك.')
            : tr('Try a demo trade when you feel ready. There is no real money involved.', 'جرّب صفقة تجريبية عندما تكون مستعدًا. لا يُستخدم مال حقيقي.')}
        </p>
        {challengeComplete && (
          <div className="jx-weekly-badge" role="status" data-testid="badge-weekly-practice">
            <Award size={18} aria-hidden="true" />
            <span>{tr('Badge earned: Practice Starter', 'شارة مكتسبة: بداية التدريب')}</span>
          </div>
        )}
      </section>

      <p className="jx-weekly-disclaimer">
        {tr('Practice results can change with prices. This is an educational demo, not financial advice.', 'قد تتغير نتائج التدريب مع الأسعار. هذا عرض تعليمي وليس نصيحة مالية.')}
      </p>

      <div className="jx-weekly-actions">
        <Link href="/journey/practice" className="jx-btn" data-testid="link-weekly-back-to-practice">
          {tr('Back to practice wallet', 'العودة إلى محفظة التدريب')}
          <ArrowRight size={17} aria-hidden="true" className="jx-flip" />
        </Link>
      </div>
    </div>
  );
}

export default function JourneyWeeklySummaryPage() {
  return <JourneyShell step="practice">{(ctx) => <WeeklySummaryBody ctx={ctx} />}</JourneyShell>;
}
