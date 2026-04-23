/**
 * GET    /api/swag/admin/spec/[slug] — fetch a spec regardless of status.
 * DELETE /api/swag/admin/spec/[slug] — remove a spec from the DB.
 *
 * The public /api/swag/[slug] route only returns approved specs — this
 * route exposes drafts + needs-regen entries so the admin UI can preview
 * them in the SwagCalculator before approving.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSwagSpec, deleteSwagSpec, upsertSwagSpec } from '@/lib/swagDb';
import type { SwagSpec } from '@/lib/swag/swag-types';

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

/**
 * PUT /api/swag/admin/spec/[slug] — replace the spec body while preserving
 * review metadata. Used by the admin inline JSON editor for typo fixes
 * and similar non-material edits. The slug in the URL must match the
 * slug in the body.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const existing = getAdminSwagSpec(slug);
  if (!existing) {
    return NextResponse.json({ error: 'SWAG spec not found' }, { status: 404 });
  }

  let body: { spec?: SwagSpec };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const spec = body.spec;
  if (!spec || typeof spec !== 'object') {
    return NextResponse.json({ error: 'body.spec is required' }, { status: 400 });
  }
  if (!spec.slug || spec.slug !== slug) {
    return NextResponse.json(
      { error: `spec.slug must match URL slug (${slug})` },
      { status: 400 },
    );
  }
  if (!spec.partnerName) {
    return NextResponse.json({ error: 'spec.partnerName is required' }, { status: 400 });
  }

  upsertSwagSpec(
    spec.slug,
    spec.partnerName,
    JSON.stringify(spec),
    spec.tier ?? existing.tier,
    spec.generatedAt ?? existing.generated_at,
    { preserveReview: true },
  );

  return NextResponse.json({ ok: true, slug });
}
