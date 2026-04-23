/**
 * GET /api/swag/admin/list — admin view of every SWAG spec.
 *
 * Returns every spec regardless of status (draft/approved/needs-regen),
 * so the admin review UI can show the full queue. Spec JSON is excluded
 * from this payload; the admin preview endpoint fetches it on demand.
 *
 * Optional ?status=draft|approved|needs-regen filter.
 */

import { NextRequest, NextResponse } from 'next/server';
import { listAllSwagSpecs, getStatusCounts, SwagStatus } from '@/lib/swagDb';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: SwagStatus[] = ['draft', 'approved', 'needs-regen'];

export async function GET(request: NextRequest) {
  const statusParam = request.nextUrl.searchParams.get('status');
  const filterStatus = statusParam && VALID_STATUSES.includes(statusParam as SwagStatus)
    ? (statusParam as SwagStatus)
    : undefined;

  const specs = listAllSwagSpecs(filterStatus);
  const counts = getStatusCounts();

  return NextResponse.json({ specs, counts });
}
