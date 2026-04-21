/**
 * GET /api/swag — list all available SWAG spec slugs with partner names.
 *
 * Used by the frontend to know which partners have SWAGs without
 * loading the full specs. Returns a lightweight array.
 */

import { NextResponse } from 'next/server';
import { listSwagSlugs } from '@/lib/swagDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  const specs = listSwagSlugs();
  return NextResponse.json({ specs });
}
