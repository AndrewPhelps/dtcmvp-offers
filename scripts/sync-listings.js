#!/usr/bin/env node
/**
 * sync-listings.js
 *
 * Populates the Airtable Listings table from SWAG specs (in swags.db on
 * the dtcmvp-offers-frontend container) joined with logo data from 1800dtc.db.
 *
 * For each Listing, generates Short Description (paragraph) and Benefit
 * Bullets (3-5 lines) via `claude -p` from the SWAG spec content.
 *
 * Modes:
 *   --slugs a,b,c     process only these specific slugs
 *   --limit N         process the first N specs (sorted by status, then slug)
 *   --status S        filter spec status (default: any). One of draft|approved|needs-regen
 *   --dry-run         print payloads, don't write to Airtable
 *
 * Auth (only when not --dry-run):
 *   AIRTABLE_API_KEY  PAT with write access to the base
 *   AIRTABLE_BASE_ID  defaults to appnBsoKSUIYu6Nn1
 */

const { execFileSync, execFile } = require('child_process');
const { promisify } = require('util');
const execFileP = promisify(execFile);
const fs = require('fs');
const os = require('os');
const path = require('path');
const { normalizeTags } = require('./lib/normalize-tag');

// ── Config ────────────────────────────────────────────────────────────
const DROPLET_SSH = process.env.DROPLET_SSH || 'deploy@142.93.27.155';
const CONTAINER = 'dtcmvp-offers-frontend';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appnBsoKSUIYu6Nn1';
const LISTINGS_TABLE = 'Listings';

// ── Args ──────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { slugs: null, limit: null, status: null, dryRun: false, outFile: null, concurrency: 1, skipExisting: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--slugs') out.slugs = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--limit') out.limit = parseInt(argv[++i], 10);
    else if (a === '--status') out.status = argv[++i];
    else if (a === '--out') out.outFile = argv[++i];
    else if (a === '--concurrency') out.concurrency = parseInt(argv[++i], 10);
    else if (a === '--skip-existing') out.skipExisting = true;
  }
  return out;
}

// ── Remote DB read (SSH + docker exec via stdin pipe — no file write) ──
function runRemoteNode(script) {
  // Pipe script directly into `node -` running inside the container with
  // cwd=/app so require('better-sqlite3') resolves. No /tmp file dance.
  return execFileSync('ssh', [DROPLET_SSH,
    `docker exec -i -w /app ${CONTAINER} node -`,
  ], { input: script, maxBuffer: 50 * 1024 * 1024 }).toString();
}

function fetchSpecsAndLogos(slugs) {
  const slugList = JSON.stringify(slugs);
  const out = runRemoteNode(`
const Database = require('better-sqlite3');
const swags = new Database('/app/swag-data/swags.db', { readonly: true });
const dtc = new Database('/app/data/1800dtc.db', { readonly: true });
const slugs = ${slugList};
const out = {};
const specStmt = swags.prepare('SELECT spec_json, status FROM swag_specs WHERE slug = ?');
const logoStmt = dtc.prepare("SELECT COALESCE(a.logo_url, l.logo_url) AS logo FROM apps a LEFT JOIN listings l USING(slug) WHERE a.slug = ?");
for (const slug of slugs) {
  const s = specStmt.get(slug);
  const l = logoStmt.get(slug);
  out[slug] = {
    spec: s ? JSON.parse(s.spec_json) : null,
    spec_status: s ? s.status : null,
    logo_url: (l && l.logo) || null,
  };
}
process.stdout.write(JSON.stringify(out));
`);
  return JSON.parse(out);
}

function listSlugsRemote({ limit, status }) {
  const out = runRemoteNode(`
const Database = require('better-sqlite3');
const swags = new Database('/app/swag-data/swags.db', { readonly: true });
let q = 'SELECT slug FROM swag_specs';
const args = [];
if (${JSON.stringify(status || null)} !== null) {
  q += ' WHERE status = ?';
  args.push(${JSON.stringify(status || '')});
}
q += ' ORDER BY slug ASC';
if (${JSON.stringify(limit || null)} !== null) {
  q += ' LIMIT ?';
  args.push(${JSON.stringify(limit || 0)});
}
const rows = swags.prepare(q).all(...args);
process.stdout.write(JSON.stringify(rows.map(r => r.slug)));
`);
  return JSON.parse(out);
}

