import { useEffect, useState } from 'react';
import { useAuth, useClerk } from '@clerk/react';
import { ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { getGetJourneyStateQueryKey, useStartJourney } from '@workspace/api-client-react';
import { stepPath } from '@/lib/journey';
import { BrandMark } from '@/components/brand-mark';
import { useGuestAccess } from '@/components/guest-access';
import './journey-welcome.css';

type Language = 'en' | 'ar';

const languageStorageKey = 'k-vest-journey-language';

const copy = {
  en: {
    languageLabel: 'Choose language',
    switchLabel: 'العربية',
    action: 'Start learning',
    footer: 'For education only. Not financial advice.',
  },
  ar: {
    languageLabel: 'اختر اللغة',
    switchLabel: 'English',
    action: 'ابدأ التعلّم',
    footer: 'للتثقيف فقط. لا يُعد نصيحة مالية.',
  },
} as const;

export default function JourneyWelcomePage() {
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();
  const { leaveGuest } = useGuestAccess();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
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

  const leaveAccount = async () => {
    setSigningOut(true);
    setSignOutError(false);
    try {
      await signOut({ redirectUrl: `${import.meta.env.BASE_URL}sign-in` });
    } catch {
      setSigningOut(false);
      setSignOutError(true);
    }
  };

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
          <div className="jwelcome__header-actions">
            <Link href="/vision" className="jwelcome__vision-link" data-testid="link-vision-page">
              {isArabic ? 'رؤيتنا' : 'Our vision'}
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
          {isSignedIn ? (
            <button type="button" className="jwelcome__language-button" disabled={signingOut} onClick={() => void leaveAccount()} data-testid="button-sign-out">
              {signingOut ? (isArabic ? 'جارٍ الخروج…' : 'Signing out…') : (isArabic ? 'تسجيل الخروج' : 'Sign out')}
            </button>
          ) : (
            <button type="button" className="jwelcome__language-button" onClick={() => {
              leaveGuest();
              setLocation('/sign-in');
            }} data-testid="button-guest-sign-in">
              {isArabic ? 'تسجيل الدخول' : 'Sign in'}
            </button>
          )}
        </div>
      </header>

      <main className="jwelcome__main" aria-label={text.action}>
        <div className="jwelcome__action-area">
          <button type="button" className="jwelcome__cta" disabled={start.isPending} onClick={() => start.mutate()} data-testid="link-journey-get-started">
            <span>{start.isPending ? (isArabic ? 'جارٍ البدء…' : 'Starting…') : text.action}</span>
            <ArrowRight size={19} aria-hidden="true" className="jwelcome__cta-arrow" />
          </button>
          {start.isError && <span role="alert" data-testid="text-journey-start-error">{isArabic ? 'تعذّر بدء الرحلة. حاول مجددًا.' : 'Could not start the journey. Please try again.'}</span>}
          {signOutError && <span role="alert" data-testid="text-sign-out-error">{isArabic ? 'تعذّر تسجيل الخروج. حاول مجددًا.' : 'Could not sign out. Please try again.'}</span>}
        </div>
      </main>

      <footer className="jwelcome__footer" data-testid="footer-journey-disclaimer">
        <span className="jwelcome__footer-mark" aria-hidden="true">K</span>
        <p>{text.footer}</p>
      </footer>
    </div>
  );
}
