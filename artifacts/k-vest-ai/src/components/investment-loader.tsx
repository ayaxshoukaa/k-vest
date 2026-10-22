import { useId } from 'react';
import './investment-loader.css';

export type LoaderLanguage = 'en' | 'ar';
export type LoaderMessage = 'prices' | 'journey' | 'company' | 'market' | 'portfolio' | 'summary' | 'ai' | 'headlines';
export type LoaderSize = 'sm' | 'md' | 'lg';
export type SkeletonVariant = 'price' | 'price-large' | 'text' | 'badge' | 'sparkline' | 'circle';

const messages: Record<LoaderLanguage, Record<LoaderMessage, string>> = {
  en: {
    prices: 'Fetching the latest prices…',
    journey: 'Getting your learning journey ready…',
    company: 'Loading company details…',
    market: 'Fetching Kuwait market data…',
    portfolio: 'Loading your practice portfolio…',
    summary: 'Preparing your weekly summary…',
    ai: 'Putting together a clear answer…',
    headlines: 'Fetching the latest market headlines…',
  },
  ar: {
    prices: 'جارٍ جلب أحدث الأسعار…',
    journey: 'جارٍ تجهيز رحلتك التعليمية…',
    company: 'جارٍ تحميل تفاصيل الشركة…',
    market: 'جارٍ جلب بيانات السوق الكويتي…',
    portfolio: 'جارٍ تحميل محفظة التدريب…',
    summary: 'جارٍ إعداد ملخصك الأسبوعي…',
    ai: 'جارٍ إعداد إجابة واضحة…',
    headlines: 'جارٍ جلب أحدث عناوين السوق…',
  },
};

export function InvestmentArrows({ size = 'md', className = '' }: { size?: LoaderSize; className?: string }) {
  const id = useId().replace(/:/g, '');
  const gradientId = `kv-investment-gradient-${id}`;

  return (
    <svg
      className={`kv-investment-arrows kv-investment-arrows--${size}${className ? ` ${className}` : ''}`}
      viewBox="0 0 96 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="14" y1="52" x2="82" y2="15" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset=".52" stopColor="#35D6AE" />
          <stop offset="1" stopColor="#4CD7F6" />
        </linearGradient>
      </defs>
      <path className="kv-investment-arrows__baseline" d="M9 56H87" />
      <g className="kv-investment-arrows__arrow kv-investment-arrows__arrow--one" stroke={`url(#${gradientId})`}>
        <path d="M22 53V39M15 46L22 39L29 46" />
      </g>
      <g className="kv-investment-arrows__arrow kv-investment-arrows__arrow--two" stroke={`url(#${gradientId})`}>
        <path d="M50 53V27M43 34L50 27L57 34" />
      </g>
      <g className="kv-investment-arrows__arrow kv-investment-arrows__arrow--three" stroke={`url(#${gradientId})`}>
        <path d="M78 53V15M71 22L78 15L85 22" />
      </g>
    </svg>
  );
}

export function InvestmentLoader({
  size = 'md',
  language,
  message,
  className = '',
  testId,
}: {
  size?: LoaderSize;
  language: LoaderLanguage;
  message: LoaderMessage;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      className={`kv-investment-loader kv-investment-loader--${size}${className ? ` ${className}` : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      lang={language}
      data-testid={testId}
    >
      <InvestmentArrows size={size} />
      <span className="kv-investment-loader__message">{messages[language][message]}</span>
    </div>
  );
}

export function InvestmentSkeleton({
  variant = 'text',
  className = '',
  label,
}: {
  variant?: SkeletonVariant;
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={`kv-investment-skeleton kv-investment-skeleton--${variant}${className ? ` ${className}` : ''}`}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-busy={label ? true : undefined}
      aria-hidden={label ? undefined : true}
    />
  );
}

export function MarketRowSkeleton() {
  return (
    <div className="kv-market-row-skeleton" aria-hidden="true">
      <InvestmentSkeleton variant="text" className="kv-market-row-skeleton__company" />
      <InvestmentSkeleton variant="price" />
      <InvestmentSkeleton variant="text" className="kv-market-row-skeleton__change" />
      <InvestmentSkeleton variant="sparkline" />
      <InvestmentSkeleton variant="text" className="kv-market-row-skeleton__volume" />
      <InvestmentSkeleton variant="badge" />
      <InvestmentSkeleton variant="circle" />
    </div>
  );
}

export function LearningStockRowSkeleton() {
  return (
    <div className="kv-learning-stock-row-skeleton" aria-hidden="true">
      <InvestmentSkeleton variant="circle" />
      <span className="kv-learning-stock-row-skeleton__copy">
        <InvestmentSkeleton variant="text" />
        <span><InvestmentSkeleton variant="badge" /><InvestmentSkeleton variant="text" /></span>
      </span>
      <InvestmentSkeleton variant="sparkline" />
      <InvestmentSkeleton variant="price" />
    </div>
  );
}

export function WatchlistRowSkeleton() {
  return (
    <div className="kv-watchlist-row-skeleton" aria-hidden="true">
      <span className="kv-watchlist-row-skeleton__company">
        <InvestmentSkeleton variant="circle" />
        <span><InvestmentSkeleton variant="text" /><InvestmentSkeleton variant="text" className="kv-watchlist-row-skeleton__meta" /></span>
      </span>
      <span className="kv-watchlist-row-skeleton__value"><InvestmentSkeleton variant="price" /></span>
      <span className="kv-watchlist-row-skeleton__value"><InvestmentSkeleton variant="text" className="kv-watchlist-row-skeleton__change" /></span>
      <span className="kv-watchlist-row-skeleton__value"><InvestmentSkeleton variant="badge" /></span>
      <span className="kv-watchlist-row-skeleton__value"><InvestmentSkeleton variant="circle" /></span>
    </div>
  );
}
