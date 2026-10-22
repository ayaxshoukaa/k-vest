import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import { BrandMark } from './brand-mark';
import { useGuestAccess } from './guest-access';
import { readLanguage, saveLanguagePreference, type Language } from '@/lib/journey';
import './auth-page.css';

export function AuthEntry({ mode, children }: { mode: 'sign-in' | 'sign-up'; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [language, setLanguage] = useState<Language>(readLanguage);
  const isAr = language === 'ar';
  const { continueAsGuest } = useGuestAccess();
  const [, setLocation] = useLocation();
  useEffect(() => saveLanguagePreference(language), [language]);

  const toggleLanguage = () => {
    const next: Language = isAr ? 'en' : 'ar';
    setLanguage(next);
  };
  const guestAction = (
    <div className="kv-auth__guest-action">
      <button type="button" className="kv-auth__guest-button" data-testid="button-continue-as-guest" onClick={() => {
        continueAsGuest();
        setLocation('/journey/welcome');
      }}>
        {isAr ? 'المتابعة كزائر' : 'Continue as guest'}
      </button>
    </div>
  );
  return (
    <div className="kv-auth kv-auth--entry" dir={isAr ? 'rtl' : 'ltr'} lang={language} data-testid="page-auth">
      <header className="kv-auth__header">
        <Link href="/" className="kv-auth__brand" aria-label={isAr ? 'كي فست للعودة إلى البداية' : 'K-vest AI'} data-testid="link-auth-home">
          <BrandMark className="kv-auth__mark" />
        </Link>
        <button
          type="button"
          className="kv-auth__language-button"
          onClick={toggleLanguage}
          aria-label={isAr ? 'التبديل إلى الإنجليزية' : 'Switch language to Arabic'}
          data-testid="button-auth-language"
        >
          {isAr ? 'English' : 'العربية'}
        </button>
      </header>
      <main className="kv-auth__main kv-auth__main--entry">
        <motion.section
          className="kv-auth__form-panel"
          aria-label={mode === 'sign-in' ? (isAr ? 'تسجيل الدخول' : 'Sign in') : (isAr ? 'إنشاء حساب' : 'Create account')}
          data-testid="panel-auth-form"
          {...(reduceMotion ? {} : {
            initial: { opacity: 0, y: 12 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: .3 },
          })}
        >
          {mode === 'sign-up' && guestAction}
          {children}
          {mode === 'sign-in' && guestAction}
          <p className="kv-auth__footer-note">{isAr ? 'للتثقيف فقط. لا يُعد نصيحة مالية.' : 'For education only. Not financial advice.'}</p>
        </motion.section>
      </main>
    </div>
  );
}
