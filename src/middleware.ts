import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes (also excluded by the matcher below; in-function checks are defense in depth).
  if (pathname === '/login') return NextResponse.next();
  if (pathname.startsWith('/b/') || pathname === '/b') return NextResponse.next();

  // Legacy paths → 301 to current canonical paths.
  if (pathname.startsWith('/brand/') || pathname === '/brand') {
    const newPath = pathname.replace(/^\/brand/, '/b');
    return NextResponse.redirect(new URL(newPath + request.nextUrl.search, request.url), 301);
  }
  // /offers/* and /swags/* both collapse to root after the swags.dtcmvp.com move.
  if (pathname.startsWith('/offers/') || pathname === '/offers') {
    const newPath = pathname.replace(/^\/offers/, '') || '/';
    return NextResponse.redirect(new URL(newPath + request.nextUrl.search, request.url), 301);
  }
  if (pathname.startsWith('/swags/') || pathname === '/swags') {
    const newPath = pathname.replace(/^\/swags/, '') || '/';
    return NextResponse.redirect(new URL(newPath + request.nextUrl.search, request.url), 301);
  }

  const supabaseToken = request.cookies.get('supabase.auth.token')?.value;

  if (!supabaseToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    console.log(`[Middleware] No auth token, redirecting ${pathname} → /login`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Gate everything except: login, brand magic-link, /api, Next.js internals, static assets.
// /[slug] (deep links to listings) IS gated since it's brand-facing.
export const config = {
  matcher: [
    '/((?!login|b/|api/|_next/|favicon|.*\\.(?:png|jpg|jpeg|svg|webp|ico|gif|css|js|woff|woff2|ttf)).*)',
  ],
};
