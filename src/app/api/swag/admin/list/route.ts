/**
 * GET /api/swag/admin/list — admin view of every SWAG spec.
 *
 * Returns every spec regardless of status (draft/approved/needs-regen),
 * so the admin review UI can show the full queue. Spec JSON is excluded
 * from this payload; the admin preview endpoint fetches it on demand.
 *
 * Includes server-computed lint counts per spec so the table can sort
 * by problem-count without the client round-tripping every spec.
 *
 * Optional ?status=draft|approved|needs-regen filter.
 */

import { NextRequest, NextResponse } from 'next/server';
import { listAllSwagSpecsWithJson, getStatusCounts, SwagStatus } from '@/lib/swagDb';
import { lintSwagSpec, summarizeIssues } from '@/lib/swag/review';
import { computeSwag } from '@/lib/swag/swag-engine';
import { DEFAULT_BRAND_PROFILE } from '@/lib/swag/swag-types';
import type { SwagSpec } from '@/lib/swag/swag-types';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: SwagStatus[] = ['draft', 'approved', 'needs-regen'];

export async function GET(request: NextRequest) {
  const statusParam = request.nextUrl.searchParams.get('status');
  const filterStatus = statusParam && VALID_STATUSES.includes(statusParam as SwagStatus)
    ? (statusParam as SwagStatus)
    : undefined;

  const rows = listAllSwagSpecsWithJson(filterStatus);
  const counts = getStatusCounts();

  const specs = rows.map((row) => {
    let lintCounts = { red: 0, yellow: 0, error: false };
    try {
      const spec = JSON.parse(row.spec_json) as SwagSpec;
      const results = computeSwag(spec, DEFAULT_BRAND_PROFILE);
      const issues = lintSwagSpec(spec, results);
      lintCounts = { ...summarizeIssues(issues), error: false };
    } catch (err) {
      // Corrupt JSON or compute failure — surface as an error badge so
      // the reviewer knows something is structurally wrong.
      console.error(`[admin/list] lint failed for ${row.slug}:`, err);
      lintCounts = { red: 0, yellow: 0, error: true };
    }
    // Strip spec_json — client doesn't need it in the list payload.
    const { spec_json: _stripped, ...rest } = row;
    return { ...rest, lintCounts };
  });

  return NextResponse.json({ specs, counts });
}