// ── LLM content generation via claude -p ──────────────────────────────
const PROMPT_TEMPLATE = `You are writing a tool listing for the dtcmvp partner marketplace. A Shopify brand sees this listing BEFORE clicking "Generate SWAG" — your job is to make them curious enough to run the calculator. You are NOT pitching a sale.

Read the SWAG spec below and produce two outputs:

1. **shortDescription** — 2 to 3 sentences in plain English. Explain what the tool does and the kind of brand that gets value from it. Concrete, specific. Reference what the tool actually does, not abstract benefits.

2. **benefitBullets** — concise answers to ONE question: "what specifically does this do for my brand?" Each bullet = a mechanism the tool provides → the outcome it produces. Pull these from spec.benefits[].description. If a single benefit description covers multiple distinct mechanisms (e.g. "bulk edits + scheduled tasks + previous hours now minutes"), split each into its own bullet.

  HARD RULES for bullets:
  - Number of bullets = however many real, distinct benefit mechanisms exist (typically 2 to 5). Do NOT pad to a quota. Two strong bullets > five fluffy ones.
  - NO case studies or brand testimonials ("Tatcha grew 20%", "Princess Polly: 2.8X", "Caraway $900k"). These belong in social-proof later, not here.
  - NO vanity / social proof ("40,000+ merchants", "4.9 stars across 1,055 reviews", "Premier Partner", review counts, GMV claims, awards).
  - NO partner brag ("highest tier", "best in class").
  - Industry benchmarks ARE allowed when they set realistic expectations for a typical brand (e.g. "Email programs typically drive 25-40% of ecom revenue") — those are forecasts, not testimonials.
  - Each bullet under ~90 chars. Sentence fragments. Drop articles where readable. Use symbols (%, &, $, "-" for ranges).
  - One per line, leading "• ".

Constraints on tone (strict):
- Lowercase by default ("dtcmvp", "ai", "esp", "cdp", "sms" in prose). Proper nouns (Shopify, Klaviyo, brand names) capitalized normally.
- NO em-dashes, en-dashes, double-hyphens. Single "-" for ranges only.
- NO AI-speak: leverage, robust, seamless, comprehensive, cutting-edge, state-of-the-art, utilize, empower, unlock, delve, moreover, crucial, vital, meticulous, tapestry.
- NO mentions of "SWAG" or "ROI calculator".
- Output MUST be a single JSON object with exactly two string keys: "shortDescription" and "benefitBullets". No extra text or commentary before or after.

Examples of GOOD benefit bullets (mechanism → outcome, fragment style):
• Custom ML models trained daily on your purchase data lift campaign revenue
• Re-engages suppressed subscribers who still show purchase intent
• Bulk catalog edits replace manual per-product updates for prices, tags, inventory
• Scheduled tasks automate recurring jobs like sales events & seasonal repricing
• Updates that took hours now take minutes
• Email flows (welcome, abandoned cart, winback) drive 25-40% of total ecom revenue
• Non-competing brand ads on the thank-you page generate per-order profit
• One-click post-purchase upsells, no payment re-entry

Examples of BAD benefit bullets:
• Princess Polly: 2.8X revenue growth via Klaviyo (case study, not a benefit)
• 40,000+ brands on platform (vanity)
• 4.9/5 stars across 1,055 reviews (social proof)
• Klaviyo Premier Partner (highest tier) (partner brag)
• Leverage AI to optimize your store (AI-speak + vague)
• Boost performance and engagement (generic)

SWAG spec:
\`\`\`json
{{SPEC_JSON}}
\`\`\`

Return ONLY the JSON object, like:
{"shortDescription": "...", "benefitBullets": "• ...\\n• ...\\n• ..."}
`;

