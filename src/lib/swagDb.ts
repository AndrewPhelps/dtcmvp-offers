/**
 * Database access layer for SWAG specs.
 *
 * Separate from 1800dtc.db (which is read-only and atomically replaced
 * monthly). swags.db is writable — agents insert/update specs directly.
 *
 * Production: /app/data/swags.db (Docker volume, same mount as 1800dtc.db)
 * Local dev:  ./data/swags.db (repo root)
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.SWAG_DB_PATH
  ?? path.join(process.cwd(), 'data', 'swags.db');

let _db: Database.Database | null = null;
let _dbMtimeMs: number | null = null;

function db(): Database.Database {
  // If the DB doesn't exist yet, create it with the schema
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
  return _db;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS swag_specs (
  slug          TEXT PRIMARY KEY,
  partner_name  TEXT NOT NULL,
  spec_json     TEXT NOT NULL,
  tier          INTEGER NOT NULL DEFAULT 0,
  generated_at  TEXT NOT NULL,
  generated_by  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_swag_specs_tier ON swag_specs(tier);
`;

// ---- Read operations (used by the frontend API) ----

export interface SwagSpecRow {
  slug: string;
  partner_name: string;
  spec_json: string;
  tier: number;
  generated_at: string;
  generated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get a single SWAG spec by slug. Returns the parsed SwagSpec or null.
 */
export function getSwagSpec(slug: string): SwagSpecRow | null {
  const row = db().prepare(
    'SELECT * FROM swag_specs WHERE slug = ?'
  ).get(slug) as SwagSpecRow | undefined;
  return row ?? null;
}

/**
 * List all SWAG spec slugs with partner names.
 * Used by the OfferDrawer to know which partners have SWAGs.
 */
export function listSwagSlugs(): { slug: string; partner_name: string }[] {
  return db().prepare(
    'SELECT slug, partner_name FROM swag_specs ORDER BY partner_name'
  ).all() as { slug: string; partner_name: string }[];
}

/**
 * Check if a SWAG spec exists for a given partner name (case-insensitive).
 */
export function getSwagSlugByPartnerName(partnerName: string): string | null {
  const row = db().prepare(
    'SELECT slug FROM swag_specs WHERE LOWER(partner_name) = LOWER(?)'
  ).get(partnerName) as { slug: string } | undefined;
  return row?.slug ?? null;
}

// ---- Write operations (used by CLI scripts / agents) ----

/**
 * Insert or replace a SWAG spec. Agents call this after generating a spec.
 */
export function upsertSwagSpec(
  slug: string,
  partnerName: string,
  specJson: string,
  tier: number,
  generatedAt: string,
  generatedBy?: string,
): void {
  db().prepare(`
    INSERT INTO swag_specs (slug, partner_name, spec_json, tier, generated_at, generated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(slug) DO UPDATE SET
      partner_name = excluded.partner_name,
      spec_json = excluded.spec_json,
      tier = excluded.tier,
      generated_at = excluded.generated_at,
      generated_by = excluded.generated_by,
      updated_at = datetime('now')
  `).run(slug, partnerName, specJson, tier, generatedAt, generatedBy ?? null);
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
