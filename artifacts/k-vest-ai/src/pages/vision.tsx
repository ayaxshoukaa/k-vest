import { ArrowRight, BookOpen, Compass, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import { BrandMark } from '@/components/brand-mark';
import { useJourneyLanguage } from '@/lib/journey';
import './vision.css';

const pageCopy = {
  en: {
    back: 'Back to Start learning',
    nav: 'Main navigation',
    vision: 'Our vision',
    start: 'Start learning',
    switch: 'العربية',
    switchLabel: 'Switch language to Arabic',
    eyebrow: 'OUR VISION · BUILT FOR LEARNING',
    titleStart: 'Investing should feel',
    titleEnd: 'understandable.',
    intro: 'K-vest AI is here to help people in Kuwait build investing confidence through plain-language learning, company research, and practice with demo money.',
    pathLabel: 'K-vest learning approach',
    pathTop: 'THE LEARNING PATH',
    pathStatus: 'EDUCATION',
    pathSteps: [
      ['Learn the basics', 'Build a clear starting point'],
      ['Explore companies', 'Read market information in context'],
      ['Practice with demo money', 'No real trades or funds'],
    ],
    pathNote: 'A learning companion, not investment advice.',
    principlesEyebrow: 'WHAT GUIDES US',
    principlesTitle: 'A clearer way to get started.',
    principles: [
      ['Make markets easier to learn', 'Turn company and market information into clear explanations that help beginners ask better questions.'],
      ['Start with Kuwait', 'Give learners a focused place to explore Kuwait-listed companies and understand the data in context.'],
      ['Practice before real decisions', 'Use a demo KWD wallet to explore investing scenarios without placing real trades or risking real money.'],
    ],
    footerBrand: 'K-VEST AI / LEARN WITH CLARITY',
    footer: 'For educational purposes only. Not financial advice or an investment recommendation.',
  },
  ar: {
    back: 'العودة إلى ابدأ التعلّم',
    nav: 'التنقل الرئيسي',
    vision: 'رؤيتنا',
    start: 'ابدأ التعلّم',
    switch: 'English',
    switchLabel: 'التبديل إلى الإنجليزية',
    eyebrow: 'رؤيتنا · تعلّم بثقة',
    titleStart: 'ينبغي أن يصبح الاستثمار',
    titleEnd: 'أسهل فهمًا.',
    intro: 'يساعد K-vest AI الناس في الكويت على بناء الثقة في فهم الاستثمار من خلال تعلّم واضح، وبحث عن الشركات، وتدريب بأموال افتراضية.',
    pathLabel: 'منهج التعلّم في K-vest',
    pathTop: 'مسار التعلّم',
    pathStatus: 'للتثقيف',
    pathSteps: [
      ['تعلّم الأساسيات', 'ابدأ بخطوات واضحة'],
      ['استكشف الشركات', 'افهم معلومات السوق ضمن سياقها'],
      ['تدرّب بأموال افتراضية', 'من دون صفقات أو أموال حقيقية'],
    ],
    pathNote: 'رفيق للتعلّم، وليس نصيحة استثمارية.',
    principlesEyebrow: 'ما يوجّهنا',
    principlesTitle: 'بداية أوضح للتعلّم.',
    principles: [
      ['تعلّم السوق بسهولة', 'نحوّل معلومات الشركات والسوق إلى شروحات واضحة تساعد المبتدئين على طرح أسئلة أفضل.'],
      ['ابدأ من الكويت', 'نوفر مساحة مركّزة لاستكشاف الشركات المدرجة في الكويت وفهم بياناتها ضمن سياقها.'],
      ['تدرّب قبل اتخاذ القرارات', 'استخدم محفظة تدريبية بالدينار الكويتي لاستكشاف سيناريوهات الاستثمار من دون صفقات حقيقية أو مخاطرة بأموال حقيقية.'],
    ],
    footerBrand: 'K-VEST AI / تعلّم بوضوح',
    footer: 'للتثقيف فقط. لا يُعد نصيحة مالية أو توصية استثمارية.',
  },
} as const;

const principleIcons = [BookOpen, Compass, ShieldCheck];

export default function VisionPage() {
  const { language, isAr, toggle } = useJourneyLanguage();
  const text = pageCopy[language];

  return (
    <div className={`vision-page${isAr ? ' vision-page--rtl' : ''}`} dir={isAr ? 'rtl' : 'ltr'} lang={language} data-testid="page-vision">
      <header className="vision-header">
        <Link href="/journey/welcome" className="vision-brand" aria-label={text.back}>
          <BrandMark className="vision-logo" />
        </Link>
        <nav className="vision-nav" aria-label={text.nav}>
          <Link href="/vision" aria-current="page">{text.vision}</Link>
          <Link href="/journey/welcome" className="vision-nav-cta">
            {text.start} <ArrowRight className="vision-directional" size={15} aria-hidden="true" />
          </Link>
          <button type="button" className="vision-language" onClick={toggle} aria-label={text.switchLabel} data-testid="button-vision-language">
            {text.switch}
          </button>
        </nav>
      </header>

      <main className="vision-main">
        <section className="vision-hero">
          <div className="vision-copy">
            <span className="vision-eyebrow"><i aria-hidden="true" /> {text.eyebrow}</span>
            <h1>{text.titleStart} <span>{text.titleEnd}</span></h1>
            <p>{text.intro}</p>
            <Link href="/journey/welcome" className="vision-primary">
              {text.start} <ArrowRight className="vision-directional" size={17} aria-hidden="true" />
            </Link>
          </div>

          <div className="vision-path" aria-label={text.pathLabel}>
            <div className="vision-path__top">
              <span className="vision-path__lights" aria-hidden="true"><i /><i /><i /></span>
              <span>{text.pathTop}</span>
              <span className="vision-path__status"><i aria-hidden="true" /> {text.pathStatus}</span>
            </div>
            <ol>
              {text.pathSteps.map(([title, detail], index) => (
                <li key={title}>
                  <span className="vision-path__step" dir="ltr">0{index + 1}</span>
                  <span className="vision-path__line" aria-hidden="true"><i /></span>
                  <span><b>{title}</b><small>{detail}</small></span>
                </li>
              ))}
            </ol>
            <div className="vision-path__note">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>{text.pathNote}</span>
            </div>
          </div>
        </section>

        <section className="vision-principles" aria-labelledby="vision-principles-title">
          <div className="vision-section-heading">
            <span className="vision-eyebrow">{text.principlesEyebrow}</span>
            <h2 id="vision-principles-title">{text.principlesTitle}</h2>
          </div>
          <div className="vision-principles__grid">
            {text.principles.map(([title, description], index) => {
              const Icon = principleIcons[index];
              return <article className="vision-principle" key={title}>
                <div className="vision-principle__top">
                  <span className="vision-principle__icon"><Icon size={19} aria-hidden="true" /></span>
                  <span className="vision-principle__number" dir="ltr">0{index + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>;
            })}
          </div>
        </section>
      </main>

      <footer className="vision-footer">
        <span>{text.footerBrand}</span>
        <p>{text.footer}</p>
      </footer>
    </div>
  );
}
