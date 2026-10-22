import { useCallback, useEffect, useState } from 'react';
import type { JourneyStep } from '@workspace/api-client-react';

export type Language = 'en' | 'ar';
export const languageStorageKey = 'k-vest-journey-language';
export const languageChangeEvent = 'k-vest-language-change';

export const stepOrder: JourneyStep[] = [
  'scan-intro', 'scan', 'research-intro', 'research', 'practice-intro', 'practice', 'roi-intro', 'roi', 'finish',
];

export const stepPath = (step: JourneyStep | number) =>
  `/journey/${typeof step === 'number' ? stepOrder[step] : step}`;

export const stepIndex = (step: JourneyStep) => stepOrder.indexOf(step);

/** Phase 0..3 for the four-dot progress; 4 means complete. */
export const phaseOf = (index: number) => Math.min(4, Math.floor(index / 2));

export function readLanguage(): Language {
  try {
    return window.localStorage.getItem(languageStorageKey) === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

export function saveLanguagePreference(language: Language) {
  try {
    window.localStorage.setItem(languageStorageKey, language);
  } catch {
    // The active page still receives the language change when storage is blocked.
  }

  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  window.dispatchEvent(new CustomEvent(languageChangeEvent, { detail: language }));
}

export function useJourneyLanguage() {
  const [language, setLang] = useState<Language>(readLanguage);
  useEffect(() => {
    saveLanguagePreference(language);
  }, [language]);
  const toggle = useCallback(() => setLang((l) => (l === 'ar' ? 'en' : 'ar')), []);
  const tr = useCallback((en: string, ar: string) => (language === 'ar' ? ar : en), [language]);
  return { language, isAr: language === 'ar', toggle, tr };
}

export function fmtKwd(value: number | null | undefined, unavailable = 'Unavailable'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return unavailable;
  return `${value.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KWD`;
}

export function fmtPct(value: number | null | undefined, unavailable = 'Unavailable'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return unavailable;
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function fmtTime(value: string | null | undefined, language: Language = 'en'): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? null
    : new Intl.DateTimeFormat(language === 'ar' ? 'ar-KW' : 'en-KW', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kuwait',
    }).format(d);
}

export function errMsg(error: unknown, fallback: string): string {
  // API/provider details are logged by the React Query caches, never rendered.
  void error;
  return fallback;
}

const loggedWarnings = new Set<string>();

export function friendlyWarning(warning: string | null | undefined, language: Language): string | null {
  if (!warning) return null;
  if (!loggedWarnings.has(warning)) {
    console.warn('[K-vest] Market data warning:', warning);
    loggedWarnings.add(warning);
  }
  return language === 'ar'
    ? 'قد تكون أسعار السوق متأخرة. أعد المحاولة للتحقق من وجود تحديث.'
    : 'Market prices may be delayed. Retry to check for an update.';
}

export const DISCLAIMER_EN = 'For education only. Not financial advice.';
export const DISCLAIMER_AR = 'للتثقيف فقط. لا يُعد نصيحة مالية.';
export const DATA_NOTE_EN = 'Data from Yahoo Finance, delayed, for educational purposes only.';
export const DATA_NOTE_AR = 'البيانات من Yahoo Finance، متأخرة، لأغراض تعليمية فقط.';

/** Watchlist first (in saved order), then any other scanner symbols, no duplicates. */
export function mergeSymbols(preferred: string[], extra: string[]): string[] {
  const out: string[] = [];
  for (const s of [...preferred, ...extra]) if (s && !out.includes(s)) out.push(s);
  return out;
}
