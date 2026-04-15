import { NextRequest, NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/serverAuth';
import { getAppDetail } from '@/lib/scrapeDb';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await requireAdmin(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { slug } = await params;
  try {
    const app = getAppDetail(slug);
    if (!app) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ app });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[api/scrape-results/apps/${slug}] db error:`, message);
    return NextResponse.json(
      { error: 'scrape-results db unavailable', detail: message },
      { status: 500 },
    );
  }
}
