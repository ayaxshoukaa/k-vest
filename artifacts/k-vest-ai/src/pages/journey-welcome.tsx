import { useEffect, useState } from 'react';
import { useAuth, useClerk } from '@clerk/react';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { getGetJourneyStateQueryKey, useGetJourneyState, useStartJourney } from '@workspace/api-client-react';
import { MarketNewsFeed } from '@/components/market-news-feed';
import { stepPath } from '@/lib/journey';
import { BrandMark } from '@/components/brand-mark';
import { useGuestAccess } from '@/components/guest-access';
import './journey-welcome.css';
import './journey-welcome-sections.css';

type Language = 'en' | 'ar';

const languageStorageKey = 'k-vest-journey-language';

const copy = {
  en: {
    languageLabel: 'Choose language',
    switchLabel: 'العربية',
    welcomeEyebrow: 'WELCOME TO K-VEST AI',
    welcomeTitle: 'Learn investing one clear step at a time.',
    welcomeDescription: 'Explore Kuwait-listed companies, understand the basics, and practice with demo money.',
    visionEyebrow: 'OUR VISION',
    visionTitle: 'Make investing easier to understand.',
    visionDescription: 'K-vest AI helps people in Kuwait build investing confidence through clear learning, company research, and safe practice.',
    visionLink: 'Read our vision',
    siteStepsEyebrow: 'HOW K-VEST WORKS',
    siteStepsTitle: 'A simple path from curiosity to practice.',
    newsEyebrow: 'DAILY NEWS',
    newsTitle: 'See what is happening in the markets.',
    newsDescription: 'Broader market headlines from around the world, provided by Yahoo Finance.',
    newsLink: 'View all news',
    learningEyebrow: 'YOUR LEARNING JOURNEY',
    learningTitle: 'Start with the learning steps.',
    learningDescription: 'Move at your own pace. Your practice uses demo money, not real trades.',
    action: 'Start learning',
    starting: 'Starting…',
    weeklySummary: 'View your weekly practice summary',
    error: 'Could not start the journey. Please try again.',
    newsNote: 'Broader global market headlines from Yahoo Finance; these are not Kuwait-specific. For educational use only.',
    signOutError: 'Could not sign out. Please try again.',
    footer: 'For education only. Not financial advice.',
  },
  ar: {
    languageLabel: 'اختر اللغة',
    switchLabel: 'English',
    welcomeEyebrow: 'مرحبًا بك في K-vest AI',
    welcomeTitle: 'تعلّم الاستثمار خطوة واضحة في كل مرة.',
    welcomeDescription: 'استكشف الشركات المدرجة في الكويت، وتعلّم الأساسيات، وتدرّب بأموال افتراضية.',
    visionEyebrow: 'رؤيتنا',
    visionTitle: 'نجعل الاستثمار أسهل للفهم.',
    visionDescription: 'يساعد K-vest AI الناس في الكويت على بناء الثقة الاستثمارية من خلال تعلّم واضح، وبحث الشركات، والتدريب الآمن.',
    visionLink: 'اقرأ رؤيتنا',
    siteStepsEyebrow: 'كيف يعمل K-vest',
    siteStepsTitle: 'مسار بسيط من الفضول إلى التدريب.',
    newsEyebrow: 'الأخبار اليومية',
    newsTitle: 'تابع ما يحدث في الأسواق.',
    newsDescription: 'عناوين أوسع من الأسواق العالمية، مقدمة من Yahoo Finance.',
    newsLink: 'عرض كل الأخبار',
    learningEyebrow: 'رحلتك التعليمية',
    learningTitle: 'ابدأ بخطوات التعلّم.',
    learningDescription: 'تقدّم بالسرعة التي تناسبك. التدريب بأموال افتراضية وليس تداولًا حقيقيًا.',
    action: 'ابدأ التعلّم',
    starting: 'جارٍ البدء…',
    weeklySummary: 'عرض ملخص التدريب الأسبوعي',
    error: 'تعذّر بدء الرحلة. حاول مجددًا.',
    newsNote: 'عناوين من الأسواق العالمية عبر Yahoo Finance، وليست خاصة بالكويت. للاستخدام التثقيفي فقط.',
    signOutError: 'تعذّر تسجيل الخروج. حاول مجددًا.',
    footer: 'للتثقيف فقط. لا يُعد نصيحة مالية.',
  },
} as const;

