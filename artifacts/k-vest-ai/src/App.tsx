import { type ReactNode } from 'react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { ArrowDownRight, ArrowUpRight, ShieldCheck } from 'lucide-react';
import {
  Route,
  Switch,
  useLocation,
  Link,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Home() {
  const [budget, setBudget] = useState('');
  const [upside, setUpside] = useState('');
  const [downside, setDownside] = useState('');

  const budgetValue = budget.trim() === '' ? null : Number(budget);
  const upsideValue = upside.trim() === '' ? null : Number(upside);
  const downsideValue = downside.trim() === '' ? null : Number(downside);
  const budgetValid = budgetValue !== null && Number.isFinite(budgetValue) && budgetValue > 0;
  const upsideValid = upsideValue !== null && Number.isFinite(upsideValue) && upsideValue >= 0;
  const downsideValid = downsideValue !== null && Number.isFinite(downsideValue) && downsideValue >= 0 && downsideValue <= 100;
  const canCalculate = budgetValid && upsideValid && downsideValid;
  const fmt = (value: number) => new Intl.NumberFormat('en-KW', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);

  const renderScenario = (type: 'up' | 'down') => {
    const isUp = type === 'up';
    const rate = isUp ? upsideValue : downsideValue;
    const active = canCalculate && rate !== null;
    const rawChange = active ? (budgetValue as number) * (rate as number) / 100 * (isUp ? 1 : -1) : null;
    const rawFinalValue = rawChange !== null ? (budgetValue as number) + rawChange : null;
    const calculationValid = rawChange !== null && rawFinalValue !== null && Number.isFinite(rawChange) && Number.isFinite(rawFinalValue);
    const change = calculationValid ? rawChange : null;
    const finalValue = calculationValid ? rawFinalValue : null;
    return (
      <div className={`scenario ${isUp ? 'scenario-up' : 'scenario-down'}`} key={type} data-testid={`scenario-${type}`}>
        <div className="scenario-head">
          <div className="scenario-title">
            <span className="scenario-symbol" aria-hidden="true">
              {isUp ? <ArrowUpRight size={15} strokeWidth={2.2} /> : <ArrowDownRight size={15} strokeWidth={2.2} />}
            </span>
            {isUp ? 'If it rises' : 'If it falls'}
          </div>
          <span className="scenario-rate" data-testid={`text-rate-${type}`}>
            {rate !== null && Number.isFinite(rate) ? `${isUp ? '+' : '−'}${fmt(rate)}%` : '—'}
          </span>
        </div>
        <div className="scenario-values" aria-live="polite">
          <div>
            <div className="value-caption">Illustrative value</div>
            <div className="scenario-total" data-testid={`text-value-${type}`}>
              {finalValue !== null ? <>{fmt(finalValue)} <small>KWD</small></> : <span className="calc-placeholder">{canCalculate ? 'Outside calculation range' : 'Enter assumptions'}</span>}
            </div>
          </div>
          <div>
            <div className="scenario-change" data-testid={`text-change-${type}`}>
              {change !== null ? `${change > 0 ? '+' : change < 0 ? '−' : ''}${fmt(Math.abs(change))} KWD` : '— KWD'}
            </div>
            <div className="scenario-change-label">Illustrative {isUp ? 'gain' : 'loss'}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="K-vest AI home" data-testid="link-home">
          <span className="brand-mark" aria-hidden="true">K</span>
          <span>
            <span className="brand-name">K-vest AI</span>
            <span className="brand-caption">Learn by exploring</span>
          </span>
        </Link>
        <div className="top-note"><span className="top-note-dot" aria-hidden="true" /><span>Made for first-time investors in Kuwait</span></div>
      </header>

      <main className="page-wrap">
        <section className="intro" aria-labelledby="page-title">
          <div className="eyebrow">A simple scenario calculator</div>
          <h1 id="page-title">Your assumptions.<br /><span>Clearer possibilities.</span></h1>
          <p className="intro-copy">
            Explore how a change you choose could affect a KWD amount. No market predictions—just a straightforward way to understand the maths.
          </p>
        </section>

        <section className="workspace" aria-label="KWD scenario calculator">
          <div className="panel input-panel">
            <div className="panel-kicker">01 / Your inputs</div>
            <h2 className="panel-title">Set your assumptions</h2>

            <div className="field">
              <label className="field-label" htmlFor="budget">
                <span>Starting amount</span><span className="field-hint">How much are you exploring?</span>
              </label>
              <div className="input-wrap">
                <span className="currency-prefix" aria-hidden="true">KWD</span>
                <input
                  className="field-input"
                  id="budget"
                  type="number"
                  inputMode="decimal"
                  min="0.001"
                  step="any"
                  placeholder="e.g. 250"
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                  aria-describedby="budget-error"
                  data-testid="input-budget"
                />
              </div>
              <p className="field-error" id="budget-error" role="status">
                {budget.trim() && !budgetValid ? 'Enter an amount greater than zero.' : ''}
              </p>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="upside">
                <span>Possible increase</span><span className="field-hint">Your chosen upside scenario</span>
              </label>
              <div className="input-wrap">
                <input
                  className="field-input"
                  id="upside"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder="Enter a percentage"
                  value={upside}
                  onChange={(event) => setUpside(event.target.value)}
                  aria-describedby="upside-error"
                  data-testid="input-upside"
                />
                <span className="input-suffix" aria-hidden="true">%</span>
              </div>
              <p className="field-error" id="upside-error" role="status">
                {upside.trim() && !upsideValid ? 'Enter a percentage of zero or more.' : ''}
              </p>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="downside">
                <span>Possible decrease</span><span className="field-hint">Your chosen downside scenario</span>
              </label>
              <div className="input-wrap">
                <input
                  className="field-input"
                  id="downside"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="any"
                  placeholder="Enter a percentage"
                  value={downside}
                  onChange={(event) => setDownside(event.target.value)}
                  aria-describedby="downside-error"
                  data-testid="input-downside"
                />
                <span className="input-suffix" aria-hidden="true">%</span>
              </div>
              <p className="field-error" id="downside-error" role="status">
                {downside.trim() && !downsideValid ? 'Enter a percentage from 0 to 100.' : ''}
              </p>
            </div>

            <div className="input-note">
              <span className="note-mark" aria-hidden="true">i</span>
              <span>These are assumptions you choose—not market data. Change any input to explore another possibility.</span>
            </div>
          </div>

          <section className="panel results-panel" aria-labelledby="results-title">
            <div className="panel-kicker">02 / Illustrative scenarios</div>
            <h2 className="panel-title" id="results-title">What could happen</h2>
            <p className="result-intro">Based only on the amount and percentages you entered.</p>
            {renderScenario('up')}
            {renderScenario('down')}
            <div className="results-foot">Illustrative calculations only. Not forecasts, ratings, or investment recommendations. Fees and taxes are excluded.</div>
          </section>
        </section>

        <section className="how-section" aria-labelledby="how-title">
          <div>
            <div className="panel-kicker">A little context</div>
            <h2 className="how-heading" id="how-title">A calculator, not a crystal ball.</h2>
            <p className="how-copy">This tool applies your chosen percentage to your starting amount. Real investments can move differently, and you may get back less than you put in. Use the scenarios to learn how percentages translate into KWD—not to predict a result.</p>
          </div>
          <div className="steps" aria-label="How the calculation works">
            <div className="step"><div className="step-no">01</div><div className="step-text">Enter a starting amount in Kuwaiti dinars.</div></div>
            <div className="step"><div className="step-no">02</div><div className="step-text">Choose an increase and decrease to explore.</div></div>
            <div className="step"><div className="step-no">03</div><div className="step-text">See the resulting value and change side by side.</div></div>
          </div>
        </section>

        <footer className="footer">
          <div><strong>K-vest AI</strong><span> · Learn at your own pace.</span></div>
          <div className="footer-disclaimer"><ShieldCheck size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 5 }} />For educational use only. Not financial advice. Fees and taxes are not included.</div>
        </footer>
      </main>
    </div>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
