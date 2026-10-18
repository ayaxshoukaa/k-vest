import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export function ScenarioCalculator() {
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
    <div className="kv-calc" aria-label="KWD scenario calculator">
      <div className="panel">
        <div className="panel-kicker">01 / Your inputs</div>
        <h3 className="panel-title">Set your assumptions</h3>

        <div className="field">
          <label className="field-label" htmlFor="budget">
            <span>Starting amount</span><span className="field-hint">How much are you exploring?</span>
          </label>
          <div className="input-wrap">
            <span className="currency-prefix" aria-hidden="true">KWD</span>
            <input className="field-input" id="budget" type="number" inputMode="decimal" min="0.001" step="any" placeholder="e.g. 250" value={budget} onChange={(e) => setBudget(e.target.value)} aria-describedby="budget-error" data-testid="input-budget" />
          </div>
          <p className="field-error" id="budget-error" role="status">{budget.trim() && !budgetValid ? 'Enter an amount greater than zero.' : ''}</p>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="upside">
            <span>Possible increase</span><span className="field-hint">Your chosen upside scenario</span>
          </label>
          <div className="input-wrap">
            <input className="field-input" id="upside" type="number" inputMode="decimal" min="0" step="any" placeholder="Enter a percentage" value={upside} onChange={(e) => setUpside(e.target.value)} aria-describedby="upside-error" data-testid="input-upside" />
            <span className="input-suffix" aria-hidden="true">%</span>
          </div>
          <p className="field-error" id="upside-error" role="status">{upside.trim() && !upsideValid ? 'Enter a percentage of zero or more.' : ''}</p>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="downside">
            <span>Possible decrease</span><span className="field-hint">Your chosen downside scenario</span>
          </label>
          <div className="input-wrap">
            <input className="field-input" id="downside" type="number" inputMode="decimal" min="0" max="100" step="any" placeholder="Enter a percentage" value={downside} onChange={(e) => setDownside(e.target.value)} aria-describedby="downside-error" data-testid="input-downside" />
            <span className="input-suffix" aria-hidden="true">%</span>
          </div>
          <p className="field-error" id="downside-error" role="status">{downside.trim() && !downsideValid ? 'Enter a percentage from 0 to 100.' : ''}</p>
        </div>

        <div className="input-note">
          <span className="note-mark" aria-hidden="true">i</span>
          <span>These are assumptions you choose—not market data. Change any input to explore another possibility.</span>
        </div>
      </div>

      <section className="panel results-panel" aria-labelledby="results-title">
        <div className="panel-kicker">02 / Illustrative scenarios</div>
        <h3 className="panel-title" id="results-title">What could happen</h3>
        <p className="result-intro">Based only on the amount and percentages you entered.</p>
        {renderScenario('up')}
        {renderScenario('down')}
        <div className="results-foot">Illustrative calculations only. Not forecasts, ratings, or investment recommendations. Fees and taxes are excluded.</div>
      </section>
    </div>
  );
}
