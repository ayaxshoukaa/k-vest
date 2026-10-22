import { useState } from 'react';

const COMPANY_DOMAINS: Record<string, string> = {
  NBK: 'nbk.com',
  KFH: 'kfh.com',
  ZAIN: 'zain.com',
  BOUBYAN: 'boubyan.com',
  BOURSA: 'boursakuwait.com.kw',
  ARKAN: 'arkan.com.kw',
  ABK: 'abk.com.kw',
  CBK: 'cbk.com',
  KINS: 'kic.com.kw',
};

function getInitials(companyName: string, symbol: string) {
  const words = companyName.trim().split(/\s+/).filter(Boolean);
  const initials = words.length > 1
    ? words.slice(0, 2).map((word) => [...word][0]).join('')
    : [...(words[0] ?? symbol)].slice(0, 2).join('');
  return initials.toLocaleUpperCase() || symbol.slice(0, 2);
}

function getHue(symbol: string) {
  let hash = 0;
  for (const character of symbol) hash = (hash * 31 + character.charCodeAt(0)) % 360;
  return 165 + (hash % 75);
}

export function CompanyLogo({ symbol, companyName }: { symbol: string; companyName: string }) {
  const [failed, setFailed] = useState(false);
  const domain = COMPANY_DOMAINS[symbol.toUpperCase()];
  const source = domain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
    : null;

  if (!source || failed) {
    return (
      <span
        className="jx-company-logo jx-company-logo--fallback"
        style={{ backgroundColor: `hsl(${getHue(symbol)} 54% 34%)` }}
        aria-hidden="true"
        data-testid={`img-company-logo-${symbol}`}
      >
        {getInitials(companyName, symbol)}
      </span>
    );
  }

  return (
    <img
      className="jx-company-logo"
      src={source}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      data-testid={`img-company-logo-${symbol}`}
    />
  );
}