function extractFirstJsonObject(s) {
  const start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

async function generateContent(spec) {
  // Trim spec to just the fields the LLM needs (smaller prompt = cheaper, faster)
  const trimmed = {
    partnerName: spec.partnerName,
    tagline: spec.tagline,
    tags: spec.tags,
    benefits: (spec.benefits || []).map(b => ({
      label: b.label,
      description: b.description,
      type: b.type,
    })),
    sources: spec.sources || [],
    notes: spec.notes || '',
  };
  const prompt = PROMPT_TEMPLATE.replace('{{SPEC_JSON}}', JSON.stringify(trimmed, null, 2));
  const { stdout } = await execFileP('claude', [
    '-p',
    '--model', 'opus',
    '--no-session-persistence',
    '--output-format', 'text',
    prompt,
  ], { maxBuffer: 10 * 1024 * 1024 });
  const out = stdout.toString().trim();

  // Extract the first complete JSON object (Opus sometimes appends prose after).
  // Walk the string tracking brace depth + string state to find the matching close.
  const cleaned = out.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const jsonText = extractFirstJsonObject(cleaned);
  if (!jsonText) {
    throw new Error(`no JSON object found in LLM output for ${spec.slug || '?'}: ${cleaned.slice(0, 500)}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`failed to parse LLM JSON for ${spec.slug || '?'}: ${err.message}\nExtracted: ${jsonText.slice(0, 500)}`);
  }
  if (!parsed.shortDescription || !parsed.benefitBullets) {
    throw new Error(`LLM output missing required keys for ${spec.slug || '?'}: ${JSON.stringify(parsed)}`);
  }
  return parsed;
}

// ── Build Airtable payload ────────────────────────────────────────────
function buildPayload({ slug, spec, logoUrl, generated }) {
  return {
    fields: {
      Name: spec.partnerName,
      Slug: slug,
      Tagline: spec.tagline || '',
      'Short Description': generated.shortDescription,
      'Benefit Bullets': generated.benefitBullets,
      Tags: normalizeTags(spec.tags || []),
      Tier: typeof spec.tier === 'number' ? spec.tier : null,
      'Logo URL': logoUrl || null,
      'Partner URL': spec.partnerUrl || null,
      Status: 'draft',
      Active: true,
    },
  };
}

// ── Airtable write (POST + PATCH) ─────────────────────────────────────
async function fetchAllExistingSlugs(apiKey) {
  const slugs = new Set();
  let offset = null;
  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${LISTINGS_TABLE}`);
    url.searchParams.set('fields[]', 'Slug');
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);
    const r = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!r.ok) throw new Error(`Airtable list failed: ${r.status} ${await r.text()}`);
    const data = await r.json();
    for (const rec of data.records) {
      if (rec.fields && rec.fields.Slug) slugs.add(rec.fields.Slug);
    }
    offset = data.offset || null;
  } while (offset);
  return slugs;
}

async function findExistingBySlug(slug, apiKey) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${LISTINGS_TABLE}` +
    `?filterByFormula=` + encodeURIComponent(`{Slug}='${slug.replace(/'/g, "\\'")}'`) +
    `&maxRecords=1`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!r.ok) throw new Error(`Airtable lookup failed for slug=${slug}: ${r.status} ${await r.text()}`);
  const data = await r.json();
  return data.records[0] || null;
}

async function createListing(payload, apiKey) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${LISTINGS_TABLE}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ records: [payload], typecast: true }),
  });
  if (!r.ok) throw new Error(`Airtable create failed: ${r.status} ${await r.text()}`);
  const data = await r.json();
  return data.records[0];
}

