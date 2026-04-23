/**
 * Database access layer for SWAG specs.
 *
 * Separate from 1800dtc.db (which is read-only and atomically replaced
 * monthly). swags.db is writable — agents insert/update specs directly.
 *
 * Production: /app/swag-data/swags.db (Docker volume)
 * Local dev:  ./swag-data/swags.db (repo root)
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.SWAG_DB_PATH
  ?? path.join(process.cwd(), 'swag-data', 'swags.db');

let _db: Database.Database | null = null;
let _dbMtimeMs: number | null = null;

export type SwagStatus = 'draft' | 'approved' | 'needs-regen';

function db(): Database.Database {
  if (!fs.existsSync(DB_PATH)) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const fresh = new Database(DB_PATH);
    fresh.pragma('journal_mode = WAL');
    fresh.pragma('foreign_keys = ON');
    fresh.exec(SCHEMA);
    fresh.close();
  }

  const mtime = fs.statSync(DB_PATH).mtimeMs;
  if (_db && _dbMtimeMs === mtime) return _db;
  if (_db) {
    try { _db.close(); } catch { /* swallow */ }
  }
  _db = new Database(DB_PATH);
  _dbMtimeMs = mtime;
  ensureReviewColumns(_db);
  return _db;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS swag_specs (
  slug          TEXT PRIMARY KEY,
  partner_name  TEXT NOT NULL,
  spec_json     TEXT NOT NULL,
  tier          INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft',
  reviewed_by   TEXT,
  reviewed_at   TEXT,
  review_notes  TEXT,
  generated_at  TEXT NOT NULL,
  generated_by  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_swag_specs_tier ON swag_specs(tier);
CREATE INDEX IF NOT EXISTS idx_swag_specs_status ON swag_specs(status);
`;

/**
 * Idempotent migration: add status/review columns to existing DBs that
 * predate them. Safe to run on every open — ALTER TABLE ADD COLUMN is a
 * no-op if the column already exists (we check via pragma first).
 *
 * On first run (no status column yet) we backfill pre-existing rows as
 * 'approved' — they are fixtures that were already reviewed manually
 * before the review workflow existed.
 */
function ensureReviewColumns(conn: Database.Database): void {
  const cols = conn.prepare(`PRAGMA table_info(swag_specs)`).all() as Array<{ name: string }>;
  const has = (name: string) => cols.some(c => c.name === name);
  const firstMigration = !has('status');

  if (!has('status')) conn.exec(`ALTER TABLE swag_specs ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'`);
  if (!has('reviewed_by')) conn.exec(`ALTER TABLE swag_specs ADD COLUMN reviewed_by TEXT`);
  if (!has('reviewed_at')) conn.exec(`ALTER TABLE swag_specs ADD COLUMN reviewed_at TEXT`);
  if (!has('review_notes')) conn.exec(`ALTER TABLE swag_specs ADD COLUMN review_notes TEXT`);

  if (firstMigration) {
    conn.exec(
      `UPDATE swag_specs
       SET status = 'approved',
           reviewed_by = 'pre-status-migration',
           reviewed_at = datetime('now')
       WHERE status = 'draft'`
    );
  }

  conn.exec(`CREATE INDEX IF NOT EXISTS idx_swag_specs_status ON swag_specs(status)`);
}

// ---- Types ----

