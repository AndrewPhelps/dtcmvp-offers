import { NextRequest, NextResponse } from 'next/server';

const AUTH_API = process.env.AUTH_API_URL || 'https://api.dtcmvpete.com';

async function proxyRequest(request: NextRequest, method: string) {
  const url = new URL(request.url);
  const authPath = url.pathname; // /api/auth/...
  const targetUrl = `${AUTH_API}${authPath}${url.search}`;

  console.log(`[api/auth] ${method} ${authPath} → ${targetUrl}`);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const authHeader = request.headers.get('Authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    const fetchOptions: RequestInit = { method, headers };

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        const body = await request.text();
        if (body) fetchOptions.body = body;
      } catch {
        // no body
      }
    }

    const res = await fetch(targetUrl, fetchOptions);

    const responseBody = await res.text();
    const responseHeaders = new Headers();
    const contentType = res.headers.get('Content-Type');
    if (contentType) responseHeaders.set('Content-Type', contentType);

    return new NextResponse(responseBody, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error(`[api/auth] ${method} ${authPath} error:`, err);
    return NextResponse.json({ error: 'auth proxy error' }, { status: 502 });
  }
}

export async function GET(request: NextRequest) { return proxyRequest(request, 'GET'); }
export async function POST(request: NextRequest) { return proxyRequest(request, 'POST'); }
export async function PUT(request: NextRequest) { return proxyRequest(request, 'PUT'); }
export async function DELETE(request: NextRequest) { return proxyRequest(request, 'DELETE'); }
