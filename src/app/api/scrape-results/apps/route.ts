import { NextRequest, NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/serverAuth';
import { listApps } from '@/lib/scrapeDb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  try {
    const rows = listApps();
    return NextResponse.json({ apps: rows, count: rows.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/scrape-results/apps] db error:', message);
    return NextResponse.json(
      { error: 'scrape-results db unavailable', detail: message },
      { status: 500 },
    );
  }
}