export interface SwagSpecRow {
  slug: string;
  partner_name: string;
  spec_json: string;
  tier: number;
  status: SwagStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  generated_at: string;
  generated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Public read ops (used by user-facing endpoints) ----

/**
 * Get a single SWAG spec by slug. Only returns approved specs to end users.
 */
export function getSwagSpec(slug: string): SwagSpecRow | null {
  const row = db().prepare(
    `SELECT * FROM swag_specs WHERE slug = ? AND status = 'approved'`
  ).get(slug) as SwagSpecRow | undefined;
  return row ?? null;
}

/**
 * List approved SWAG spec slugs with partner names.
 * Used by the OfferDrawer to know which partners have SWAGs.
 */
export function listSwagSlugs(): { slug: string; partner_name: string }[] {
  return db().prepare(
    `SELECT slug, partner_name FROM swag_specs WHERE status = 'approved' ORDER BY partner_name`
  ).all() as { slug: string; partner_name: string }[];
}

/**
 * Check if an approved SWAG spec exists for a given partner name (case-insensitive).
 */
export function getSwagSlugByPartnerName(partnerName: string): string | null {
  const row = db().prepare(
    `SELECT slug FROM swag_specs WHERE LOWER(partner_name) = LOWER(?) AND status = 'approved'`
  ).get(partnerName) as { slug: string } | undefined;
  return row?.slug ?? null;
}

// ---- Admin read ops ----

/**
 * List all specs regardless of status. Used by the admin review UI.
 * Excludes spec_json to keep the payload small.
 */
export function listAllSwagSpecs(filterStatus?: SwagStatus): Omit<SwagSpecRow, 'spec_json'>[] {
  if (filterStatus) {
    return db().prepare(
      `SELECT slug, partner_name, tier, status, reviewed_by, reviewed_at, review_notes,
              generated_at, generated_by, created_at, updated_at
       FROM swag_specs WHERE status = ? ORDER BY updated_at DESC`
    ).all(filterStatus) as Omit<SwagSpecRow, 'spec_json'>[];
  }
  return db().prepare(
    `SELECT slug, partner_name, tier, status, reviewed_by, reviewed_at, review_notes,
            generated_at, generated_by, created_at, updated_at
     FROM swag_specs ORDER BY updated_at DESC`
  ).all() as Omit<SwagSpecRow, 'spec_json'>[];
}

/**
 * Get a single spec regardless of status (for admin preview).
 */
export function getAdminSwagSpec(slug: string): SwagSpecRow | null {
  const row = db().prepare(
    `SELECT * FROM swag_specs WHERE slug = ?`
  ).get(slug) as SwagSpecRow | undefined;
  return row ?? null;
}

/**
 * Get summary counts by status.
 */
export function getStatusCounts(): { status: SwagStatus; count: number }[] {
  return db().prepare(
    `SELECT status, COUNT(*) as count FROM swag_specs GROUP BY status`
  ).all() as { status: SwagStatus; count: number }[];
}

// ---- Write ops ----

export interface UpsertOptions {
  status?: SwagStatus;
  generatedBy?: string;
}

/**
 * Insert or replace a SWAG spec.
 *
 * On insert: status defaults to 'draft' (or whatever the caller passes).
 * On conflict: status is reset to 'draft' unless caller explicitly passes
 *   a status — the spec content just changed, so a prior 'approved' stamp
 *   no longer applies. The seed script passes 'approved' explicitly when
 *   replaying trusted fixtures.
 */
export function upsertSwagSpec(
  slug: string,
  partnerName: string,
  specJson: string,
  tier: number,
  generatedAt: string,
  opts: UpsertOptions = {},
): void {
  const status: SwagStatus = opts.status ?? 'draft';
  const generatedBy = opts.generatedBy ?? null;

  db().prepare(`
    INSERT INTO swag_specs (
      slug, partner_name, spec_json, tier, status,
      generated_at, generated_by, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(slug) DO UPDATE SET
      partner_name = excluded.partner_name,
      spec_json = excluded.spec_json,
      tier = excluded.tier,
      status = excluded.status,
      generated_at = excluded.generated_at,
      generated_by = excluded.generated_by,
      reviewed_by = NULL,
      reviewed_at = NULL,
      review_notes = NULL,
      updated_at = datetime('now')
  `).run(slug, partnerName, specJson, tier, status, generatedAt, generatedBy);
}

/**
 * Update only the review status of an existing spec. Used by the admin UI.
 */
export function setSwagStatus(
  slug: string,
  status: SwagStatus,
  reviewedBy: string,
  notes?: string | null,
): boolean {
  const result = db().prepare(`
    UPDATE swag_specs
    SET status = ?,
        reviewed_by = ?,
        reviewed_at = datetime('now'),
        review_notes = ?,
        updated_at = datetime('now')
    WHERE slug = ?
  `).run(status, reviewedBy, notes ?? null, slug);
  return result.changes > 0;
}

/**
 * Delete a SWAG spec by slug.
 */
export function deleteSwagSpec(slug: string): boolean {
  const result = db().prepare('DELETE FROM swag_specs WHERE slug = ?').run(slug);
  return result.changes > 0;
}

/**
 * Get count of all specs.
 */
export function countSwagSpecs(): number {
  const row = db().prepare('SELECT COUNT(*) as count FROM swag_specs').get() as { count: number };
  return row.count;
}
