import { writeFileSync } from 'fs';
import { join } from 'path';
import { offers } from '../src/data/offers';
import { partners } from '../src/data/partners';
import { categories } from '../src/data/categories';
import { tags } from '../src/data/tags';

const OUT = __dirname;

const esc = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
};

const toCsv = (headers: string[], rows: unknown[][]): string => {
  const lines = [headers.map(esc).join(',')];
  for (const r of rows) lines.push(r.map(esc).join(','));
  return lines.join('\n') + '\n';
};

const partnerById = new Map(partners.map((p) => [p.id, p]));
const categoryById = new Map(categories.map((c) => [c.id, c]));
const tagById = new Map(tags.map((t) => [t.id, t]));

const offersRows = offers.map((o) => {
  const partner = partnerById.get(o.partnerId);
  const category = categoryById.get(o.categoryId);
  const tagNames = o.tagIds.map((id) => tagById.get(id)?.name ?? id).join(', ');
  return [
    o.id,
    o.name,
    partner?.name ?? o.partnerId,
    o.shortDescription,
    o.fullDescription,
    o.videoUrl ?? '',
    category?.name ?? o.categoryId,
    tagNames,
    o.claimInstructions ?? '',
    JSON.stringify(o.formFields),
    o.status,
    o.isActive ? 'true' : 'false',
    o.sampleDeliverablePdf ?? '',
    o.champion?.name ?? '',
    o.champion?.title ?? '',
    o.champion?.brand ?? '',
    o.champion?.avatarUrl ?? '',
    o.champion?.linkedInUrl ?? '',
    o.createdAt,
  ];
});

const offersCsv = toCsv(
  [
    'Slug',
    'Name',
    'Partner',
    'Short Description',
    'Full Description',
    'Video URL',
    'Category',
    'Tags',
    'Claim Instructions',
    'Form Fields (JSON)',
    'Status',
    'Is Active',
    'Sample Deliverable',
    'Champion Name',
    'Champion Title',
    'Champion Brand',
    'Champion Avatar URL',
    'Champion LinkedIn URL',
    'Created At',
  ],
  offersRows,
);

writeFileSync(join(OUT, 'offers.csv'), offersCsv);

const partnersRows = partners.map((p) => [p.name, p.website, p.description, p.logo ?? '']);

const partnersCsv = toCsv(
  ['Partner Name', 'Website', 'Offer Partner Description', 'Offer Partner Logo (filename)'],
  partnersRows,
);

writeFileSync(join(OUT, 'partners-reference.csv'), partnersCsv);

console.log(`Wrote ${offers.length} offers, ${partners.length} partners (reference)`);
