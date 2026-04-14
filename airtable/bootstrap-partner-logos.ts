/**
 * One-off bootstrap: upload partner logos + descriptions to Airtable Companies.
 *
 * For each unique partner Company referenced by an Offer, match it against
 * src/data/partners.ts by name (fuzzy — case-insensitive, partial-match OK)
 * and PATCH the Company record with:
 *   - Offer Partner Logo: [{ url: "https://offers.dtcmvp.com/logos/{file}" }]
 *   - Offer Partner Description: <mock description>
 *   - Offer Partner Active: true
 *
 * Airtable fetches the URL server-side — the logos just need to be publicly
 * accessible (they're served from our Next.js /public/logos/ directory on
 * https://offers.dtcmvp.com).
 *
 * Run (AIRTABLE_API_KEY env var required):
 *   AIRTABLE_API_KEY=xxx npx tsx airtable/bootstrap-partner-logos.ts
 *   AIRTABLE_API_KEY=xxx npx tsx airtable/bootstrap-partner-logos.ts --dry-run
 */

import { partners as mockPartners } from '../src/data/partners';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
if (!AIRTABLE_API_KEY) {
  console.error('ERROR: AIRTABLE_API_KEY env var is required');
  process.exit(1);
}

const BASE_ID = 'appnBsoKSUIYu6Nn1';
const COMPANIES_TABLE_ID = 'Companies';
const OFFERS_TABLE_ID = 'tblflFmuuuDhcs0mX';
const LOGO_BASE_URL = 'https://offers.dtcmvp.com/logos';
const API_URL = 'https://api.airtable.com/v0';
const DRY_RUN = process.argv.includes('--dry-run');

const headers = {
  Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

async function fetchAll(tableId: string, params: Record<string, string> = {}): Promise<AirtableRecord[]> {
  const all: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const p = new URLSearchParams({ pageSize: '100', ...params });
    if (offset) p.set('offset', offset);
    const url = `${API_URL}/${BASE_ID}/${tableId}?${p.toString()}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`${tableId} fetch ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { records: AirtableRecord[]; offset?: string };
    all.push(...data.records);
    offset = data.offset;
    if (offset) await sleep(200);
  } while (offset);
  return all;
}

async function getCompany(recordId: string): Promise<AirtableRecord> {
  const url = `${API_URL}/${BASE_ID}/${COMPANIES_TABLE_ID}/${recordId}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Company ${recordId} fetch ${res.status}: ${await res.text()}`);
  return (await res.json()) as AirtableRecord;
}

async function patchCompany(recordId: string, fields: Record<string, unknown>): Promise<void> {
  const url = `${API_URL}/${BASE_ID}/${COMPANIES_TABLE_ID}/${recordId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields, typecast: true }),
  });
  if (!res.ok) throw new Error(`Company ${recordId} PATCH ${res.status}: ${await res.text()}`);
}

// Fuzzy-match an Airtable Company name to one of the mock partners.
// Handles cases like "Axon" → "AppLovin (Axon)" via substring either way.
function matchMockPartner(airtableName: string) {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const target = norm(airtableName);

  // Pass 1: exact normalized match
  for (const p of mockPartners) {
    if (norm(p.name) === target) return p;
  }
  // Pass 2: one contains the other (covers "Axon" ↔ "applovinaxon")
  for (const p of mockPartners) {
    const n = norm(p.name);
    if (n.includes(target) || target.includes(n)) return p;
  }
  // Pass 3: slug substring (e.g. "applovin" in "applovinaxon")
  for (const p of mockPartners) {
    if (target.includes(p.id)) return p;
  }
  // Pass 4: match against mock website (strip TLD). Catches cases like
  // Airtable Company "prettydamnquick" ↔ mock partner with id="pdq" and
  // website="prettydamnquick.com".
  for (const p of mockPartners) {
    const domainNorm = norm(p.website.replace(/\.(com|io|co|ai|app)$/i, ''));
    if (domainNorm && (domainNorm === target || domainNorm.includes(target) || target.includes(domainNorm))) {
      return p;
    }
  }
  return null;
}

async function main() {
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Bootstrap partner logos to Airtable Companies`);
  console.log('');

  console.log('[1/3] Fetching offers to find unique partner record IDs...');
  const offers = await fetchAll(OFFERS_TABLE_ID, { 'fields[]': 'Partner' });
  const partnerIds = new Set<string>();
  for (const o of offers) {
    const links = (o.fields.Partner as string[] | undefined) || [];
    links.forEach((id) => partnerIds.add(id));
  }
  console.log(`    ${partnerIds.size} unique partners referenced by ${offers.length} offers`);

  console.log('');
  console.log('[2/3] Fetching Company records + matching to mock partners...');
  const matched: Array<{
    companyId: string;
    companyName: string;
    mockId: string;
    mockName: string;
    logoFile: string;
    description: string;
  }> = [];
  const unmatched: Array<{ companyId: string; companyName: string }> = [];

  for (const id of partnerIds) {
    const company = await getCompany(id);
    const name = (company.fields.Name as string) || '(no name)';
    const match = matchMockPartner(name);
    if (!match || !match.logo) {
      unmatched.push({ companyId: id, companyName: name });
    } else {
      matched.push({
        companyId: id,
        companyName: name,
        mockId: match.id,
        mockName: match.name,
        logoFile: match.logo,
        description: match.description,
      });
    }
    await sleep(100);
  }

  console.log(`    ${matched.length} matched, ${unmatched.length} unmatched`);
  if (unmatched.length > 0) {
    console.log('    UNMATCHED (manual upload needed):');
    unmatched.forEach((u) => console.log(`      - ${u.companyName} (${u.companyId})`));
  }

  console.log('');
  console.log(`[3/3] ${DRY_RUN ? 'Would patch' : 'Patching'} ${matched.length} Company records...`);
  let done = 0;
  let failed = 0;
  for (const m of matched) {
    const logoUrl = `${LOGO_BASE_URL}/${m.logoFile}`;
    const fields = {
      'Offer Partner Logo': [{ url: logoUrl }],
      'Offer Partner Description': m.description,
      'Offer Partner Active': true,
    };
    console.log(`    ${m.companyName} → ${m.logoFile} (${logoUrl})`);
    if (!DRY_RUN) {
      try {
        await patchCompany(m.companyId, fields);
        done++;
      } catch (err) {
        console.error(`      FAIL: ${err instanceof Error ? err.message : err}`);
        failed++;
      }
      await sleep(250); // Airtable rate limit is 5 req/sec per base
    }
  }

  console.log('');
  if (DRY_RUN) {
    console.log(`[DRY RUN] would have patched ${matched.length} records`);
  } else {
    console.log(`Done. patched=${done} failed=${failed} unmatched=${unmatched.length}`);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
