import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';

const storageKey = 'kvest-guest-access';
const GuestAccessContext = createContext<{
  guestAccess: boolean;
  continueAsGuest: () => void;
  leaveGuest: () => void;
} | null>(null);

export function GuestAccessProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [guestAccess, setGuestAccess] = useState(() => {
    try { return window.sessionStorage.getItem(storageKey) === 'true'; }
    catch { return false; }
  });
  const changeGuestAccess = useCallback((enabled: boolean) => {
    queryClient.clear();
    setGuestAccess(enabled);
    try {
      if (enabled) window.sessionStorage.setItem(storageKey, 'true');
      else window.sessionStorage.removeItem(storageKey);
    } catch {
      // The current tab still works when session storage is unavailable.
    }
  }, [queryClient]);

  useEffect(() => {
    if (isSignedIn && guestAccess) changeGuestAccess(false);
  }, [isSignedIn, guestAccess, changeGuestAccess]);

  return (
    <GuestAccessContext.Provider value={{
      guestAccess,
      continueAsGuest: () => changeGuestAccess(true),
      leaveGuest: () => changeGuestAccess(false),
    }}>
      {children}
    </GuestAccessContext.Provider>
  );
}

export function useGuestAccess() {
  const value = useContext(GuestAccessContext);
  if (!value) throw new Error('Guest access must be used inside its provider.');
  return value;
}
