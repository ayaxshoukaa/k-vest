import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import './auth-page.css';

type AuthPageProps = {
  mode: 'sign-in' | 'sign-up';
  children: ReactNode;
};

export function AuthPage({ mode, children }: AuthPageProps) {
  const reduceMotion = useReducedMotion();
  const entering = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <div className="kv-auth" data-testid="page-auth">
      <header className="kv-auth__header">
        <Link href="/" className="kv-auth__brand" aria-label="K-vest AI home" data-testid="link-auth-home">
          <span className="kv-auth__mark" aria-hidden="true">K</span>
          <span>
            <span className="kv-auth__brand-name">K-vest AI</span>
            <span className="kv-auth__brand-caption">Kuwait investing research</span>
          </span>
        </Link>
        <Link href="/" className="kv-auth__home-link" data-testid="link-auth-back-home">
          <ArrowLeft className="kv-auth__home-arrow" size={16} aria-hidden="true" />
          <span>Back to home</span>
        </Link>
      </header>

      <main className="kv-auth__main">
        <motion.section className="kv-auth__story" {...entering} aria-labelledby="auth-story-title">
          <div className="kv-auth__eyebrow">
            <span className="kv-auth__eyebrow-mark" aria-hidden="true" />
            A calmer way to get started
          </div>
          <h1 className="kv-auth__title" id="auth-story-title">
            Learn at your own pace<span className="kv-auth__title-accent">.</span>
          </h1>
          <p className="kv-auth__intro">
            Your research companion for understanding investing in Kuwait—one clear, careful step at a time.
          </p>

          <div className="kv-auth__lesson" data-testid="card-auth-learning-path">
            <div className="kv-auth__lesson-label">A good place to begin</div>
            <h2 className="kv-auth__lesson-title">Small steps. Better questions.</h2>
            <div className="kv-auth__steps" aria-label="A simple learning path">
              <div className="kv-auth__step">
                <span className="kv-auth__step-number">01</span>
                <span>Start with the basics</span>
              </div>
              <span className="kv-auth__step-line" aria-hidden="true" />
              <div className="kv-auth__step">
                <span className="kv-auth__step-number">02</span>
                <span>Explore at your pace</span>
              </div>
              <span className="kv-auth__step-line" aria-hidden="true" />
              <div className="kv-auth__step">
                <span className="kv-auth__step-number">03</span>
                <span>Make sense of what you learn</span>
              </div>
            </div>
          </div>
          <p className="kv-auth__gentle-note" data-testid="text-auth-education-note">
            <span className="kv-auth__note-mark" aria-hidden="true">i</span>
            <span>Built for learning, not rushing. K-vest AI is an educational research companion, not financial advice.</span>
          </p>
        </motion.section>

        <motion.section
          className="kv-auth__form-panel"
          {...(reduceMotion ? {} : {
            initial: { opacity: 0, y: 20, scale: 0.99 },
            animate: { opacity: 1, y: 0, scale: 1 },
            transition: { duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] as const },
          })}
          aria-label={mode === 'sign-in' ? 'Sign in to K-vest AI' : 'Create your K-vest AI account'}
          data-testid="panel-auth-form"
        >
          <div className="kv-auth__form-topline">
            <span className="kv-auth__portal-tag">
              <span className="kv-auth__portal-dot" aria-hidden="true" />
              Your learning space
            </span>
            <span className="kv-auth__mode-note">{mode === 'sign-in' ? 'Welcome back' : 'A thoughtful start'}</span>
          </div>
          {children}
          <p className="kv-auth__footer-note">
            <strong>Take it one step at a time.</strong> Your learning journey starts with a question.
          </p>
        </motion.section>
      </main>
    </div>
  );
}

export default AuthPage;
