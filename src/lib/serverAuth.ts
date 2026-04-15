import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import type { UserProfile } from './auth';

// On the server we don't talk to `/api/auth/*` (our own proxy) — we call
// the upstream auth API directly so we can also run during static rendering
// and at request time without bouncing through our own handlers.
const AUTH_API_URL = process.env.AUTH_API_URL || 'https://api.dtcmvpete.com';

export class AuthError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

async function readTokenFromCookies(request?: NextRequest): Promise<string | null> {
  if (request) return request.cookies.get('supabase.auth.token')?.value ?? null;
  const jar = await cookies();
  return jar.get('supabase.auth.token')?.value ?? null;
}

async function fetchUserProfile(token: string): Promise<UserProfile | null> {
  const res = await fetch(`${AUTH_API_URL}/api/auth/user`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  try {
    return (await res.json()) as UserProfile;
  } catch {
    return null;
  }
}

// Read the current session user from the `supabase.auth.token` cookie.
// Returns null if there's no cookie or the upstream rejects the token.
// Pass a NextRequest when available (API routes) so we don't use the async
// cookies() bridge; omit it in server components / pages.
export async function getSessionUser(request?: NextRequest): Promise<UserProfile | null> {
  const token = await readTokenFromCookies(request);
  if (!token) return null;
  return fetchUserProfile(token);
}

// Throws AuthError(401) if unauthed, AuthError(403) if not admin.
// Use in API route handlers — catch the error and return NextResponse.
export async function requireAdmin(request?: NextRequest): Promise<UserProfile> {
  const user = await getSessionUser(request);
  if (!user) throw new AuthError(401, 'not authenticated');
  if (!user.is_admin) throw new AuthError(403, 'admin access required');
  return user;
}
