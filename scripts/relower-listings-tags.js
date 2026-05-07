#!/usr/bin/env node
/**
 * relower-listings-tags.js
 *
 * One-shot: lowercases every existing Tag multi-select option on the
 * Airtable Listings table. Preserves option IDs (so existing record data
 * is untouched), only changes the option `name` field.
 *
 * Why: SWAG specs have lowercase-hyphenated tags. We're normalizing to
 * all-lowercase across the marketplace per dtcmvp brand convention.
 * Without this, sync-listings.js would create duplicate options
 * ("Email" + "email" co-existing).
 *
 * Reads AIRTABLE_API_KEY + AIRTABLE_BASE_ID from env. Exits 0 on success.
 *
 * Run: AIRTABLE_API_KEY=$(grep ^AIRTABLE_API_KEY= .env | cut -d= -f2-) \
 *      AIRTABLE_BASE_ID=appnBsoKSUIYu6Nn1 \
 *      node scripts/relower-listings-tags.js [--dry-run]
 */

const { normalizeTag } = require('./lib/normalize-tag');

const TABLE_NAME = 'Listings';
const FIELD_NAME = 'Tags';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!apiKey || !baseId) {
    console.error('ERROR: AIRTABLE_API_KEY and AIRTABLE_BASE_ID env vars required');
    process.exit(1);
  }

  // 1. Find the Listings table + Tags field
  const metaUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;
  const metaRes = await fetch(metaUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!metaRes.ok) {
    throw new Error(`meta lookup failed: ${metaRes.status} ${await metaRes.text()}`);
  }
  const meta = await metaRes.json();
  const table = meta.tables.find(t => t.name === TABLE_NAME);
  if (!table) throw new Error(`table not found: ${TABLE_NAME}`);
  const field = table.fields.find(f => f.name === FIELD_NAME);
  if (!field) throw new Error(`field not found: ${FIELD_NAME}`);
  if (field.type !== 'multipleSelects') {
    throw new Error(`expected multipleSelects, got ${field.type}`);
  }

  const choices = field.options.choices;
  console.log(`Found ${choices.length} ${FIELD_NAME} options on ${TABLE_NAME} (field ${field.id})`);

  // 2. Build the new choices array using the shared normalizer (so existing
  //    options match what sync-listings.js will write going forward — both
  //    lowercase, both with hyphens converted to spaces).
  // Preserve every original field (id, color, etc.) — only override `name`.
  //
  // PRIORITY: when a duplicate exists (Title Case + lowercase counterpart),
  // keep the already-normalized one — its option ID is what sync-written
  // records reference. Title Case duplicates are unused and safe to delete.
  // (Airtable rejects PATCH if we try to delete a choice that records use.)
  const sorted = [...choices].sort((a, b) => {
    const aIsNormal = normalizeTag(a.name) === a.name ? 0 : 1;
    const bIsNormal = normalizeTag(b.name) === b.name ? 0 : 1;
    return aIsNormal - bIsNormal; // already-normalized ones first
  });
  const updates = [];
  const drops = [];
  const seen = new Map();
  const renamed = [];
  for (const c of sorted) {
    const norm = normalizeTag(c.name);
    if (seen.has(norm)) {
      drops.push({ name: c.name, id: c.id, collidesWith: seen.get(norm) });
      continue;
    }
    seen.set(norm, c.id);
    if (norm !== c.name) {
      updates.push({ from: c.name, to: norm, id: c.id });
    }
    renamed.push({ ...c, name: norm });
  }
  if (drops.length) {
    console.log(`\nWill drop ${drops.length} duplicate option(s) (Title Case versions of names already lowercase):`);
    for (const d of drops) {
      console.log(`  ${d.name.padEnd(25)} (${d.id}) — collision with id ${d.collidesWith}`);
    }
  }

  console.log(`\nWill rename ${updates.length} option(s):`);
  for (const u of updates) {
    console.log(`  ${u.from.padEnd(25)} → ${u.to}`);
  }

  if (updates.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  if (dryRun) {
    console.log('\n--dry-run: no changes made.');
    return;
  }

  // 3. PATCH the field
  const patchUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables/${table.id}/fields/${field.id}`;
  const r = await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ options: { choices: renamed } }),
  });
  if (!r.ok) {
    throw new Error(`PATCH failed: ${r.status} ${await r.text()}`);
  }
  const result = await r.json();
  console.log(`\nPATCH succeeded. Updated field ${result.id}.`);
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
