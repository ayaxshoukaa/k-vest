import { useState, type FormEvent } from 'react';
import './SaffronStudy.css';

export function SaffronStudy() {
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(email && password
      ? 'Sign-in is ready to connect to your K-vest account.'
      : 'Enter your email and password to continue.');
  }

  return (
    <div className="ss-auth">
      <header className="ss-header">
        <a className="ss-brand" href="#" onClick={(event) => event.preventDefault()} aria-label="K-vest AI home">
          <span className="ss-brand-mark" aria-hidden="true">kv</span>
          <span className="ss-brand-copy">
            <span className="ss-brand-name">K-vest AI</span>
            <span className="ss-brand-caption">A clearer view</span>
          </span>
        </a>
        <a className="ss-back" href="#" onClick={(event) => event.preventDefault()}>
          <span className="ss-back-arrow" aria-hidden="true">←</span>
          <span>Back to home</span>
        </a>
      </header>

      <main className="ss-main">
        <section className="ss-story" aria-labelledby="ss-story-title">
          <div className="ss-eyebrow"><span className="ss-eyebrow-mark" aria-hidden="true" />A calmer way to get started</div>
          <h1 className="ss-title" id="ss-story-title">Learn at your own pace<span className="ss-title-accent">.</span></h1>
          <p className="ss-intro">Your research companion for understanding investing in Kuwait—one clear, careful step at a time.</p>

          <div className="ss-lesson">
            <div className="ss-lesson-label">A good place to begin</div>
            <h2 className="ss-lesson-title">Small steps. Better questions.</h2>
            <div className="ss-steps" aria-label="A simple learning path">
              <div className="ss-step"><span className="ss-step-number">01</span><span>Start with the basics</span></div>
              <span className="ss-step-line" aria-hidden="true" />
              <div className="ss-step"><span className="ss-step-number">02</span><span>Explore at your pace</span></div>
              <span className="ss-step-line" aria-hidden="true" />
              <div className="ss-step"><span className="ss-step-number">03</span><span>Make sense of what you learn</span></div>
            </div>
          </div>
          <p className="ss-note"><span className="ss-note-mark" aria-hidden="true">i</span><span>Built for learning, not rushing. K-vest AI is an educational research companion, not financial advice.</span></p>
        </section>

        <section className="ss-panel" aria-label="Sign in to K-vest AI">
          <div className="ss-panel-top">
            <span className="ss-portal"><span className="ss-portal-dot" aria-hidden="true" />Your learning space</span>
            <span className="ss-welcome">Welcome back</span>
          </div>
          <h2 className="ss-form-heading">Pick up where you left off.</h2>
          <p className="ss-form-subtitle">Sign in to return to your research and learning journey.</p>
          <form onSubmit={submit}>
            <label className="ss-field">
              <span className="ss-field-label">Email address</span>
              <input className="ss-input" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="ss-field">
              <span className="ss-field-label">Password</span>
              <span className="ss-input-wrap">
                <input className="ss-input ss-input-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} />
                <button className="ss-show-password" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
              </span>
            </label>
            <div className="ss-forgot-row"><button className="ss-forgot" type="button" onClick={() => setFeedback('Password recovery is available through your account support flow.')}>Forgot password?</button></div>
            <button className="ss-submit" type="submit">Sign in</button>
            {feedback && <p className="ss-feedback" role="status">{feedback}</p>}
          </form>
          <div className="ss-guest"><button type="button" onClick={() => setFeedback('Guest learning is ready to begin.')}>Continue as guest</button></div>
          <p className="ss-footer">For education only. Not financial advice.</p>
        </section>
      </main>
    </div>
  );
}

export default SaffronStudy;
