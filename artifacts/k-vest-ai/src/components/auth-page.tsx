import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { BrandMark } from '@/components/brand-mark';
import './auth-page.css';

const loginIntroStorageKey = 'k-vest-login-intro-seen';

type AuthPageProps = {
  mode: 'sign-in' | 'sign-up';
  children: ReactNode;
};

export function AuthPage({ mode, children }: AuthPageProps) {
  const reduceMotion = useReducedMotion();
  const cursorControls = useAnimationControls();
  const cancelIntroRef = useRef<() => void>(() => {});
  const [showCursor, setShowCursor] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [introClicked, setIntroClicked] = useState(false);
  const entering = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
      };

  const skipIntro = useCallback(() => cancelIntroRef.current(), []);

  useEffect(() => {
    if (mode !== 'sign-in' || reduceMotion) return;

    try {
      if (window.sessionStorage.getItem(loginIntroStorageKey) === 'true') return;
    } catch {
      // The animation can still run when browser storage is unavailable.
    }

    let cancelled = false;
    const markIntroSeen = () => {
      try {
        window.sessionStorage.setItem(loginIntroStorageKey, 'true');
      } catch {
        // Keep the current page usable when browser storage is unavailable.
      }
    };

    const startTimer = window.setTimeout(() => {
      if (cancelled) return;
      const loginButton = document.querySelector<HTMLElement>('.kv-auth__login-button');
      if (!loginButton) return;

      const bounds = loginButton.getBoundingClientRect();
      const startX = Math.max(16, window.innerWidth * 0.12);
      const startY = Math.max(24, window.innerHeight * 0.76);
      const targetX = bounds.left + bounds.width / 2 - 4;
      const targetY = bounds.top + bounds.height / 2 - 3;

      setShowCursor(true);
      setShowSkip(true);
      cursorControls.set({ x: startX, y: startY, opacity: 0 });

      void (async () => {
        await cursorControls.start({ opacity: 1, transition: { duration: 0.16 } });
        if (cancelled) return;

        await cursorControls.start({
          x: targetX,
          y: targetY,
          transition: { duration: 1.05, ease: [0.22, 1, 0.36, 1] },
        });
        if (cancelled) return;

        setIntroClicked(true);
        await new Promise<void>((resolve) => window.setTimeout(resolve, 420));
        if (cancelled) return;

        await cursorControls.start({
          x: targetX + 9,
          y: targetY + 11,
          opacity: 0,
          transition: { duration: 0.22 },
        });
        if (cancelled) return;

        markIntroSeen();
        cancelIntroRef.current = () => {};
        setShowCursor(false);
        setShowSkip(false);
        setIntroClicked(false);
      })();
    }, 180);

    const cancelIntro = () => {
      if (cancelled) return;
      cancelled = true;
      window.clearTimeout(startTimer);
      cursorControls.stop();
      markIntroSeen();
      setShowCursor(false);
      setShowSkip(false);
      setIntroClicked(false);
    };
    cancelIntroRef.current = cancelIntro;

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      cursorControls.stop();
      cancelIntroRef.current = () => {};
    };
  }, [cursorControls, mode, reduceMotion]);

  return (
    <div className={`kv-auth${introClicked ? ' kv-auth--intro-clicked' : ''}`} data-testid="page-auth">
      <header className="kv-auth__header">
        <Link href="/" className="kv-auth__brand" aria-label="K-vest AI home" data-testid="link-auth-home">
          <BrandMark className="kv-auth__mark" />
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
            <div className="kv-auth__topline-actions">
              <span className="kv-auth__mode-note">{mode === 'sign-in' ? 'Welcome back' : 'A thoughtful start'}</span>
              {showSkip && mode === 'sign-in' && (
                <button
                  className="kv-auth__skip-intro"
                  type="button"
                  onClick={skipIntro}
                  data-testid="button-skip-login-animation"
                >
                  Skip animation
                </button>
              )}
            </div>
          </div>
          {children}
          {mode === 'sign-in' && (
            <div className="kv-auth__guest-action">
              <Link href="/journey/welcome" data-testid="link-continue-as-guest">Continue as guest</Link>
            </div>
          )}
          <p className="kv-auth__footer-note">
            For education only. Not financial advice.
          </p>
        </motion.section>
      </main>
      {showCursor && (
        <motion.div className="kv-auth__intro-cursor" animate={cursorControls} aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              d="M3.5 2.5 20 13.4l-7.2 1.2-3.5 6.1L3.5 2.5Z"
              fill="#fff"
              stroke="#0d1225"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <span className="kv-auth__cursor-ripple" />
        </motion.div>
      )}
    </div>
  );
}

export default AuthPage;
