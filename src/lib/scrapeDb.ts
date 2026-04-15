import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// SQLite file is bind-mounted into the container at /app/data/1800dtc.db
// in production. Locally we resolve to 1800dtc/1800dtc.db next to the repo
// root so `npm run dev` works without extra setup.
const DB_PATH = process.env.SCRAPE_DB_PATH
  ?? path.join(process.cwd(), '1800dtc', '1800dtc.db');

// Cache one connection per Node process. The monthly cron atomically
// replaces the DB file, which swaps the inode. Our cached handle still
// points at the OLD inode — so watch the file's mtime and re-open when
// it changes. Cheap: stat runs on each call, re-open runs once per swap.
let _db: Database.Database | null = null;
let _dbMtimeMs: number | null = null;

function db(): Database.Database {
  const mtime = fs.statSync(DB_PATH).mtimeMs;
  if (_db && _dbMtimeMs === mtime) return _db;
  if (_db) {
    try {
      _db.close();
    } catch {
      // swallow; the new open below will surface real errors
    }
  }
  // Read-only on a potentially :ro bind mount. The DB is shipped in
  // journal_mode=DELETE (see scraper checkpoint step) so there's no -wal
  // file to open and no lock files to create.
  _db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  _dbMtimeMs = mtime;
  return _db;
}

export interface ListApp {
  slug: string;
  name: string | null;
  logo_url: string | null;
  verified: boolean;
  rating: number | null;
  review_count: number | null;
  brand_count: number | null;
  categories: string[];
  tag_count: number;
  pricing_tier_count: number;
  media_count: number;
  has_video: boolean;
  has_case_study: boolean;
}

export interface PricingTier {
  position: number;
  tier_name: string | null;
  price_text: string | null;
  price_monthly: number | null;
  period: string | null;
  features: string[];
}

export interface MediaItem {
  kind: string;
  url: string;
  alt_text: string | null;
  position: number;
}

export interface BrandUse {
  brand_name: string | null;
  brand_logo_url: string | null;
}

export interface CaseStudy {
  title: string | null;
  url: string | null;
  brand_name: string | null;
  content_text: string | null;
}

export interface DetailApp extends ListApp {
  overview: string | null;
  short_desc: string | null;
  website_url: string | null;
  tags: string[];
  pricing_tiers: PricingTier[];
  media: MediaItem[];
  brands_using: BrandUse[];
  case_studies: CaseStudy[];
  source_url: string;       // https://1800dtc.com/tool/{slug}
}

// ── List query ───────────────────────────────────────────────────────
// One wide row per app with aggregated joins.
const LIST_SQL = `
  SELECT
    a.slug,
    a.name,
    COALESCE(a.logo_url, l.logo_url) AS logo_url,
    a.verified,
    a.rating,
    a.review_count,
    a.brand_count,
    (SELECT COUNT(*) FROM app_tags WHERE slug = a.slug) AS tag_count,
    (SELECT COUNT(*) FROM pricing_tiers WHERE slug = a.slug) AS pricing_tier_count,
    (SELECT COUNT(*) FROM media WHERE slug = a.slug) AS media_count,
    (SELECT COUNT(*) FROM media WHERE slug = a.slug AND kind = 'video') AS video_count,
    (SELECT COUNT(*) FROM case_studies WHERE slug = a.slug) AS case_study_count,
    (
      SELECT COALESCE(GROUP_CONCAT(category_name, '|'), '')
      FROM app_categories
      WHERE slug = a.slug
    ) AS categories_joined
  FROM apps a
  LEFT JOIN listings l USING (slug)
  ORDER BY a.brand_count DESC NULLS LAST, a.review_count DESC NULLS LAST, a.name COLLATE NOCASE ASC
`;