export default function JourneyWelcomePage() {
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();
  const { guestAccess, leaveGuest } = useGuestAccess();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const journey = useGetJourneyState({
    query: {
      enabled: isSignedIn === true || guestAccess,
      queryKey: getGetJourneyStateQueryKey(),
      retry: false,
    },
  });
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
  const siteSteps = isArabic
    ? [
      { number: '01', title: 'تعلّم الأساسيات', description: 'ابدأ بمفاهيم السوق والشركات بلغة واضحة.' },
      { number: '02', title: 'استكشف الشركات', description: 'افهم بيانات الشركات الكويتية ضمن سياقها.' },
      { number: '03', title: 'تدرّب بأمان', description: 'جرّب سيناريوهات استثمارية بأموال افتراضية.' },
    ]
    : [
      { number: '01', title: 'Learn the basics', description: 'Start with clear explanations of markets and companies.' },
      { number: '02', title: 'Explore companies', description: 'Understand Kuwait company information in context.' },
      { number: '03', title: 'Practice safely', description: 'Try investing scenarios with demo money.' },
    ];
  const learningSteps = isArabic
    ? [
      { number: '01', title: 'استكشف السوق', description: 'تعرّف على شركات الكويت وبيانات السوق.' },
      { number: '02', title: 'ابحث مع الذكاء الاصطناعي', description: 'اطرح أسئلة وتعلّم قراءة معلومات الشركة.' },
      { number: '03', title: 'تدرّب بمحفظة افتراضية', description: 'جرّب الشراء والبيع دون استخدام أموال حقيقية.' },
      { number: '04', title: 'جرّب حاسبة العائد', description: 'افهم كيف تؤثر الافتراضات على النتائج.' },
    ]
    : [
      { number: '01', title: 'Explore the market', description: 'Meet Kuwait-listed companies and market data.' },
      { number: '02', title: 'Research with AI', description: 'Ask questions and learn how to read company information.' },
      { number: '03', title: 'Practice with a demo wallet', description: 'Try buying and selling without real money.' },
      { number: '04', title: 'Try the return calculator', description: 'See how assumptions can change an outcome.' },
    ];

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
            <Link href="/news" className="jwelcome__vision-link" data-testid="link-news-page">
              {isArabic ? 'الأخبار' : 'News'}
            </Link>
            <a href="#learning" className="jwelcome__start-link" data-testid="link-header-start-learning">
              {isArabic ? 'ابدأ التعلّم' : 'Start learning'}
            </a>
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
        </div>
      </header>

      <main className="jwelcome__main jwelcome__main--sections">
        <section className="jwelcome__intro" aria-labelledby="welcome-title">
          <span className="jwelcome__eyebrow">
            <i className="jwelcome__eyebrow-mark" aria-hidden="true" />
            {text.welcomeEyebrow}
          </span>
          <h1 id="welcome-title">{text.welcomeTitle}</h1>
          <p className="jwelcome__description">{text.welcomeDescription}</p>
        </section>

        <section className="jwelcome__welcome-section jwelcome__vision-section" id="vision" aria-labelledby="welcome-vision-title">
          <div>
            <span className="jwelcome__section-eyebrow">{text.visionEyebrow}</span>
            <h2 id="welcome-vision-title">{text.visionTitle}</h2>
            <p>{text.visionDescription}</p>
          </div>
          <Link href="/vision" className="jwelcome__section-link" data-testid="link-read-vision">
            {text.visionLink}<ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>

        <section className="jwelcome__welcome-section" id="steps" aria-labelledby="welcome-steps-title">
          <div className="jwelcome__section-heading">
            <div>
              <span className="jwelcome__section-eyebrow">{text.siteStepsEyebrow}</span>
              <h2 id="welcome-steps-title">{text.siteStepsTitle}</h2>
            </div>
          </div>
          <div className="jwelcome__overview-grid">
            {siteSteps.map((step) => (
              <article className="jwelcome__overview-card" key={step.number} data-testid={`card-site-step-${step.number}`}>
                <span className="jwelcome__overview-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="jwelcome__welcome-section" id="news" aria-labelledby="welcome-news-title">
          <div className="jwelcome__section-heading">
            <div>
              <span className="jwelcome__section-eyebrow">{text.newsEyebrow}</span>
              <h2 id="welcome-news-title">{text.newsTitle}</h2>
              <p>{text.newsDescription}</p>
            </div>
            <Link href="/news" className="jwelcome__section-link" data-testid="link-view-all-news">
              {text.newsLink}<ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <MarketNewsFeed language={language} limit={3} />
          <p className="jwelcome__news-note" data-testid="text-welcome-news-note">{text.newsNote}</p>
        </section>

        <section className="jwelcome__welcome-section jwelcome__learning-section" id="learning" aria-labelledby="welcome-learning-title">
          <div className="jwelcome__section-heading">
            <div>
              <span className="jwelcome__section-eyebrow">{text.learningEyebrow}</span>
              <h2 id="welcome-learning-title">{text.learningTitle}</h2>
              <p>{text.learningDescription}</p>
            </div>
          </div>
          <ol className="jwelcome__learning-grid">
            {learningSteps.map((step) => (
              <li className="jwelcome__learning-card" key={step.number} data-testid={`card-learning-step-${step.number}`}>
                <span className="jwelcome__overview-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
          <div className="jwelcome__action-area">
            <button type="button" className="jwelcome__cta" disabled={start.isPending} onClick={() => start.mutate()} data-testid="link-journey-get-started">
              <span>{start.isPending ? text.starting : text.action}</span>
              <ArrowRight size={19} aria-hidden="true" className="jwelcome__cta-arrow" />
            </button>
            {(journey.data?.furthestStep ?? -1) >= 5 && (
              <Link href="/journey/weekly" className="jwelcome__weekly-link" data-testid="link-welcome-weekly-summary">
                <CalendarDays size={17} aria-hidden="true" />
                <span>{text.weeklySummary}</span>
                <ArrowRight size={16} aria-hidden="true" className="jwelcome__cta-arrow" />
              </Link>
            )}
            {start.isError && <span role="alert" data-testid="text-journey-start-error">{text.error}</span>}
            {signOutError && <span role="alert" data-testid="text-sign-out-error">{text.signOutError}</span>}
          </div>
        </section>
      </main>

      <footer className="jwelcome__footer" data-testid="footer-journey-disclaimer">
        <span className="jwelcome__footer-mark" aria-hidden="true">K</span>
        <p>{text.footer}</p>
      </footer>
    </div>
  );
}
