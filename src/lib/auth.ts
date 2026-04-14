export type UserType = 'admin' | 'partner' | 'brand';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  partner_name: string | null;
  airtable_contact_id: string | null;
  airtable_company_id: string | null;
  is_admin: boolean;
  user_type: UserType;
  permissions: string[];
  created_at?: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// Auth requests proxy through /api/auth/* → AUTH_API_URL/api/auth/*
const AUTH_API_URL = '/api';

const SESSION_DURATION = 180 * 24 * 60 * 60;

let _refreshPromise: Promise<boolean> | null = null;
let _lastRefreshTime = 0;
const REFRESH_DEBOUNCE_MS = 30 * 1000;

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export async function sendOTP(email: string): Promise<{ success: boolean; message: string }> {
  console.log('[Auth] Sending OTP to:', email);
  const response = await fetch(`${AUTH_API_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to send verification code' }));
    throw new Error(error.detail || error.message || 'Failed to send verification code');
  }

  return response.json();
}

export async function verifyOTP(email: string, otp: string): Promise<{ user: UserProfile; session: AuthSession }> {
  console.log('[Auth] Verifying OTP for:', email);
  const response = await fetch(`${AUTH_API_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token: otp }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Invalid or expired code' }));
    throw new Error(error.detail || error.message || 'Invalid or expired code');
  }

  const data = await response.json();
  storeTokens(data.session.access_token, data.session.refresh_token, data.session.expires_in);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export async function loginWithPassword(email: string, password: string): Promise<{ user: UserProfile; session: AuthSession }> {
  console.log('[Auth] Password login for:', email);
  const response = await fetch(`${AUTH_API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Invalid email or password' }));
    throw new Error(error.message || error.detail || 'Invalid email or password');
  }

  const data = await response.json();
  storeTokens(data.session.access_token, data.session.refresh_token, data.session.expires_in);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export async function brandLogin(contactId: string, firstName: string): Promise<{ user: UserProfile; session: AuthSession }> {
  console.log('[Auth] Brand login for contact:', contactId);
  const response = await fetch(`${AUTH_API_URL}/auth/brand-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contact_id: contactId, first_name: firstName }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Verification failed' }));
    throw new Error(error.detail || error.message || 'Verification failed');
  }

  const data = await response.json();
  storeTokens(data.session.access_token, data.session.refresh_token, data.session.expires_in);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

function storeTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem('supabase.auth.token', accessToken);
  localStorage.setItem('supabase.auth.refresh_token', refreshToken);
  localStorage.setItem('supabase.auth.expires_at', String(Date.now() + (expiresIn * 1000)));

  const cookieMaxAge = SESSION_DURATION;
  const secureSuffix = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `supabase.auth.token=${accessToken}; path=/; max-age=${cookieMaxAge}; samesite=lax${secureSuffix}`;
  document.cookie = `supabase.auth.refresh_token=${refreshToken}; path=/; max-age=${cookieMaxAge}; samesite=lax${secureSuffix}`;
}

