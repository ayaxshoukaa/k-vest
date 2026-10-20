import { ArrowRight, BookOpen, Compass, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import { BrandMark } from '@/components/brand-mark';
import './vision.css';

const principles = [
  {
    number: '01',
    icon: BookOpen,
    title: 'Make markets easier to learn',
    description: 'Turn company and market information into clear explanations that help beginners ask better questions.',
  },
  {
    number: '02',
    icon: Compass,
    title: 'Start with Kuwait',
    description: 'Give learners a focused place to explore Kuwait-listed companies and understand the data in context.',
  },
  {
    number: '03',
    icon: ShieldCheck,
    title: 'Practice before real decisions',
    description: 'Use a demo KWD wallet to explore investing scenarios without placing real trades or risking real money.',
  },
];

export default function VisionPage() {
  return (
    <div className="vision-page" data-testid="page-vision">
      <header className="vision-header">
        <Link href="/journey/welcome" className="vision-brand" aria-label="Back to Start learning">
          <BrandMark className="vision-logo" />
        </Link>
        <nav className="vision-nav" aria-label="Main navigation">
          <Link href="/vision" aria-current="page">Our vision</Link>
          <Link href="/journey/welcome" className="vision-nav-cta">
            Start learning <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </nav>
      </header>

      <main className="vision-main">
        <section className="vision-hero">
          <div className="vision-copy">
            <span className="vision-eyebrow"><i aria-hidden="true" /> OUR VISION · BUILT FOR LEARNING</span>
            <h1>Investing should feel <span>understandable.</span></h1>
            <p>
              K-vest AI is here to help people in Kuwait build investing confidence through
              plain-language learning, company research, and practice with demo money.
            </p>
            <Link href="/journey/welcome" className="vision-primary">
              Start learning <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>

          <div className="vision-path" aria-label="K-vest learning approach">
            <div className="vision-path__top">
              <span className="vision-path__lights" aria-hidden="true"><i /><i /><i /></span>
              <span>THE LEARNING PATH</span>
              <span className="vision-path__status"><i aria-hidden="true" /> EDUCATION</span>
            </div>
            <ol>
              <li>
                <span className="vision-path__step">01</span>
                <span className="vision-path__line" aria-hidden="true"><i /></span>
                <span><b>Learn the basics</b><small>Build a clear starting point</small></span>
              </li>
              <li>
                <span className="vision-path__step">02</span>
                <span className="vision-path__line" aria-hidden="true"><i /></span>
                <span><b>Explore companies</b><small>Read market information in context</small></span>
              </li>
              <li>
                <span className="vision-path__step">03</span>
                <span className="vision-path__line" aria-hidden="true"><i /></span>
                <span><b>Practice with demo money</b><small>No real trades or funds</small></span>
              </li>
            </ol>
            <div className="vision-path__note">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>A learning companion, not investment advice.</span>
            </div>
          </div>
        </section>

        <section className="vision-principles" aria-labelledby="vision-principles-title">
          <div className="vision-section-heading">
            <span className="vision-eyebrow">WHAT GUIDES US</span>
            <h2 id="vision-principles-title">A clearer way to get started.</h2>
          </div>
          <div className="vision-principles__grid">
            {principles.map(({ number, icon: Icon, title, description }) => (
              <article className="vision-principle" key={number}>
                <div className="vision-principle__top">
                  <span className="vision-principle__icon"><Icon size={19} aria-hidden="true" /></span>
                  <span className="vision-principle__number">{number}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="vision-footer">
        <span>K-VEST AI <i aria-hidden="true">/</i> LEARN WITH CLARITY</span>
        <p>For educational purposes only. Not financial advice or an investment recommendation.</p>
      </footer>
    </div>
  );
}
