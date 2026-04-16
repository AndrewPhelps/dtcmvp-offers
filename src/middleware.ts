import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/login') return NextResponse.next();
  if (pathname.startsWith('/b/') || pathname === '/b') return NextResponse.next();

  // Redirect old /brand/ paths to /b/ (301) so existing links in inboxes work
  if (pathname.startsWith('/brand/') || pathname === '/brand') {
    const newPath = pathname.replace(/^\/brand/, '/b');
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

// Only gate app routes — /api/* and static assets are implicitly excluded.
export const config = {
  matcher: [
    '/',
    '/offers/:path*',
    '/questionnaire/:path*',
    '/questionnaire',
    '/scrape-results/:path*',
    '/scrape-results',
  ],
};