export function listApps(): ListApp[] {
  type Row = {
    slug: string;
    name: string | null;
    logo_url: string | null;
    verified: number | null;
    rating: number | null;
    review_count: number | null;
    brand_count: number | null;
    tag_count: number;
    pricing_tier_count: number;
    media_count: number;
    video_count: number;
    case_study_count: number;
    categories_joined: string;
  };
  const rows = db().prepare(LIST_SQL).all() as Row[];
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    logo_url: r.logo_url,
    verified: !!r.verified,
    rating: r.rating,
    review_count: r.review_count,
    brand_count: r.brand_count,
    categories: r.categories_joined
      ? r.categories_joined.split('|').filter((s) => s.length > 0)
      : [],
    tag_count: r.tag_count,
    pricing_tier_count: r.pricing_tier_count,
    media_count: r.media_count,
    has_video: r.video_count > 0,
    has_case_study: r.case_study_count > 0,
  }));
}

// ── Detail query ──────────────────────────────────────────────────────
export function getAppDetail(slug: string): DetailApp | null {
  const d = db();
  type AppRow = {
    slug: string;
    name: string | null;
    verified: number | null;
    logo_url: string | null;
    short_desc: string | null;
    overview: string | null;
    rating: number | null;
    review_count: number | null;
    brand_count: number | null;
    website_url: string | null;
  };
  const app = d
    .prepare(`
      SELECT a.slug, a.name, a.verified, COALESCE(a.logo_url, l.logo_url) AS logo_url,
             a.short_desc, a.overview, a.rating, a.review_count, a.brand_count,
             a.website_url
      FROM apps a
      LEFT JOIN listings l USING (slug)
      WHERE a.slug = ?
    `)
    .get(slug) as AppRow | undefined;
  if (!app) return null;

  const categories = (
    d.prepare(
      `SELECT category_name FROM app_categories WHERE slug = ? ORDER BY category_name`
    ).all(slug) as { category_name: string }[]
  ).map((r) => r.category_name);

  const tags = (
    d.prepare(
      `SELECT tag_name FROM app_tags WHERE slug = ? ORDER BY tag_name`
    ).all(slug) as { tag_name: string }[]
  ).map((r) => r.tag_name);

  type PricingRow = {
    position: number;
    tier_name: string | null;
    price_text: string | null;
    price_monthly: number | null;
    period: string | null;
    features_json: string | null;
  };
  const pricing_tiers: PricingTier[] = (
    d.prepare(
      `SELECT position, tier_name, price_text, price_monthly, period, features_json
       FROM pricing_tiers WHERE slug = ? ORDER BY position`
    ).all(slug) as PricingRow[]
  ).map((r) => {
    let features: string[] = [];
    if (r.features_json) {
      try {
        const parsed: unknown = JSON.parse(r.features_json);
        if (Array.isArray(parsed)) {
          features = parsed.filter((x): x is string => typeof x === 'string');
        }
      } catch {
        features = [];
      }
    }
    return {
      position: r.position,
      tier_name: r.tier_name,
      price_text: r.price_text,
      price_monthly: r.price_monthly,
      period: r.period,
      features,
    };
  });

  const media = d
    .prepare(
      `SELECT kind, url, alt_text, position
       FROM media WHERE slug = ? ORDER BY position`
    )
    .all(slug) as MediaItem[];

  const brands_using = d
    .prepare(
      `SELECT brand_name, brand_logo_url FROM brands_using
       WHERE slug = ? ORDER BY position`
    )
    .all(slug) as BrandUse[];

  const case_studies = d
    .prepare(
      `SELECT title, url, brand_name, content_text FROM case_studies
       WHERE slug = ? ORDER BY position`
    )
    .all(slug) as CaseStudy[];

  const tag_count = tags.length;
  const pricing_tier_count = pricing_tiers.length;
  const media_count = media.length;
  const has_video = media.some((m) => m.kind === 'video');
  const has_case_study = case_studies.length > 0;

  return {
    slug: app.slug,
    name: app.name,
    logo_url: app.logo_url,
    verified: !!app.verified,
    rating: app.rating,
    review_count: app.review_count,
    brand_count: app.brand_count,
    categories,
    tag_count,
    pricing_tier_count,
    media_count,
    has_video,
    has_case_study,
    overview: app.overview,
    short_desc: app.short_desc,
    website_url: app.website_url,
    tags,
    pricing_tiers,
    media,
    brands_using,
    case_studies,
    source_url: `https://1800dtc.com/tool/${app.slug}`,
  };
}
