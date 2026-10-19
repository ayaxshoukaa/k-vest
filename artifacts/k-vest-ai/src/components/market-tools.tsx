import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { Moon, Sun } from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import type { MarketScannerStock } from '@workspace/api-client-react';

const WATCHLIST_KEY = 'k-vest-ai-watchlist-v1';
const THEME_KEY = 'k-vest-ai-market-theme-v1';

export function useSavedSymbols() {
  const [symbols, setSymbols] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(WATCHLIST_KEY);
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed)) setSymbols(parsed.filter((value): value is string => typeof value === 'string'));
    } catch {
      setSymbols([]);
    }
  }, []);

  function toggle(symbol: string) {
    setSymbols((current) => {
      const next = current.includes(symbol)
        ? current.filter((item) => item !== symbol)
        : [...current, symbol];
      try {
        window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      } catch {
        // Keep the current page usable if browser storage is unavailable.
      }
      return next;
    });
  }

  function remove(symbol: string) {
    setSymbols((current) => {
      const next = current.filter((item) => item !== symbol);
      try {
        window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      } catch {
        // Keep the current page usable if browser storage is unavailable.
      }
      return next;
    });
  }

  return { symbols, toggle, remove };
}

export function MarketFrame({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      return window.localStorage.getItem(THEME_KEY) !== 'light';
    } catch {
      return true;
    }
  });

  function toggleTheme() {
    setIsDark((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      } catch {
        // The page remains usable when browser storage is unavailable.
      }
      return next;
    });
  }

  return (
    <div className={`kv kv-market ${isDark ? '' : 'market-light'}`}>
      <header className="market-nav">
        <div className="market-nav-inner">
          <Link href="/" className="kv-brand" aria-label="K-vest AI home" data-testid="link-market-home">
            <BrandMark className="kv-mark" />
          </Link>
          <nav className="market-nav-links" aria-label="Market research">
            <Link href="/scanner" data-testid="link-market-scanner">Scanner</Link>
            <Link href="/watchlist" data-testid="link-market-watchlist">Watchlist</Link>
            <button type="button" className="market-theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`} data-testid="button-market-theme">
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
              <span>{isDark ? 'Light' : 'Dark'}</span>
            </button>
          </nav>
        </div>
      </header>
      <main className="market-main">{children}</main>
      <footer className="market-foot">
        <div className="market-foot-inner">
          <span>K-vest AI · Learn at your own pace.</span>
          <p>Market data from Oanor and Yahoo Finance may be delayed. This research companion is for education only, not financial advice or investment recommendations.</p>
        </div>
      </footer>
    </div>
  );
}

export function SourceBadges() {
  return (
    <div className="market-sources" aria-label="Data sources">
      <span className="market-source-label">Sources</span>
      <span className="market-source">App DB</span>
      <span className="market-source">Oanor API</span>
      <span className="market-source">Yahoo Finance</span>
    </div>
  );
}

export function LearningDisclosure() {
  return (
    <p className="market-disclosure" data-testid="text-market-disclosure">
      Yahoo Finance history and Oanor market data are delayed and shown for educational purposes only. Learning signals are not recommendations or financial advice.
    </p>
  );
}

export function formatKwd(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Unavailable';
  return `${value.toFixed(3)} KWD`;
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Unavailable';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function formatMarketTime(value: string | null | undefined) {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-KW', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kuwait',
  }).format(date);
}

export function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const content = [headers.map(csvCell).join(','), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function stockCsvRow(stock: MarketScannerStock) {
  return {
    Symbol: stock.symbol,
    Company: stock.companyName,
    Sector: stock.sector ?? '',
    'Price (KWD)': stock.priceKwd,
    'Daily change (KWD)': stock.changeKwd,
    'Daily change (%)': stock.changePercent,
    Volume: stock.volume,
    'Learning signal': stock.rating,
    'Momentum (%)': stock.momentumPercent,
    'Market time': stock.marketTime ?? '',
    Stale: stock.stale,
    Sample: stock.sample,
  };
}
