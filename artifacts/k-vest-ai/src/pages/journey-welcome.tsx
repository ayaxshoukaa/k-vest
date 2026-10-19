import { useEffect, useState } from 'react';
import { useUser } from '@clerk/react';
import { ArrowRight, BookOpen, ChartNoAxesCombined, Search, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { getGetJourneyStateQueryKey, useStartJourney } from '@workspace/api-client-react';
import { stepPath } from '@/lib/journey';
import { BrandMark } from '@/components/brand-mark';
import './journey-welcome.css';

type Language = 'en' | 'ar';

const languageStorageKey = 'k-vest-journey-language';

const copy = {
  en: {
    languageLabel: 'Choose language',
    switchLabel: 'العربية',
    welcome: (name: string | undefined) => name ? `Welcome, ${name}` : 'Welcome to your learning journey',
    headline: 'Learn to invest in Kuwait, step by step.',
    intro: 'A calm place to build understanding, ask better questions, and move at your own pace.',
    pathLabel: 'Your learning path',
    steps: [
      { title: 'Scan', description: 'See what is happening across the Kuwait market.', icon: Search },
      { title: 'Research', description: 'Look closer and learn what the numbers can tell you.', icon: BookOpen },
      { title: 'Practice', description: 'Explore ideas in a thoughtful, low-pressure way.', icon: ShieldCheck },
      { title: 'ROI', description: 'Understand how returns are measured over time.', icon: ChartNoAxesCombined },
    ],
    action: 'Get started',
    footer: 'For education only. Not financial advice.',
  },
  ar: {
    languageLabel: 'اختر اللغة',
    switchLabel: 'English',
    welcome: (name: string | undefined) => name ? `أهلاً ${name}` : 'أهلاً بك في رحلتك التعليمية',
    headline: 'تعلّم الاستثمار في الكويت، خطوة بخطوة.',
    intro: 'مساحة هادئة لبناء فهمك، وطرح أسئلة أفضل، والتعلّم بالوتيرة التي تناسبك.',
    pathLabel: 'مسارك التعليمي',
    steps: [
      { title: 'استكشف', description: 'تعرّف على ما يحدث في سوق الكويت.', icon: Search },
      { title: 'ابحث', description: 'تعمّق وتعلّم ما الذي تخبرك به الأرقام.', icon: BookOpen },
      { title: 'تدرّب', description: 'استكشف الأفكار بهدوء ومن دون ضغط.', icon: ShieldCheck },
      { title: 'العائد على الاستثمار', description: 'افهم كيف تُقاس العوائد مع مرور الوقت.', icon: ChartNoAxesCombined },
    ],
    action: 'ابدأ الآن',
    footer: 'للتثقيف فقط. لا يُعد نصيحة مالية.',
  },
} as const;

export default function JourneyWelcomePage() {
  const { user } = useUser();
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
          <span className="jwelcome__language-caption">{text.languageLabel}</span>
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

      <main className="jwelcome__main">
        <section className="jwelcome__intro" aria-labelledby="journey-welcome-title">
          <div className="jwelcome__eyebrow" data-testid="text-journey-greeting">
            <span className="jwelcome__eyebrow-mark" aria-hidden="true" />
            {text.welcome(user?.firstName ?? undefined)}
          </div>
          <h1 id="journey-welcome-title" data-testid="text-journey-headline">{text.headline}</h1>
          <p className="jwelcome__description" data-testid="text-journey-intro">{text.intro}</p>
        </section>

        <section className="jwelcome__path" aria-labelledby="journey-path-title" data-testid="section-journey-steps">
          <div className="jwelcome__path-heading">
            <span className="jwelcome__path-overline">{isArabic ? 'أربع محطات واضحة' : 'Four clear milestones'}</span>
            <h2 id="journey-path-title">{text.pathLabel}</h2>
          </div>
          <ol className="jwelcome__steps">
            {text.steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li className="jwelcome__step" key={step.title} data-testid={`card-journey-step-${index + 1}`}>
                  <span className="jwelcome__step-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <span className="jwelcome__step-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.8} /></span>
                  <div className="jwelcome__step-copy">
                    <h3 data-testid={`text-journey-step-title-${index + 1}`}>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="jwelcome__action-area">
          <button type="button" className="jwelcome__cta" disabled={start.isPending} onClick={() => start.mutate()} data-testid="link-journey-get-started">
            <span>{start.isPending ? (isArabic ? 'جارٍ البدء…' : 'Starting…') : text.action}</span>
            <ArrowRight size={19} aria-hidden="true" className="jwelcome__cta-arrow" />
          </button>
          {start.isError && <span role="alert" data-testid="text-journey-start-error">{isArabic ? 'تعذّر بدء الرحلة. حاول مجددًا.' : 'Could not start the journey. Please try again.'}</span>}
          <span className="jwelcome__gentle-note" data-testid="text-journey-gentle-note">
            {isArabic ? 'ابدأ بالاستكشاف، وتعلّم على مهل.' : 'Start by exploring. There is no rush.'}
          </span>
        </div>
      </main>

      <footer className="jwelcome__footer" data-testid="footer-journey-disclaimer">
        <span className="jwelcome__footer-mark" aria-hidden="true">K</span>
        <p>{text.footer}</p>
      </footer>
    </div>
  );
}
