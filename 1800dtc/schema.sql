-- 1800dtc.com scraper database
-- WAL mode + multi-process safe via atomic claim on scrape_queue.

PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 10000;
PRAGMA foreign_keys = ON;

-- Raw HTTP response cache. Lets parse code re-run without re-fetching.
CREATE TABLE IF NOT EXISTS raw_pages (
  url           TEXT PRIMARY KEY,
  html          BLOB NOT NULL,
  status_code   INTEGER NOT NULL,
  content_type  TEXT,
  fetched_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Row per listing card as seen on the grid pages.
CREATE TABLE IF NOT EXISTS listings (
  slug             TEXT PRIMARY KEY,
  detail_url       TEXT NOT NULL,
  name             TEXT,
  short_desc       TEXT,
  rating           REAL,
  review_count     INTEGER,
  logo_url         TEXT,
  listing_page     INTEGER,
  position_on_page INTEGER,
  first_seen_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Per-detail-page app record. One-to-one with listings.slug.
CREATE TABLE IF NOT EXISTS apps (
  slug          TEXT PRIMARY KEY,
  name          TEXT,
  verified      INTEGER,
  logo_url      TEXT,
  short_desc    TEXT,
  overview      TEXT,
  rating        REAL,
  review_count  INTEGER,
  brand_count   INTEGER,
  pricing_note  TEXT,
  website_url   TEXT,
  scraped_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Categories + tags as many-to-many. Category ~ broad (Email & SMS),
-- tag ~ granular feature (Predictive Analytics).
CREATE TABLE IF NOT EXISTS categories (
  name TEXT PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS app_categories (
  slug          TEXT NOT NULL REFERENCES apps(slug) ON DELETE CASCADE,
  category_name TEXT NOT NULL REFERENCES categories(name) ON DELETE CASCADE,
  PRIMARY KEY (slug, category_name)
);

CREATE TABLE IF NOT EXISTS tags (
  name TEXT PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS app_tags (
  slug     TEXT NOT NULL REFERENCES apps(slug) ON DELETE CASCADE,
  tag_name TEXT NOT NULL REFERENCES tags(name) ON DELETE CASCADE,
  PRIMARY KEY (slug, tag_name)
);

CREATE TABLE IF NOT EXISTS pricing_tiers (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  slug           TEXT NOT NULL REFERENCES apps(slug) ON DELETE CASCADE,
  position       INTEGER,
  tier_name      TEXT,
  price_text     TEXT,
  price_monthly  REAL,
  period         TEXT,
  features_json  TEXT
);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_slug ON pricing_tiers(slug);

-- Screenshots + demo videos + any other embedded media.
CREATE TABLE IF NOT EXISTS media (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  slug      TEXT NOT NULL REFERENCES apps(slug) ON DELETE CASCADE,
  kind      TEXT NOT NULL,  -- 'screenshot' | 'video' | 'logo' | 'other'
  url       TEXT NOT NULL,
  alt_text  TEXT,
  position  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_media_slug ON media(slug);

CREATE TABLE IF NOT EXISTS brands_using (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT NOT NULL REFERENCES apps(slug) ON DELETE CASCADE,
  brand_name      TEXT,
  brand_logo_url  TEXT,
  brand_url       TEXT,
  position        INTEGER
);
CREATE INDEX IF NOT EXISTS idx_brands_using_slug ON brands_using(slug);

CREATE TABLE IF NOT EXISTS case_studies (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT NOT NULL REFERENCES apps(slug) ON DELETE CASCADE,
  title         TEXT,
  brand_name    TEXT,
  url           TEXT,
  content_text  TEXT,
  content_html  TEXT,
  position      INTEGER
);
CREATE INDEX IF NOT EXISTS idx_case_studies_slug ON case_studies(slug);

-- Anything we pull that doesn't fit above (integrations lists, pricing footnotes,
-- "compare to" links, etc.) we drop into this kv table so we don't drop info on
-- the floor. Parser can flag things we haven't modeled yet.
CREATE TABLE IF NOT EXISTS app_extras (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL REFERENCES apps(slug) ON DELETE CASCADE,
  section    TEXT NOT NULL,   -- 'integrations' | 'faq' | 'compare' | etc.
  key        TEXT,
  value_text TEXT,
  value_json TEXT,
  position   INTEGER
);
CREATE INDEX IF NOT EXISTS idx_app_extras_slug ON app_extras(slug);

-- Multi-agent work queue. One row per slug to be fetched + parsed.
-- Workers atomically claim rows by UPDATE … WHERE status='pending' … RETURNING.
CREATE TABLE IF NOT EXISTS scrape_queue (
  slug          TEXT PRIMARY KEY,
  status        TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'in_progress' | 'done' | 'failed'
  worker_id     TEXT,
  claimed_at    TEXT,
  completed_at  TEXT,
  attempts      INTEGER NOT NULL DEFAULT 0,
  last_error    TEXT,
  last_error_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_scrape_queue_status ON scrape_queue(status);

-- Run log for operational visibility.
CREATE TABLE IF NOT EXISTS scrape_runs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  run_type        TEXT NOT NULL,   -- 'enumerate' | 'worker'
  worker_id       TEXT,
  started_at      TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at     TEXT,
  pages_fetched   INTEGER DEFAULT 0,
  items_parsed    INTEGER DEFAULT 0,
  errors          INTEGER DEFAULT 0,
  notes           TEXT
);
