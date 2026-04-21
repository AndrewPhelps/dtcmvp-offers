#!/usr/bin/env node
/**
 * CLI tool for inserting/updating SWAG specs in swags.db.
 *
 * Used by agents and the generate-swag skill to persist specs
 * without requiring a git commit or app rebuild.
 *
 * Usage:
 *   # From a JSON file
 *   node scripts/upsert-swag.js partners/klaviyo.json
 *
 *   # From stdin (pipe from agent output)
 *   cat spec.json | node scripts/upsert-swag.js --stdin
 *
 *   # With explicit generated-by tag
 *   node scripts/upsert-swag.js partners/klaviyo.json --by "generate-swag-skill"
 *
 *   # List all specs in the database
 *   node scripts/upsert-swag.js --list
 *
 *   # Delete a spec
 *   node scripts/upsert-swag.js --delete klaviyo
 *
 *   # Seed from all JSON files in src/partners/
 *   node scripts/upsert-swag.js --seed
 *
 * Environment:
 *   SWAG_DB_PATH — path to swags.db (default: ./data/swags.db)
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.SWAG_DB_PATH
  ?? path.join(process.cwd(), 'data', 'swags.db');

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
    // ensure schema exists even on existing db
    db.exec(SCHEMA);
  }
  return db;
}

function upsert(db, spec, generatedBy) {
  if (!spec.slug || !spec.partnerName) {
    console.error('error: spec must have slug and partnerName');
    process.exit(1);
  }

  db.prepare(`
    INSERT INTO swag_specs (slug, partner_name, spec_json, tier, generated_at, generated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(slug) DO UPDATE SET
      partner_name = excluded.partner_name,
      spec_json = excluded.spec_json,
      tier = excluded.tier,
      generated_at = excluded.generated_at,
      generated_by = excluded.generated_by,
      updated_at = datetime('now')
  `).run(
    spec.slug,
    spec.partnerName,
    JSON.stringify(spec),
    spec.tier ?? 0,
    spec.generatedAt ?? new Date().toISOString().split('T')[0],
    generatedBy ?? null,
  );

  console.log(`upserted: ${spec.slug} (${spec.partnerName})`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    const db = getDb();
    const rows = db.prepare(
      'SELECT slug, partner_name, tier, generated_at, generated_by, updated_at FROM swag_specs ORDER BY partner_name'
    ).all();
    if (rows.length === 0) {
      console.log('no specs in database');
    } else {
      console.log(`${rows.length} spec(s):\n`);
      for (const r of rows) {
        console.log(`  ${r.slug.padEnd(20)} ${r.partner_name.padEnd(25)} tier=${r.tier}  generated=${r.generated_at}  by=${r.generated_by ?? 'unknown'}`);
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
    const partnersDir = path.join(process.cwd(), 'src', 'partners');
    if (!fs.existsSync(partnersDir)) {
      console.error(`not found: ${partnersDir}`);
      process.exit(1);
    }
    const files = fs.readdirSync(partnersDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) {
      console.log('no JSON files in src/partners/');
      return;
    }
    const db = getDb();
    let count = 0;
    for (const file of files) {
      const spec = JSON.parse(fs.readFileSync(path.join(partnersDir, file), 'utf-8'));
      upsert(db, spec, 'seed-from-json');
      count++;
    }
    console.log(`\nseeded ${count} spec(s) from src/partners/`);
    db.close();
    return;
  }

  // Read spec from file or stdin
  let raw;
  const byIdx = args.indexOf('--by');
  const generatedBy = byIdx >= 0 ? args[byIdx + 1] : null;

  if (args.includes('--stdin')) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    raw = Buffer.concat(chunks).toString('utf-8');
  } else {
    const filePath = args.find(a => !a.startsWith('--'));
    if (!filePath) {
      console.error('usage: upsert-swag.js <file.json> [--by <agent>]');
      console.error('       upsert-swag.js --stdin [--by <agent>]');
      console.error('       upsert-swag.js --list');
      console.error('       upsert-swag.js --delete <slug>');
      console.error('       upsert-swag.js --seed');
      process.exit(1);
    }
    raw = fs.readFileSync(filePath, 'utf-8');
  }

  const spec = JSON.parse(raw);
  const db = getDb();
  upsert(db, spec, generatedBy);
  db.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
