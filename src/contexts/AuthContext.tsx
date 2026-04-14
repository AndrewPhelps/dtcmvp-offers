'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { UserProfile, getCurrentUser, signOut as authSignOut, initAuth } from '@/lib/auth';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Paths that don't require authentication. Brands without a session
// belong on /brand/[contactId]; anonymous partners belong on /login.
const PUBLIC_PATHS = ['/login', '/brand'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const loadUser = async () => {
    try {
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
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
