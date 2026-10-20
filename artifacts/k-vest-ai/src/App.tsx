import { useEffect, useRef, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ClerkProvider,
  SignIn,
  SignUp,
  useClerk,
} from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { AuthEntry } from '@/components/auth-entry';
import { AuthGate } from '@/components/auth-gate';
import { GuestAccessProvider } from '@/components/guest-access';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import JourneyWelcomePage from '@/pages/journey-welcome';
import JourneyScanPage from '@/pages/journey-scan';
import JourneyResearchPage from '@/pages/journey-research';
import JourneyPracticePage from '@/pages/journey-practice';
import JourneyRoiPage from '@/pages/journey-roi';
import JourneyFinishPage from '@/pages/journey-finish';
import VisionPage from '@/pages/vision';
import { ScanIntroPage, ResearchIntroPage, PracticeIntroPage, RoiIntroPage } from '@/pages/journey-intro';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

// Resolve the Clerk key for the actual incoming hostname, including custom domains.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// Empty during development; populated automatically for production proxying.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in Replit Secrets');
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/k-vest-logo-wide.png`,
  },
  variables: {
    colorPrimary: '#ff7138',
    colorForeground: '#dde1fb',
    colorMutedForeground: '#c9b8b3',
    colorDanger: '#ffb4ab',
    colorBackground: '#161b2d',
    colorInput: '#080d1f',
    colorInputForeground: '#dde1fb',
    colorNeutral: '#80665e',
    fontFamily: "'Inter', sans-serif",
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#11172b] border border-[#594139]/70 rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#dde1fb] text-2xl font-bold tracking-tight',
    headerSubtitle: 'text-[#c9b8b3] text-sm',
    socialButtonsBlockButtonText: 'text-[#dde1fb]',
    formFieldLabel: 'text-[#dde1fb] text-sm font-medium',
    footerActionLink: 'text-[#ffb59b] hover:text-[#ff7138]',
    footerActionText: 'text-[#c9b8b3] text-sm',
    dividerText: 'text-[#c9b8b3]',
    identityPreviewEditButton: 'text-[#ffb59b]',
    formFieldSuccessText: 'text-[#00e2a0]',
    alertText: 'text-[#dde1fb]',
    logoBox: 'rounded-xl',
    logoImage: 'object-contain',
    socialButtonsBlockButton: 'rounded-xl border-[#594139] bg-[#1a1f31] hover:bg-[#24293c]',
    formButtonPrimary: 'kv-auth__login-button min-h-11 rounded-xl bg-gradient-to-r from-[#ff7138] to-[#ff925c] font-semibold text-[#1b1110] shadow-lg shadow-[#ff7138]/20 hover:brightness-110',
    formFieldInput: 'min-h-11 rounded-xl border-[#594139] bg-[#080d1f] text-[#dde1fb] placeholder:text-[#929db7] focus:ring-2 focus:ring-[#ff7138]/40',
    footerAction: 'border-t border-[#594139]/60',
    dividerLine: 'bg-[#594139]/70',
    alert: 'rounded-xl border-[#ffb4ab]/30 bg-[#93000a]/20',
    otpCodeFieldInput: 'rounded-lg border-[#594139] bg-[#080d1f] text-[#dde1fb]',
    formFieldRow: 'gap-2',
    main: 'gap-5',
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const activeQueryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== userId) {
        activeQueryClient.clear();
      }
      previousUserId.current = userId;
    });

    return unsubscribe;
  }, [activeQueryClient, addListener]);

  return null;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function HomeRedirect() {
  return <Redirect to="/journey/welcome" />;
}

function SignInPage() {
  return (
    <AuthEntry mode="sign-in">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl={`${basePath}/journey/welcome`}
        forceRedirectUrl={`${basePath}/journey/welcome`}
      />
    </AuthEntry>
  );
}

function SignUpPage() {
  return (
    <AuthEntry mode="sign-up">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/journey/welcome`}
        forceRedirectUrl={`${basePath}/journey/welcome`}
      />
    </AuthEntry>
  );
}

function ClerkRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: 'Sign in',
            subtitle: '',
            actionText: 'New to K-vest AI?',
            actionLink: 'Create account',
          },
        },
        signUp: {
          start: {
            title: 'Create your account',
            subtitle: '',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <GuestAccessProvider>
      <ClerkQueryClientCacheInvalidator />
      <RoutedErrorBoundary>
        <AuthGate>
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/journey/welcome" component={JourneyWelcomePage} />
          <Route path="/vision" component={VisionPage} />
          <Route path="/journey/scan-intro" component={ScanIntroPage} />
          <Route path="/journey/scan" component={JourneyScanPage} />
          <Route path="/journey/research-intro" component={ResearchIntroPage} />
          <Route path="/journey/research" component={JourneyResearchPage} />
          <Route path="/journey/practice-intro" component={PracticeIntroPage} />
          <Route path="/journey/practice" component={JourneyPracticePage} />
          <Route path="/journey/roi-intro" component={RoiIntroPage} />
          <Route path="/journey/roi" component={JourneyRoiPage} />
          <Route path="/journey/finish" component={JourneyFinishPage} />
          <Route path="/scanner" component={HomeRedirect} />
          <Route path="/stocks/:symbol" component={HomeRedirect} />
          <Route path="/watchlist" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/user-portal" component={HomeRedirect} />
          <Route component={NotFound} />
        </Switch>
        </AuthGate>
      </RoutedErrorBoundary>
      </GuestAccessProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
