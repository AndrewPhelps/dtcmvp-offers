/**
 * GET /api/swag/[slug] — fetch a SWAG spec by slug.
 *
 * Public endpoint (no auth required) — brands need to see SWAGs.
 * Returns the full SwagSpec JSON or 404.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSwagSpec } from '@/lib/swagDb';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const row = getSwagSpec(slug);

  if (!row) {
    return NextResponse.json({ error: 'SWAG spec not found' }, { status: 404 });
  }

  try {
    const spec = JSON.parse(row.spec_json);
    return NextResponse.json({ spec });
  } catch {
    return NextResponse.json({ error: 'Invalid spec data' }, { status: 500 });
  }
}
