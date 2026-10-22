import { CircleHelp, Info, Minus, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import type { MarketScannerStock } from '@workspace/api-client-react';

type Rating = MarketScannerStock['rating'];
export type RatingLanguage = 'en' | 'ar';

const copy: Record<RatingLanguage, {
  labels: Record<Rating, string>;
  reasons: Record<Rating, string>;
  explanationTitle: string;
  explanation: string;
}> = {
  en: {
    labels: {
      Strong: 'Strong',
      Neutral: 'Fair',
      Weak: 'Weak',
      Unavailable: 'Unavailable',
    },
    reasons: {
      Strong: 'Positive monthly price momentum with active trading.',
      Neutral: 'Trading may be below the median, or the monthly trend may be flat.',
      Weak: 'Negative monthly trend; this alone does not mean a weak business.',
      Unavailable: 'Not enough recent price and volume data.',
    },
    explanationTitle: 'What do these ratings mean?',
    explanation: 'This simple learning signal combines one-month price momentum with trading volume compared with the market median. “Fair” is the scanner’s neutral reading, not a grade of the company. These ratings do not measure profits or business quality, predict future returns, or tell you what to buy or sell. They are not financial advice.',
  },
  ar: {
    labels: {
      Strong: 'قوي',
      Neutral: 'متوازن',
      Weak: 'ضعيف',
      Unavailable: 'غير متاح',
    },
    reasons: {
      Strong: 'زخم السعر الشهري إيجابي مع نشاط تداول جيد.',
      Neutral: 'قد يكون التداول أقل من المتوسط أو يكون اتجاه السعر الشهري شبه ثابت.',
      Weak: 'اتجاه السعر الشهري سلبي؛ وهذا وحده لا يعني ضعف الشركة.',
      Unavailable: 'بيانات السعر أو التداول الحديثة غير كافية.',
    },
    explanationTitle: 'ماذا تعني هذه التقييمات؟',
    explanation: 'هذه إشارة تعليمية مبسطة تجمع زخم السعر خلال شهر مع حجم التداول مقارنة بمتوسط السوق. ويعني وصف «متوازن» أن قراءة المؤشر محايدة، وليس تقييمًا للشركة. لا تقيس هذه التقييمات الأرباح أو جودة الشركة، ولا تتنبأ بالعوائد أو تحدد ما ينبغي شراؤه أو بيعه. وهي ليست نصيحة مالية.',
  },
};

const icons = {
  Strong: TrendingUp,
  Neutral: Minus,
  Weak: TrendingDown,
  Unavailable: CircleHelp,
} satisfies Record<Rating, LucideIcon>;

export function RatingPresentation({
  rating,
  language,
}: {
  rating: Rating;
  language: RatingLanguage;
}) {
  const content = copy[language];
  const Icon = icons[rating];

  return (
    <div className="rating-presentation" dir="auto" lang={language} data-testid={`rating-presentation-${rating.toLowerCase()}`}>
      <span className={`rating-presentation__badge rating-presentation__badge--${rating.toLowerCase()}`}>
        <Icon size={14} aria-hidden="true" />
        <span>{content.labels[rating]}</span>
      </span>
      <span className="rating-presentation__reason">{content.reasons[rating]}</span>
    </div>
  );
}

export function RatingInfo({
  language,
  className = '',
}: {
  language: RatingLanguage;
  className?: string;
}) {
  const content = copy[language];

  return (
    <details className={`rating-info ${className}`.trim()} dir="auto" lang={language} data-testid="details-rating-info">
      <summary>
        <Info size={15} aria-hidden="true" />
        <span>{content.explanationTitle}</span>
      </summary>
      <p className="rating-info__body">{content.explanation}</p>
    </details>
  );
}
