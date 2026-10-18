import { useState } from 'react';
import { Link } from 'wouter';
import { getGetMarketQuotesQueryKey, useGetMarketQuotes, type MarketQuote } from '@workspace/api-client-react';
import { ArrowRight, Calculator, Menu, X, ScanSearch, Star, ListChecks, Sparkles, ShieldCheck, Database, RefreshCw, CircleAlert, Clock3 } from 'lucide-react';
import { ScenarioCalculator } from '@/components/scenario-calculator';
import { BrandMark } from '@/components/brand-mark';

const links = [
  { href: '#calculator', label: 'Calculator' },
  { href: '#platform', label: 'Planned features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#vision', label: 'Our vision' },
];

const modules = [
  { icon: ScanSearch, title: 'Company scanner', text: 'A planned way to explore Boursa Kuwait companies side by side, in plain language.' },
  { icon: Star, title: 'Beginner ratings', text: 'Simple, explained ratings that show their reasoning rather than just a score.' },
  { icon: ListChecks, title: 'Watchlist', text: 'Keep the companies you are learning about in one place.' },
  { icon: Sparkles, title: 'AI analysis', text: 'Plain-English summaries of company information, built on a licensed data source.' },
];

function formatKwd(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Unavailable';
  return `${value.toFixed(3)} KWD`;
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Unavailable';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatTime(value: string | null) {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-KW', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kuwait' }).format(date);
}

function QuoteRow({ quote, isStale }: { quote: MarketQuote; isStale: boolean }) {
  const stale = quote.stale || isStale;
  return (
    <tr data-testid={`row-quote-${quote.symbol}`}>
      <td className="quote-company">
        <strong>{quote.symbol}</strong>
        <span className="quote-company-name">{quote.companyName}</span>
        <span className={`quote-mobile-freshness ${stale ? 'is-stale' : ''}`}>
          {stale ? 'Last good · stale' : 'Delayed quote'}
        </span>
      </td>
      <td className="quote-price" data-testid={`text-price-${quote.symbol}`}>{formatKwd(quote.priceKwd)}</td>
      <td className={`quote-change ${quote.changeKwd !== null && quote.changeKwd < 0 ? 'negative' : ''}`} data-testid={`text-change-${quote.symbol}`}>
        {formatKwd(quote.changeKwd)}
        <small>{formatPercent(quote.changePercent)}</small>
      </td>
      <td>
        <span className={`quote-freshness ${stale ? 'is-stale' : ''}`} data-testid={`status-quote-${quote.symbol}`}>
          {stale ? 'Last good · delayed' : 'Delayed'}
        </span>
        <small className="quote-market-time">{formatTime(quote.marketTime)}</small>
      </td>
    </tr>
  );
}