async function _doRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('supabase.auth.refresh_token');
  if (!refreshToken) {
    console.log('[Auth] No refresh token available');
    return false;
  }

  const response = await fetch(`${AUTH_API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (response.status === 429) {
    throw new Error('REFRESH_IN_PROGRESS');
  }

  if (!response.ok) {
    console.log('[Auth] Token refresh failed:', response.status);
    if (response.status === 401) {
      throw new Error('REFRESH_UNAUTHORIZED');
    }
    return false;
  }

  const data = await response.json();
  localStorage.setItem('supabase.auth.token', data.access_token);
  if (data.refresh_token) {
    localStorage.setItem('supabase.auth.refresh_token', data.refresh_token);
  }
  localStorage.setItem('supabase.auth.expires_at', String(Date.now() + (data.expires_in * 1000)));

  const cookieMaxAge = SESSION_DURATION;
  const secureSuffix = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `supabase.auth.token=${data.access_token}; path=/; max-age=${cookieMaxAge}; samesite=lax${secureSuffix}`;
  if (data.refresh_token) {
    document.cookie = `supabase.auth.refresh_token=${data.refresh_token}; path=/; max-age=${cookieMaxAge}; samesite=lax${secureSuffix}`;
  }

  _lastRefreshTime = Date.now();
  return true;
}

export async function refreshAccessToken(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (Date.now() - _lastRefreshTime < REFRESH_DEBOUNCE_MS) {
    console.log('[Auth] Refresh debounced (recent success)');
    return true;
  }

  if (_refreshPromise) {
    console.log('[Auth] Refresh already in-flight, awaiting...');
    return _refreshPromise;
  }

  _refreshPromise = (async () => {
    const MAX_RETRIES = 3;
    let lastError: string | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await _doRefresh();
        if (result) {
          console.log(`[Auth] Token refreshed successfully (attempt ${attempt})`);
          return true;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        lastError = msg;
        console.log(`[Auth] Refresh attempt ${attempt}/${MAX_RETRIES} failed: ${msg}`);

        if (msg === 'REFRESH_UNAUTHORIZED') break;
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, attempt * 1000));
        }
      }
    }

    if (lastError === 'REFRESH_UNAUTHORIZED') {
      console.log('[Auth] All refresh attempts failed with 401, signing out');
      await signOut();
    } else {
      console.log('[Auth] All refresh attempts failed (non-401), keeping session');
    }
    return false;
  })();

  try {
    return await _refreshPromise;
  } finally {
    _refreshPromise = null;
  }
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('supabase.auth.token');
  if (!token) return null;

  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      return JSON.parse(storedUser);
    } catch {
      localStorage.removeItem('user');
    }
  }

  try {
    const response = await fetch(`${AUTH_API_URL}/auth/user`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) return null;

      const newToken = localStorage.getItem('supabase.auth.token');
      const retryResponse = await fetch(`${AUTH_API_URL}/auth/user`, {
        headers: { 'Authorization': `Bearer ${newToken}` },
      });

      if (!retryResponse.ok) return null;
      const userData = await retryResponse.json();
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    }

    const userData = await response.json();
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  if (typeof window === 'undefined') return;

  console.log('[Auth] Signing out');
  localStorage.removeItem('supabase.auth.token');
  localStorage.removeItem('supabase.auth.refresh_token');
  localStorage.removeItem('supabase.auth.expires_at');
  localStorage.removeItem('user');

  document.cookie = `supabase.auth.token=; path=/; max-age=0; samesite=lax`;
  document.cookie = `supabase.auth.refresh_token=; path=/; max-age=0; samesite=lax`;
}

export function restoreAuthFromCookies(): void {
  if (typeof window === 'undefined') return;

  const cookieToken = getCookie('supabase.auth.token');
  const cookieRefreshToken = getCookie('supabase.auth.refresh_token');

  if (cookieToken && !localStorage.getItem('supabase.auth.token')) {
    console.log('[Auth] Restoring access token from cookie');
    localStorage.setItem('supabase.auth.token', cookieToken);
  }
  if (cookieRefreshToken && !localStorage.getItem('supabase.auth.refresh_token')) {
    console.log('[Auth] Restoring refresh token from cookie');
    localStorage.setItem('supabase.auth.refresh_token', cookieRefreshToken);
  }
}

export async function initAuth(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  restoreAuthFromCookies();

  const accessToken = localStorage.getItem('supabase.auth.token');
  if (!accessToken) return false;

  const tokenExpiresAt = localStorage.getItem('supabase.auth.expires_at');

  if (!tokenExpiresAt) {
    console.log('[Auth] No token_expires_at found (likely cookie restore), forcing refresh');
    return await refreshAccessToken();
  }

  if (Date.now() >= Number(tokenExpiresAt) - 5 * 60 * 1000) {
    return await refreshAccessToken();
  }

  return true;
}

/**
 * Authenticated fetch — attaches Authorization header, retries once on 401 after refresh.
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem('supabase.auth.token');
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response = await fetch(input, { ...init, headers });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = localStorage.getItem('supabase.auth.token');
      if (newToken) headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(input, { ...init, headers });
    }
  }

  return response;
}