async function updateListing(recordId, payload, apiKey) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${LISTINGS_TABLE}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ records: [{ id: recordId, fields: payload.fields }], typecast: true }),
  });
  if (!r.ok) throw new Error(`Airtable update failed: ${r.status} ${await r.text()}`);
  const data = await r.json();
  return data.records[0];
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.dryRun && !process.env.AIRTABLE_API_KEY) {
    console.error('ERROR: AIRTABLE_API_KEY env var required when not --dry-run');
    process.exit(1);
  }

  let slugs = args.slugs || listSlugsRemote({ limit: args.limit, status: args.status });
  if (!slugs.length) {
    console.error('No slugs to process. Pass --slugs or --limit.');
    process.exit(1);
  }

  // Optionally filter out slugs that already exist in Airtable Listings
  if (args.skipExisting && !args.dryRun) {
    if (!process.env.AIRTABLE_API_KEY) {
      console.error('ERROR: AIRTABLE_API_KEY required for --skip-existing');
      process.exit(1);
    }
    console.error(`Querying Airtable for existing Slug values (filtering out ${slugs.length} candidates)...`);
    const existingSlugs = await fetchAllExistingSlugs(process.env.AIRTABLE_API_KEY);
    const before = slugs.length;
    slugs = slugs.filter(s => !existingSlugs.has(s));
    console.error(`Filtered ${before - slugs.length} already-present slug(s); ${slugs.length} remaining to create.`);
  }

  if (!slugs.length) {
    console.error('Nothing to do — all candidates already in Airtable.');
    process.exit(0);
  }

  console.error(`Processing ${slugs.length} slug(s) with concurrency=${args.concurrency}`);
  console.error('Fetching specs + logos from droplet...');
  const data = fetchSpecsAndLogos(slugs);

  const summary = { created: 0, updated: 0, skipped: 0, failed: 0, missing: [] };
  const collectedPayloads = [];
  const startTime = Date.now();

  // Worker pool: N concurrent slug processors. Each handles LLM generation
  // + Airtable write for one slug at a time.
  let cursor = 0;
  const total = slugs.length;
  const processOne = async (slug) => {
    const row = data[slug];
    if (!row || !row.spec) {
      console.error(`[${slug}] SKIP: no spec found`);
      summary.skipped++;
      summary.missing.push(slug);
      return;
    }

    try {
      const generated = await generateContent(row.spec);
      const payload = buildPayload({
        slug,
        spec: row.spec,
        logoUrl: row.logo_url,
        generated,
      });

      if (args.dryRun) {
        collectedPayloads.push({ slug, spec_status: row.spec_status, fields: payload.fields });
        console.error(`[${slug}] generated (dry-run)`);
        summary.skipped++;
      } else {
        const existing = await findExistingBySlug(slug, process.env.AIRTABLE_API_KEY);
        if (existing) {
          await updateListing(existing.id, payload, process.env.AIRTABLE_API_KEY);
          console.error(`[${slug}] UPDATED ${existing.id}`);
          summary.updated++;
        } else {
          const created = await createListing(payload, process.env.AIRTABLE_API_KEY);
          console.error(`[${slug}] CREATED ${created.id}`);
          summary.created++;
        }
      }
    } catch (err) {
      console.error(`[${slug}] FAILED: ${err.message.slice(0, 200)}`);
      summary.failed++;
    }
  };

  const workers = Array.from({ length: Math.max(1, args.concurrency) }, async (_, w) => {
    while (cursor < total) {
      const i = cursor++;
      const done = summary.created + summary.updated + summary.skipped + summary.failed;
      if (done > 0 && done % 25 === 0) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const rate = done / elapsed;
        const eta = Math.floor((total - done) / Math.max(rate, 0.01));
        console.error(`progress: ${done}/${total} (${elapsed}s elapsed, eta ~${Math.floor(eta / 60)}m${eta % 60}s)`);
      }
      await processOne(slugs[i]);
    }
  });
  await Promise.all(workers);

  if (args.dryRun) {
    const wrapped = {
      generatedAt: new Date().toISOString().slice(0, 10),
      count: collectedPayloads.length,
      payloads: collectedPayloads,
    };
    if (args.outFile) {
      fs.writeFileSync(args.outFile, JSON.stringify(wrapped, null, 2));
      console.error(`\nWrote ${collectedPayloads.length} payloads to ${args.outFile}`);
    } else {
      console.log(JSON.stringify(wrapped, null, 2));
    }
  }

  console.error('\n' + '='.repeat(70));
  console.error('SUMMARY:', JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
