'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { UserProfile, getCurrentUser, signOut as authSignOut, initAuth, loginWithToken } from '@/lib/auth';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Paths that don't require authentication. Brands without a session
// belong on /b/[contactId]; anonymous partners belong on /login.
const PUBLIC_PATHS = ['/login', '/b'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // True while a cross-app ?token= handoff is being exchanged. Used to
  // suppress rendering of children (which would briefly show the
  // unauthenticated marketplace skeleton) and show a "signing you in…"
  // splash instead. Set in useEffect (not lazy init) to avoid SSR/client
  // hydration mismatches — server has no URL to inspect.
  const [ssoInProgress, setSsoInProgress] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Flip ssoInProgress on as early as possible during client mount so the
  // splash replaces children before they get a chance to render their
  // unauthenticated state. This runs once on mount (empty deps).
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('token')) {
      setSsoInProgress(true);
    }
  }, []);

  const loadUser = async () => {
    let didSso = false;
    try {
      // Cross-app SSO: if another dtcmvp app handed us an access token via
      // ?token=<jwt>, exchange it for a full session before doing anything
      // else. Mirrors dtcmvp-2.0's AuthContext (the pattern in production).
      // We scrub the token + redirect params from the URL after consuming
      // so they don't sit in the user's address bar / browser history.
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');

        if (urlToken) {
          didSso = true;
          console.log('[Auth] Found token in URL, attempting SSO login...');
          const result = await loginWithToken(urlToken);

          if (result) {
            setUser(result.user);
            setLoading(false);

            // Respect ?redirect= from the inbound URL. Default to '/' since
            // that's the canonical partners listing on partners.dtcmvp.com
            // (middleware 301s /offers → /, but we'd rather avoid the
            // round-trip and land directly on the canonical path).
            const requestedRedirect = urlParams.get('redirect') || '/';
            const safeRedirect = requestedRedirect.startsWith('/') ? requestedRedirect : '/';

            // Scrub token + redirect from the URL before navigating.
            window.history.replaceState({}, '', window.location.pathname);
            router.push(safeRedirect);
            return;
          } else {
            console.error('[Auth] SSO token login failed; falling through to normal auth');
          }
        }
      }

      if (isPublicPath(pathname)) {
        // Still try to load user in the background so logged-in visitors
        // see their state (e.g., a "continue to offers" CTA) but don't gate.
        const quickUser = await getCurrentUser();
        if (quickUser) setUser(quickUser);
        setLoading(false);
        return;
      }

      const hasValidToken = await initAuth();

      if (!hasValidToken) {
        if (typeof window !== 'undefined' && pathname !== '/login') {
          sessionStorage.setItem('auth.redirect', pathname);
        }
        router.push('/login');
        setLoading(false);
        return;
      }

      const currentUser = await getCurrentUser();

      if (!currentUser) {
        if (typeof window !== 'undefined' && pathname !== '/login') {
          sessionStorage.setItem('auth.redirect', pathname);
        }
        router.push('/login');
        setLoading(false);
        return;
      }

      setUser(currentUser);
    } catch (error) {
      console.error('[Auth] Failed to load user:', error);
      router.push('/login');
    } finally {
      setLoading(false);
      // Always clear the SSO splash once loadUser has either succeeded or
      // bailed to /login. We use `didSso` rather than checking the URL again
      // because router.push above may have already navigated away.
      if (didSso) setSsoInProgress(false);
    }
  };

  useEffect(() => {
    loadUser();

    const refreshInterval = setInterval(async () => {
      if (!isPublicPath(pathname)) {
        console.log('[Auth] Periodic refresh check...');
        await initAuth();
      }
    }, 45 * 60 * 1000);

    const handleVisibilityChange = async () => {
      if (!document.hidden && !isPublicPath(pathname)) {
        console.log('[Auth] Tab visible, checking token...');
        await initAuth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    await authSignOut();
    setUser(null);
    router.push('/login');
  };

  const refreshUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.is_admin) return true;
    return user.permissions?.includes(permission) || false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser, hasPermission }}>
      {ssoInProgress ? <SsoSplash /> : children}
    </AuthContext.Provider>
  );
}

// Full-page splash shown while a cross-app ?token= is being exchanged.
// Replaces the children render so the marketplace doesn't briefly flash
// its unauthenticated skeleton. Tailwind primitives only — no project
// CSS dependencies — so this works even before the page's own styles load.
function SsoSplash() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-body,#0a0e1a)]">
      <div className="text-center">
        <div
          className="inline-block w-8 h-8 border-2 border-[var(--brand-green-secondary,#7af0a0)] border-t-transparent rounded-full animate-spin mb-4"
          aria-hidden="true"
        />
        <p className="text-sm text-[var(--text-secondary,#94a3b8)] lowercase">
          signing you in…
        </p>
      </div>
    </div>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
