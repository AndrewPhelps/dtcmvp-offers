#!/usr/bin/env node
/**
 * CLI tool for inserting/updating SWAG specs in swags.db.
 *
 * Used by agents and the generate-swag skill to persist specs
 * without requiring a git commit or app rebuild.
 *
 * Usage:
 *   # From a JSON file (status defaults to 'draft')
 *   node scripts/upsert-swag.js partners/klaviyo.json
 *
 *   # From stdin (pipe from agent output)
 *   cat spec.json | node scripts/upsert-swag.js --stdin
 *
 *   # With explicit generated-by tag
 *   node scripts/upsert-swag.js partners/klaviyo.json --by "generate-swag-skill"
 *
 *   # Override the default status (draft) — e.g. for trusted fixtures
 *   node scripts/upsert-swag.js partners/klaviyo.json --status approved
 *
 *   # Batch: upsert every *.json file in a directory (used by the swarm)
 *   node scripts/upsert-swag.js --batch /tmp/swag-batch-2026-04-23 --by swarm-2026-04-23
 *
 *   # List all specs
 *   node scripts/upsert-swag.js --list
 *   node scripts/upsert-swag.js --list --status draft
 *
 *   # Delete a spec
 *   node scripts/upsert-swag.js --delete klaviyo
 *
 *   # Seed from all JSON files in src/partners/ (lands as status='approved')
 *   node scripts/upsert-swag.js --seed
 *
 * Environment:
 *   SWAG_DB_PATH — path to swags.db (default: ./swag-data/swags.db)
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.SWAG_DB_PATH
  ?? path.join(process.cwd(), 'swag-data', 'swags.db');

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

const VALID_STATUSES = ['draft', 'approved', 'needs-regen'];

function ensureReviewColumns(db) {
  const cols = db.prepare(`PRAGMA table_info(swag_specs)`).all();
  const has = (name) => cols.some((c) => c.name === name);
  const firstMigration = !has('status');

  if (!has('status')) db.exec(`ALTER TABLE swag_specs ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'`);
  if (!has('reviewed_by')) db.exec(`ALTER TABLE swag_specs ADD COLUMN reviewed_by TEXT`);
  if (!has('reviewed_at')) db.exec(`ALTER TABLE swag_specs ADD COLUMN reviewed_at TEXT`);
  if (!has('review_notes')) db.exec(`ALTER TABLE swag_specs ADD COLUMN review_notes TEXT`);

  if (firstMigration) {
    // Pre-existing rows predate the review workflow; treat them as vetted.
    db.exec(
      `UPDATE swag_specs
       SET status = 'approved',
           reviewed_by = 'pre-status-migration',
           reviewed_at = datetime('now')
       WHERE status = 'draft'`
    );
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_swag_specs_status ON swag_specs(status)`);
}

function getDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const isNew = !fs.existsSync(DB_PATH);
  const db = new Database(DB_PATH);
  if (isNew) {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA);
    console.log(`created ${DB_PATH}`);
  } else {
    db.exec(SCHEMA);
    ensureReviewColumns(db);
  }
  return db;
}

function upsert(db, spec, generatedBy, status) {
  if (!spec.slug || !spec.partnerName) {
    console.error('error: spec must have slug and partnerName');
    process.exit(1);
  }

  if (!VALID_STATUSES.includes(status)) {
    console.error(`error: invalid status "${status}". must be one of: ${VALID_STATUSES.join(', ')}`);
    process.exit(1);
  }

  db.prepare(`
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
  `).run(
    spec.slug,
    spec.partnerName,
    JSON.stringify(spec),
    spec.tier ?? 0,
    status,
    spec.generatedAt ?? new Date().toISOString().split('T')[0],
    generatedBy ?? null,
  );

  console.log(`upserted: ${spec.slug.padEnd(22)} ${spec.partnerName.padEnd(25)} status=${status}`);
}

function flagValue(args, flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : null;
}

function usage() {
  console.error('usage: upsert-swag.js <file.json> [--by <agent>] [--status draft|approved|needs-regen]');
  console.error('       upsert-swag.js --stdin [--by <agent>] [--status <status>]');
  console.error('       upsert-swag.js --batch <dir> [--by <agent>] [--status <status>]');
  console.error('       upsert-swag.js --list [--status <status>]');
  console.error('       upsert-swag.js --delete <slug>');
  console.error('       upsert-swag.js --seed');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    const db = getDb();
    const filterStatus = flagValue(args, '--status');
    const rows = filterStatus
      ? db.prepare(
          'SELECT slug, partner_name, tier, status, generated_at, generated_by, updated_at FROM swag_specs WHERE status = ? ORDER BY updated_at DESC'
        ).all(filterStatus)
      : db.prepare(
          'SELECT slug, partner_name, tier, status, generated_at, generated_by, updated_at FROM swag_specs ORDER BY status, partner_name'
        ).all();
    if (rows.length === 0) {
      console.log('no specs match filter');
    } else {
      console.log(`${rows.length} spec(s):\n`);
      for (const r of rows) {
        console.log(`  ${r.slug.padEnd(22)} ${r.partner_name.padEnd(25)} status=${r.status.padEnd(11)} tier=${r.tier}  by=${r.generated_by ?? 'unknown'}`);
      }
    }
    db.close();
    return;
  }

  if (args.includes('--delete')) {
    const slug = args[args.indexOf('--delete') + 1];
    if (!slug) { console.error('usage: --delete <slug>'); process.exit(1); }
    const db = getDb();
    const result = db.prepare('DELETE FROM swag_specs WHERE slug = ?').run(slug);
    console.log(result.changes > 0 ? `deleted: ${slug}` : `not found: ${slug}`);
    db.close();
    return;
  }

  if (args.includes('--seed')) {
    // Seed replays the 9 original JSON fixtures. These are already vetted so
    // land them as approved.
    const partnersDir = path.join(process.cwd(), 'src', 'partners');
    if (!fs.existsSync(partnersDir)) {
      console.error(`not found: ${partnersDir}`);
      process.exit(1);
    }
    const files = fs.readdirSync(partnersDir).filter((f) => f.endsWith('.json'));
    if (files.length === 0) {
      console.log('no JSON files in src/partners/');
      return;
    }
    const db = getDb();
    let count = 0;
    for (const file of files) {
      const spec = JSON.parse(fs.readFileSync(path.join(partnersDir, file), 'utf-8'));
      upsert(db, spec, 'seed-from-json', 'approved');
      count++;
    }
    console.log(`\nseeded ${count} spec(s) from src/partners/ (status=approved)`);
    db.close();
    return;
  }

  // --batch: pull every *.json from a directory
  if (args.includes('--batch')) {
    const batchDir = flagValue(args, '--batch');
    if (!batchDir) { console.error('usage: --batch <dir>'); process.exit(1); }
    if (!fs.existsSync(batchDir)) {
      console.error(`not found: ${batchDir}`);
      process.exit(1);
    }
    const files = fs.readdirSync(batchDir).filter((f) => f.endsWith('.json'));
    if (files.length === 0) {
      console.log(`no JSON files in ${batchDir}`);
      return;
    }
    const generatedBy = flagValue(args, '--by');
    const status = flagValue(args, '--status') ?? 'draft';
    const db = getDb();
    let count = 0;
    let failed = 0;
    for (const file of files) {
      const full = path.join(batchDir, file);
      try {
        const spec = JSON.parse(fs.readFileSync(full, 'utf-8'));
        upsert(db, spec, generatedBy, status);
        count++;
      } catch (err) {
        console.error(`SKIPPED ${file}: ${err.message}`);
        failed++;
      }
    }
    console.log(`\nbatch: upserted ${count}, failed ${failed}, dir=${batchDir}`);
    db.close();
    return;
  }

  // Single spec from file or stdin
  let raw;
  const generatedBy = flagValue(args, '--by');
  const status = flagValue(args, '--status') ?? 'draft';

  if (args.includes('--stdin')) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    raw = Buffer.concat(chunks).toString('utf-8');
  } else {
    const filePath = args.find((a, i) => {
      if (a.startsWith('--')) return false;
      // Skip values that follow flags we consume
      const prev = args[i - 1];
      if (prev === '--by' || prev === '--status' || prev === '--batch' || prev === '--delete') return false;
      return true;
    });
    if (!filePath) { usage(); process.exit(1); }
    raw = fs.readFileSync(filePath, 'utf-8');
  }

  const spec = JSON.parse(raw);
  const db = getDb();
  upsert(db, spec, generatedBy, status);
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
