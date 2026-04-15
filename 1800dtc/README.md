# 1800dtc.com scraper

One-time scrape of https://1800dtc.com/best-shopify-apps to seed the offers product.

## Quickstart

```bash
cd /Users/peter/Documents/GitHub/dtcmvp-offers/1800dtc
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# 1. Create the SQLite database + schema
.venv/bin/python scraper.py init

# 2. (Sanity) parse one listing page + one detail page without writing to DB
.venv/bin/python scraper.py inspect-listing 1
.venv/bin/python scraper.py inspect-detail klaviyo

# 3. Phase A — walk all 94 listing pages, seed listings + scrape_queue
.venv/bin/python scraper.py enumerate

# 4. Phase B — workers claim slugs from the queue and scrape detail pages.
#    Run this in 1..N terminal windows in parallel (SQLite WAL makes it safe).
.venv/bin/python scraper.py worker

# 5. Check progress any time
.venv/bin/python scraper.py status
```

## Monthly refresh (on DO droplet)

Production runs `./run-monthly.sh` via host cron on the 1st of each month
(4am UTC). The script:

1. Git-pulls the offers repo so the scraper code is current
2. Refreshes the Python venv
3. Runs `scraper.py monthly` pointed at the LIVE DB at `~/dtcmvp-offers/data/1800dtc.db`
4. `monthly` copies live → `1800dtc.next.db`, re-scrapes every listing,
   snapshots into `scrape_snapshots`, diffs against the previous snapshot,
   posts a Slack digest of changes to `#dtcmvp-mvc`, and atomically renames
   the working copy into place (previous DB moves to `1800dtc.prev.db`
   as a backup)
5. Restarts the `dtcmvp-offers-frontend` container so the Next.js app's
   cached sqlite handle picks up the new file

Setup + invocation documented in `deploy/README-DEPLOY.md`.

Change events the digest surfaces:

| Event | Meaning |
|---|---|
| `NEW` | slug appeared for the first time |
| `REMOVED` | slug no longer in 1800dtc's listings |
| `VERIFIED_TRUE` | the "verified / paying client" badge flipped on |
| `VERIFIED_FALSE` | the verified badge flipped off |
| `CASE_STUDY_ADDED` | a new featured case study appeared (strong signal of new 1800dtc client) |
| `PRICING_CHANGED` | the pricing-tier composition hash changed |
| `BRAND_COUNT_JUMP` | brand logos ≥+50 OR ≥+25% vs last snapshot (tunable via env) |

## After a scrape run: finalize for read-only mounting

The scraper writes in WAL journal mode (fast concurrent writes for workers).
Before shipping the DB to a read-only production mount (`offers.dtcmvp.com`
bind-mounts it at `/app/data/1800dtc.db:ro`), convert it to DELETE journal
mode so SQLite doesn't try to open a -wal file that no longer exists:

```bash
.venv/bin/python -c "import sqlite3; c=sqlite3.connect('1800dtc.db'); \
  c.execute('PRAGMA wal_checkpoint(TRUNCATE)'); \
  c.execute('PRAGMA journal_mode=DELETE'); c.close()"
```

Then `scp 1800dtc.db deploy@142.93.27.155:~/dtcmvp-offers/data/1800dtc.db`
and the offers container will pick it up on next request
(SQLite is opened lazily; no container restart needed).

## Database layout

Schema lives in `schema.sql`. Key tables:

- `raw_pages` — every URL we fetched, cached verbatim (re-parse without re-fetching)
- `listings` — grid card info (name, short desc, logo, page number, position)
- `apps` — detail-page core fields (rating, review count, brand count, overview)
- `categories` / `app_categories` — M2M on category name (e.g. "Email & SMS")
- `tags` / `app_tags` — M2M on feature tag (e.g. "Predictive Analytics")
- `pricing_tiers` — tier name + period + feature list (prices are JS-rendered and may be NULL)
- `media` — screenshots + video URLs (YouTube embeds via `iframe[data-src]`)
- `brands_using` — brand logos shown on detail page
- `case_studies` — featured case study links
- `app_extras` — catch-all for FAQs, integrations, similar tools, etc.
- `scrape_queue` — work queue; status ∈ {pending, in_progress, done, failed}
- `scrape_runs` — operational log (one row per enumerate/worker invocation)

## Multi-agent workflow

`scrape_queue` is the coordination surface. Any worker can atomically claim a
pending slug via `UPDATE ... RETURNING`, so spinning up multiple terminals
(or Claude sessions) running `scraper.py worker` is safe:

```bash
# window 1
.venv/bin/python scraper.py worker --worker-id alice

# window 2
.venv/bin/python scraper.py worker --worker-id bob
```

Each worker pulls one slug at a time; if a detail-page fetch/parse throws,
the slug is returned to `pending` up to 3 attempts, then marked `failed`.

## Known scraping limitations

- Exact pricing dollar amounts are populated client-side by Webflow JS, so
  `pricing_tiers.price_monthly` will usually be NULL. Tier name, period, and
  feature list are captured.
- The "Integrations" section on most tools is also JS-rendered; what shows
  up in `app_extras` for that section may be sparse.
- We don't execute JS. If we decide we need the JS-rendered fields later,
  swap `requests` for Playwright in `fetch()` — the rest stays the same.
