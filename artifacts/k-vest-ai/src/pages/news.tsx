import { ArrowLeft, ArrowRight, Newspaper } from "lucide-react";
import { Link } from "wouter";
import { BrandMark } from "@/components/brand-mark";
import { MarketNewsFeed } from "@/components/market-news-feed";
import { useJourneyLanguage } from "@/lib/journey";
import "./news.css";

const newsCopy = {
  en: {
    vision: "Our vision",
    back: "Back to start",
    eyebrow: "DAILY MARKET NEWS",
    title: "Headlines, with context.",
    description: "Explore broader headlines about global markets and finance. These stories are not Kuwait-specific; open each one at its original publisher.",
    note: "Broader global market headlines from Yahoo Finance. Educational use only; market information may be delayed.",
    footer: "For educational purposes only. Not financial advice or an investment recommendation.",
    switch: "العربية",
    switchLabel: "Switch language to Arabic",
  },
  ar: {
    vision: "رؤيتنا",
    back: "العودة إلى البداية",
    eyebrow: "أخبار السوق اليومية",
    title: "أخبار السوق في سياقها.",
    description: "اطّلع على عناوين أوسع عن الأسواق والتمويل عالميًا. هذه الأخبار ليست خاصة بالكويت؛ افتح كل خبر من مصدره الأصلي.",
    note: "عناوين أوسع عن الأسواق العالمية من Yahoo Finance. للاستخدام التثقيفي فقط؛ قد تتأخر معلومات السوق.",
    footer: "للتثقيف فقط. لا يُعد نصيحة مالية أو توصية استثمارية.",
    switch: "English",
    switchLabel: "التبديل إلى الإنجليزية",
  },
} as const;

export default function NewsPage() {
  const { language, isAr, toggle } = useJourneyLanguage();
  const text = newsCopy[language];

  return (
    <div className={`jwelcome market-news-page${isAr ? " jwelcome--rtl" : ""}`} dir={isAr ? "rtl" : "ltr"} lang={language} data-testid="page-market-news">
      <header className="jwelcome__header market-news-page__header">
        <Link href="/journey/welcome" className="jwelcome__brand" aria-label={text.back} data-testid="link-news-brand">
          <BrandMark className="jwelcome__logo" />
        </Link>
        <nav className="market-news-page__nav" aria-label={language === "ar" ? "التنقل الرئيسي" : "Main navigation"}>
          <Link href="/vision" className="jwelcome__vision-link" data-testid="link-news-vision">{text.vision}</Link>
          <Link href="/journey/welcome" className="market-news-page__back" aria-label={text.back} data-testid="link-news-welcome">
            {language === "ar" ? <ArrowRight size={15} aria-hidden="true" /> : <ArrowLeft size={15} aria-hidden="true" />}
            {text.back}
          </Link>
          <button type="button" className="market-news-page__language" onClick={toggle} aria-label={text.switchLabel} data-testid="button-news-language">
            {text.switch}
          </button>
        </nav>
      </header>

      <main className="market-news-page__main">
        <section className="market-news-page__intro">
          <span className="market-news-page__eyebrow"><Newspaper size={15} aria-hidden="true" />{text.eyebrow}</span>
          <h1>{text.title}</h1>
          <p>{text.description}</p>
        </section>

        <MarketNewsFeed language={language} />

        <p className="market-news-page__note" data-testid="text-market-news-disclaimer">{text.note}</p>
      </main>

      <footer className="jwelcome__footer" data-testid="footer-news-disclaimer">
        <span className="jwelcome__footer-mark" aria-hidden="true">K</span>
        <p>{text.footer}</p>
      </footer>
    </div>
  );
}
