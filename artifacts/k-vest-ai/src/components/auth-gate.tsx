import type { ReactNode } from 'react';
import { useAuth } from '@clerk/react';
import { Redirect, useLocation } from 'wouter';
import { InvestmentLoader } from '@/components/investment-loader';
import { readLanguage } from '@/lib/journey';
import { useGuestAccess } from './guest-access';

export function AuthLoading() {
  const language = readLanguage();
  return (
    <main className="kv-auth" data-testid="status-auth-loading">
      <InvestmentLoader size="lg" language={language} message="journey" className="kv-auth-loading" />
    </main>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { guestAccess } = useGuestAccess();
  const [location] = useLocation();
  if (!isLoaded) return <AuthLoading />;

  const isAuthPage = ['/sign-in', '/sign-up'].some(path => location === path || location.startsWith(`${path}/`));
  if (!isSignedIn && !guestAccess && !isAuthPage) return <Redirect to="/sign-in" />;
  if (isSignedIn && isAuthPage) return <Redirect to="/journey/welcome" />;
  return children;
}
