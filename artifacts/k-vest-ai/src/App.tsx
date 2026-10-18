import { useEffect, useRef, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ClerkLoaded,
  ClerkLoading,
  ClerkProvider,
  Show,
  SignIn,
  SignUp,
  useClerk,
  useUser,
} from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { AuthPage } from '@/components/auth-page';
import { BrandMark } from '@/components/brand-mark';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import Home from '@/pages/home';
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
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
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
    formButtonPrimary: 'min-h-11 rounded-xl bg-gradient-to-r from-[#ff7138] to-[#ff925c] font-semibold text-[#1b1110] shadow-lg shadow-[#ff7138]/20 hover:brightness-110',
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
  return (
    <>
      <ClerkLoaded>
        <Show when="signed-in">
          <Redirect to="/user-portal" />
        </Show>
        <Show when="signed-out">
          <Home />
        </Show>
      </ClerkLoaded>
      <ClerkLoading>
        <Home />
      </ClerkLoading>
    </>
  );
}

function SignInPage() {
  return (
    <AuthPage mode="sign-in">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl={`${basePath}/user-portal`}
      />
    </AuthPage>
  );
}

function SignUpPage() {
  return (
    <AuthPage mode="sign-up">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/user-portal`}
      />
    </AuthPage>
  );
}

function SignedInPortal() {
  const { isLoaded, user } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) {
    return <main className="kv-auth__main" aria-live="polite">Loading your account…</main>;
  }

  if (!user) {
    return <Redirect to="/" />;
  }

  const email = user.primaryEmailAddress?.emailAddress ?? 'Your account';

  return (
    <div className="kv-auth" data-testid="page-account">
      <header className="kv-auth__header">
        <Link href="/" className="kv-auth__brand" data-testid="link-account-home">
          <BrandMark className="kv-auth__mark" />
          <span>
            <span className="kv-auth__brand-name">K-vest AI</span>
            <span className="kv-auth__brand-caption">Kuwait investing research</span>
          </span>
        </Link>
        <button
          className="kv-auth__home-link"
          type="button"
          onClick={() => signOut({ redirectUrl: basePath || '/' })}
          data-testid="button-sign-out"
        >
          Sign out
        </button>
      </header>
      <main className="kv-auth__main" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <section className="kv-auth__story" aria-labelledby="account-title">
          <div className="kv-auth__eyebrow">
            <span className="kv-auth__eyebrow-mark" aria-hidden="true" />
            Account ready
          </div>
          <h1 className="kv-auth__title" id="account-title">
            Welcome{user.firstName ? `, ${user.firstName}` : ''}<span className="kv-auth__title-accent">.</span>
          </h1>
          <p className="kv-auth__intro" data-testid="text-account-email">{email}</p>
          <p className="kv-auth__gentle-note">
            K-vest AI is being built step by step. The calculator is available now; market research features are still planned.
          </p>
          <Link href="/" className="kv-auth__home-link" data-testid="link-account-return-home">
            Return to the home page
          </Link>
        </section>
      </main>
    </div>
  );
}

function UserPortal() {
  return (
    <>
      <ClerkLoaded>
        <Show when="signed-in">
          <SignedInPortal />
        </Show>
        <Show when="signed-out">
          <Redirect to="/" />
        </Show>
      </ClerkLoaded>
      <ClerkLoading>
        <main className="kv-auth__main" aria-live="polite">Loading your account…</main>
      </ClerkLoading>
    </>
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
            title: 'Welcome back',
            subtitle: 'Sign in to continue learning with K-vest AI',
          },
        },
        signUp: {
          start: {
            title: 'Create your account',
            subtitle: 'Start your K-vest AI learning journey',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkQueryClientCacheInvalidator />
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/user-portal" component={UserPortal} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
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
