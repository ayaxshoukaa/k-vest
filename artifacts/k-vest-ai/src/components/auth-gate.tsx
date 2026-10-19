import type { ReactNode } from 'react';
import { useAuth } from '@clerk/react';
import { Redirect, useLocation } from 'wouter';
import { useGuestAccess } from './guest-access';

export function AuthLoading() {
  return (
    <main className="kv-auth" aria-busy="true" aria-live="polite" data-testid="status-auth-loading">
      <span className="jx-sr">Loading…</span>
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