export default function Home() {
  const [open, setOpen] = useState(false);
  const { data: quoteFeed, isLoading, isError, isRefetchError, refetch, isFetching } = useGetMarketQuotes({
    query: { queryKey: getGetMarketQuotesQueryKey(), refetchInterval: 180_000, retry: 0, refetchOnWindowFocus: false },
  });
  const requestFailed = isError || isRefetchError;
  const feedStatus = quoteFeed?.refreshStatus;
  const statusLabel = requestFailed
    ? 'Request error'
    : feedStatus === 'unavailable'
      ? 'Prices unavailable'
      : feedStatus === 'stale'
        ? 'Showing delayed · stale'
        : isLoading
          ? 'Loading quotes'
          : 'Delayed quotes';
  return (
    <div className="kv">
      <header className="kv-nav">
        <div className="kv-nav-in">
          <Link href="/" className="kv-brand" aria-label="K-vest AI home" data-testid="link-home">
            <BrandMark className="kv-mark" />
            <span><span className="kv-bname">K-vest AI</span><span className="kv-bcap">Kuwait investing research</span></span>
          </Link>
          <nav className="kv-links" aria-label="Primary">
            {links.map((l) => <a key={l.href} href={l.href} data-testid={`link-nav-${l.href.slice(1)}`}>{l.label}</a>)}
            <Link href="/sign-in" data-testid="link-nav-sign-in">Sign in</Link>
          </nav>
          <a href="#calculator" className="kv-btn kv-nav-cta" data-testid="button-nav-calculator"><span>Try the calculator</span><ArrowRight size={16} /></a>
          <button type="button" className="kv-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)} data-testid="button-menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {open && (
          <nav className="kv-drawer" aria-label="Mobile">
            {links.map((l) => <a key={l.href} href={l.href} onClick={() => setOpen(false)} data-testid={`link-mobile-${l.href.slice(1)}`}>{l.label}</a>)}
              <Link href="/sign-in" onClick={() => setOpen(false)} data-testid="link-mobile-sign-in">Sign in</Link>
          </nav>
        )}
      </header>

      <main>
        <section className="kv-sec kv-hero">
          <div className="kv-glow" style={{ top: '20%', left: -190, width: 380, height: 380, background: 'rgba(255,113,56,.15)' }} />
          <div className="kv-glow" style={{ top: '30%', right: -190, width: 480, height: 480, background: 'rgba(4,94,207,.2)' }} />
          <div className="kv-wrap kv-hero-grid">
            <div className="kv-rise">
              <span className="kv-pill"><span className="kv-dot" aria-hidden="true" />Research preview | Calculator live</span>
              <h1>Learn to invest in Kuwait.<br /><span className="kv-grad">One clear step at a time.</span></h1>
              <p className="kv-lead">K-vest AI is a learning-focused research companion for first-time investors in Kuwait. Explore delayed company quotes and try a KWD scenario calculator built for learning.</p>
              <div className="kv-ctas">
                <a href="#calculator" className="kv-btn" data-testid="button-hero-calculator"><span>Try the calculator</span><ArrowRight size={18} /></a>
                <a href="#how-it-works" className="kv-btn sec" data-testid="button-hero-how"><Calculator size={18} /><span>How it works</span></a>
              </div>
              <div className="kv-badges">
                <div><b>Available</b><span>KWD scenario calculator</span></div>
                <div><b>Preview</b><span>Delayed .KW quote feed</span></div>
                <div><b>Learning focus</b><span>Plain-language investing research</span></div>
              </div>
            </div>
            <div className="kv-term kv-rise" style={{ animationDelay: '.15s' }}>
              <div className="kv-term-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="kv-lights" aria-hidden="true"><i /><i /><i /></div>
                  <span className="kv-tag">Research preview</span>
                </div>
                  <span className={`kv-tag quote-status-tag ${requestFailed || feedStatus === 'unavailable' ? 'status-warning' : feedStatus === 'stale' ? 'status-stale' : ''}`} data-testid="status-quote-feed">
                    {statusLabel}
                  </span>
              </div>
              <div className="kv-quotes" aria-live="polite">
                <div className="quote-summary">
                  <div>
                    <span className="quote-label">Kuwait market · research preview</span>
                    <strong data-testid="text-quote-count">
                      {quoteFeed ? `${quoteFeed.quotes.length} verified .KW companies` : '11 verified .KW companies'}
                    </strong>
                  </div>
                  <div className="quote-updated" data-testid="text-last-updated">
                    <Clock3 size={14} aria-hidden="true" />
                    <span>{quoteFeed?.lastUpdatedAt ? `Updated ${formatTime(quoteFeed.lastUpdatedAt)}` : 'Waiting for first update'}</span>
                  </div>
                </div>
                {requestFailed && (
                  <div className="quote-alert" role="alert" data-testid="alert-quote-error">
                    <CircleAlert size={17} aria-hidden="true" />
                    <span>Could not refresh quotes. {quoteFeed ? 'Showing the last good values, marked as stale.' : 'Prices are unavailable until a request succeeds.'}</span>
                    <button type="button" className="quote-retry" onClick={() => void refetch()} disabled={isFetching} data-testid="button-retry-quotes">
                      <RefreshCw size={14} className={isFetching ? 'is-rotating' : ''} aria-hidden="true" />
                      {isFetching ? 'Retrying' : 'Retry'}
                    </button>
                  </div>
                )}
                {feedStatus === 'unavailable' && !requestFailed && (
                  <p className="quote-unavailable" data-testid="status-prices-unavailable">Prices are unavailable right now. No replacement or estimated prices are shown.</p>
                )}
                {isLoading ? (
                  <div className="quote-skeleton" role="status" aria-label="Loading delayed company quotes" data-testid="loading-quotes">
                    {[0, 1, 2, 3].map((row) => <div className="quote-skeleton-row" key={row}><i /><i /><i /><i /></div>)}
                  </div>
                ) : quoteFeed?.quotes.length ? (
                  <div className="quote-table-wrap">
                    <table className="quote-table">
                      <thead><tr><th scope="col">Company</th><th scope="col">Price</th><th scope="col">Change</th><th scope="col">Feed</th></tr></thead>
                      <tbody>{quoteFeed.quotes.map((quote) => <QuoteRow key={quote.symbol} quote={quote} isStale={requestFailed} />)}</tbody>
                    </table>
                  </div>
                ) : !requestFailed && (
                  <div className="quote-empty" data-testid="empty-quotes">
                    <h3>Prices unavailable</h3>
                    <p>The quote feed has no prices to display yet. We will not substitute estimated numbers.</p>
                  </div>
                )}
                <p className="quote-disclosure" data-testid="text-quote-disclosure">Data from Yahoo Finance, delayed, for educational purposes only.</p>
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
              <p>The quote feed is a research preview. Scanner, ratings, and watchlist remain planned learning features.</p>
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
              <div className="kv-card"><div><div className="kv-ico"><Database size={26} /></div><h3>Honest about data</h3><p>Quote values are delayed, may be unavailable, and are clearly marked when the last good value is stale.</p></div></div>
            </div>
          </div>
        </section>
      </main>

      <footer className="kv-foot">
        <div className="kv-wrap">
          <div><strong>K-vest AI</strong> | Learn at your own pace.</div>
          <p>Data from Yahoo Finance, delayed, for educational purposes only. Not financial advice or investment recommendations. Fees and taxes are not included in the calculator.</p>
        </div>
      </footer>
    </div>
  );
}
