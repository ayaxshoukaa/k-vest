import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Calculator, Menu, X, ScanSearch, Star, ListChecks, Sparkles, ShieldCheck, Database } from 'lucide-react';
import { ScenarioCalculator } from '@/components/scenario-calculator';

const links = [
  { href: '#calculator', label: 'Calculator' },
  { href: '#platform', label: 'Planned features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#vision', label: 'Our vision' },
];

const modules = [
  { icon: ScanSearch, title: 'Company scanner', text: 'A way to browse Boursa Kuwait companies side by side, in plain language.' },
  { icon: Star, title: 'Beginner ratings', text: 'Simple, explained ratings that show their reasoning rather than just a score.' },
  { icon: ListChecks, title: 'Watchlist', text: 'Keep the companies you are learning about in one place.' },
  { icon: Sparkles, title: 'AI analysis', text: 'Plain-English summaries of company information, built on a licensed data source.' },
];

export default function Home() {
  const [open, setOpen] = useState(false);
  return (
    <div className="kv">
      <header className="kv-nav">
        <div className="kv-nav-in">
          <Link href="/" className="kv-brand" aria-label="K-vest AI home" data-testid="link-home">
            <span className="kv-mark" aria-hidden="true">K</span>
            <span><span className="kv-bname">K-vest AI</span><span className="kv-bcap">Kuwait investing research</span></span>
          </Link>
          <nav className="kv-links" aria-label="Primary">
            {links.map((l) => <a key={l.href} href={l.href} data-testid={`link-nav-${l.href.slice(1)}`}>{l.label}</a>)}
          </nav>
          <a href="#calculator" className="kv-btn kv-nav-cta" data-testid="button-nav-calculator"><span>Try the calculator</span><ArrowRight size={16} /></a>
          <button type="button" className="kv-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)} data-testid="button-menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {open && (
          <nav className="kv-drawer" aria-label="Mobile">
            {links.map((l) => <a key={l.href} href={l.href} onClick={() => setOpen(false)} data-testid={`link-mobile-${l.href.slice(1)}`}>{l.label}</a>)}
          </nav>
        )}
      </header>

      <main>
        <section className="kv-sec kv-hero">
          <div className="kv-glow" style={{ top: '20%', left: -190, width: 380, height: 380, background: 'rgba(255,113,56,.15)' }} />
          <div className="kv-glow" style={{ top: '30%', right: -190, width: 480, height: 480, background: 'rgba(4,94,207,.2)' }} />
          <div className="kv-wrap kv-hero-grid">
            <div className="kv-rise">
              <span className="kv-pill"><span className="kv-dot" aria-hidden="true" />Built step by step | Calculator live</span>
              <h1>Learn to invest in Kuwait.<br /><span className="kv-grad">One clear step at a time.</span></h1>
              <p className="kv-lead">K-vest AI is a research companion for first-time investors in Kuwait. We are building it in stages, starting with a KWD scenario calculator you can use today.</p>
              <div className="kv-ctas">
                <a href="#calculator" className="kv-btn" data-testid="button-hero-calculator"><span>Try the calculator</span><ArrowRight size={18} /></a>
                <a href="#how-it-works" className="kv-btn sec" data-testid="button-hero-how"><Calculator size={18} /><span>How it works</span></a>
              </div>
              <div className="kv-badges">
                <div><b>Available</b><span>KWD scenario calculator</span></div>
                <div><b>Planned</b><span>Scanner, ratings, watchlist</span></div>
                <div><b>Not connected</b><span>Market data provider</span></div>
              </div>
            </div>
            <div className="kv-term kv-rise" style={{ animationDelay: '.15s' }}>
              <div className="kv-term-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="kv-lights" aria-hidden="true"><i /><i /><i /></div>
                  <span className="kv-tag">Research preview</span>
                </div>
                <span className="kv-tag">Market data not connected</span>
              </div>
              <div className="kv-empty">
                <svg className="art" viewBox="0 0 500 140" aria-hidden="true" preserveAspectRatio="none">
                  <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stopColor="#4F8CFF" /><stop offset=".6" stopColor="#FF7138" /><stop offset="1" stopColor="#00E2A0" /></linearGradient></defs>
                  {[25, 60, 95, 130].map((y) => <line key={y} x1="0" x2="500" y1={y} y2={y} stroke="rgba(146,157,183,.12)" strokeDasharray="3 3" />)}
                  <path d="M0 100 Q80 110 140 80 T280 70 T500 40" fill="none" stroke="url(#g)" strokeWidth="2" strokeDasharray="6 7" strokeLinecap="round" opacity=".6" />
                </svg>
                <h3>No market data yet</h3>
                <p>Company prices, charts and analysis will appear here once a licensed data provider is connected. Nothing on this page is a live or simulated quote.</p>
              </div>
              <div className="kv-mini">
                <div><b>Fair value view</b>Planned. Not available yet.</div>
                <div><b>Risk view</b>Planned. Not available yet.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="kv-sec kv-alt" id="calculator">
          <div className="kv-wrap">
            <div className="kv-head">
              <div><span className="kv-eyebrow">Available now</span><h2>KWD scenario calculator</h2></div>
              <p>Explore how a percentage change you choose could affect a KWD amount. These are your assumptions, not predictions.</p>
            </div>
            <ScenarioCalculator />
          </div>
        </section>

        <section className="kv-sec" id="platform">
          <div className="kv-wrap">
            <div className="kv-head">
              <div><span className="kv-eyebrow">Planned MVP features</span><h2>What we are building next.</h2></div>
              <p>None of these are working products yet. They describe where K-vest AI is heading.</p>
            </div>
            <div className="kv-cards">
              {modules.map((m) => (
                <div className="kv-card" key={m.title} data-testid={`card-module-${m.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div>
                    <div className="kv-ico"><m.icon size={26} /></div>
                    <h3>{m.title}</h3>
                    <p>{m.text}</p>
                  </div>
                  <div className="kv-status">STATUS: PLANNED</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="kv-sec kv-alt" id="how-it-works">
          <div className="kv-wrap">
            <div className="kv-head"><div><span className="kv-eyebrow">How it works</span><h2>How the calculator thinks.</h2></div></div>
            <div className="kv-steps">
              <div className="kv-step"><b>01</b><h3>Enter an amount</h3><p>Type a starting amount in Kuwaiti dinars.</p></div>
              <div className="kv-step"><b>02</b><h3>Choose a change</h3><p>Pick an increase and a decrease you want to explore.</p></div>
              <div className="kv-step"><b>03</b><h3>Compare outcomes</h3><p>See the resulting value and change side by side. Real investments can move differently, and you may get back less than you put in.</p></div>
            </div>
          </div>
        </section>

        <section className="kv-sec" id="vision">
          <div className="kv-wrap">
            <div className="kv-head">
              <div><span className="kv-eyebrow">Our vision</span><h2>Clarity before confidence.</h2></div>
              <p>We want beginners in Kuwait to understand what they are looking at before they act on it.</p>
            </div>
            <div className="kv-cards">
              <div className="kv-card"><div><div className="kv-ico"><ShieldCheck size={26} /></div><h3>Educational first</h3><p>Everything here is for learning. It is not financial advice.</p></div></div>
              <div className="kv-card"><div><div className="kv-ico"><Database size={26} /></div><h3>Honest about data</h3><p>We will only show market figures once a licensed provider is connected.</p></div></div>
            </div>
          </div>
        </section>
      </main>

      <footer className="kv-foot">
        <div className="kv-wrap">
          <div><strong>K-vest AI</strong> | Learn at your own pace.</div>
          <p>For educational use only. Not financial advice, ratings, or investment recommendations. Market data is not connected. Fees and taxes are not included in the calculator.</p>
        </div>
      </footer>
    </div>
  );
}
