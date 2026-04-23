/**
 * PATCH /api/swag/admin/status — update review status of a SWAG spec.
 *
 * Body: { slug: string, status: 'draft'|'approved'|'needs-regen',
 *         reviewed_by: string, notes?: string }
 *
 * Used by the admin review UI when an operator approves or flags a spec.
 */

import { NextRequest, NextResponse } from 'next/server';
import { setSwagStatus, SwagStatus } from '@/lib/swagDb';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: SwagStatus[] = ['draft', 'approved', 'needs-regen'];

export async function PATCH(request: NextRequest) {
  let body: {
    slug?: string;
    status?: string;
    reviewed_by?: string;
    notes?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { slug, status, reviewed_by, notes } = body;

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }
  if (!status || !VALID_STATUSES.includes(status as SwagStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 },
    );
  }
  if (!reviewed_by || typeof reviewed_by !== 'string') {
    return NextResponse.json({ error: 'reviewed_by is required' }, { status: 400 });
  }

  const ok = setSwagStatus(slug, status as SwagStatus, reviewed_by, notes ?? null);
  if (!ok) {
    return NextResponse.json({ error: 'SWAG spec not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, slug, status });
}
