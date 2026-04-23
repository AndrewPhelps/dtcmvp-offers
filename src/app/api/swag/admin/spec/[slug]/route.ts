/**
 * GET    /api/swag/admin/spec/[slug] — fetch a spec regardless of status.
 * DELETE /api/swag/admin/spec/[slug] — remove a spec from the DB.
 *
 * The public /api/swag/[slug] route only returns approved specs — this
 * route exposes drafts + needs-regen entries so the admin UI can preview
 * them in the SwagCalculator before approving.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSwagSpec, deleteSwagSpec } from '@/lib/swagDb';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const row = getAdminSwagSpec(slug);

  if (!row) {
    return NextResponse.json({ error: 'SWAG spec not found' }, { status: 404 });
  }

  try {
    const spec = JSON.parse(row.spec_json);
    return NextResponse.json({
      spec,
      meta: {
        slug: row.slug,
        partner_name: row.partner_name,
        tier: row.tier,
        status: row.status,
        reviewed_by: row.reviewed_by,
        reviewed_at: row.reviewed_at,
        review_notes: row.review_notes,
        generated_at: row.generated_at,
        generated_by: row.generated_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Invalid spec data' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ok = deleteSwagSpec(slug);
  if (!ok) {
    return NextResponse.json({ error: 'SWAG spec not found' }, { status: 404 });
  }
  return NextResponse.json({ deleted: slug });
}
