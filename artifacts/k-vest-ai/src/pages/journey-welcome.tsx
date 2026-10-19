import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { getGetJourneyStateQueryKey, useStartJourney } from '@workspace/api-client-react';
import { stepPath } from '@/lib/journey';
import { BrandMark } from '@/components/brand-mark';
import { JourneyHomeLink } from '@/components/journey/home-link';
import './journey-welcome.css';

type Language = 'en' | 'ar';

const languageStorageKey = 'k-vest-journey-language';

const copy = {
  en: {
    languageLabel: 'Choose language',
    switchLabel: 'العربية',
    action: 'Get started',
    footer: 'For education only. Not financial advice.',
  },
  ar: {
    languageLabel: 'اختر اللغة',
    switchLabel: 'English',
    action: 'ابدأ الآن',
    footer: 'للتثقيف فقط. لا يُعد نصيحة مالية.',
  },
} as const;

export default function JourneyWelcomePage() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const start = useStartJourney({
    mutation: {
      onSuccess: (res) => {
        queryClient.setQueryData(getGetJourneyStateQueryKey(), res);
        setLocation(stepPath(res.currentStep));
      },
    },
  });
  const [language, setLanguage] = useState<Language>(() => {
    try {
      return window.localStorage.getItem(languageStorageKey) === 'ar' ? 'ar' : 'en';
    } catch {
      return 'en';
    }
  });
  const isArabic = language === 'ar';
  const text = copy[language];

  useEffect(() => {
    try {
      window.localStorage.setItem(languageStorageKey, language);
    } catch {
      // The screen remains usable when browser storage is unavailable.
    }
  }, [language]);

  return (
    <div className={`jwelcome${isArabic ? ' jwelcome--rtl' : ''}`} dir={isArabic ? 'rtl' : 'ltr'} lang={language} data-testid="page-journey-welcome">
      <header className="jwelcome__header">
        <Link href="/" className="jwelcome__brand" aria-label={isArabic ? 'العودة إلى الصفحة الرئيسية' : 'K-vest home'} data-testid="link-journey-home">
          <BrandMark className="jwelcome__logo" />
        </Link>
        <div className="jwelcome__language" role="group" aria-label={text.languageLabel} data-testid="control-language">
          <button
            className="jwelcome__language-button"
            type="button"
            onClick={() => setLanguage(isArabic ? 'en' : 'ar')}
            aria-label={isArabic ? 'تغيير اللغة إلى الإنجليزية' : 'Switch language to Arabic'}
            data-testid="button-toggle-language"
          >
            {text.switchLabel}
          </button>
        </div>
      </header>
      <JourneyHomeLink isAr={isArabic} />

      <main className="jwelcome__main" aria-label={text.action}>
        <div className="jwelcome__action-area">
          <button type="button" className="jwelcome__cta" disabled={start.isPending} onClick={() => start.mutate()} data-testid="link-journey-get-started">
            <span>{start.isPending ? (isArabic ? 'جارٍ البدء…' : 'Starting…') : text.action}</span>
            <ArrowRight size={19} aria-hidden="true" className="jwelcome__cta-arrow" />
          </button>
          {start.isError && <span role="alert" data-testid="text-journey-start-error">{isArabic ? 'تعذّر بدء الرحلة. حاول مجددًا.' : 'Could not start the journey. Please try again.'}</span>}
        </div>
      </main>

      <footer className="jwelcome__footer" data-testid="footer-journey-disclaimer">
        <span className="jwelcome__footer-mark" aria-hidden="true">K</span>
        <p>{text.footer}</p>
      </footer>
    </div>
  );
}
