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
