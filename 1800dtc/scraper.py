#!/usr/bin/env python3
"""
1800dtc.com scraper.

Two-phase multi-agent scrape.
  Phase A (enumerate): walks 94 listing pages at
    https://1800dtc.com/best-shopify-apps?19a60db6_page=N
    and seeds `listings` + `scrape_queue` with each app's slug.
  Phase B (worker): claims one slug at a time from `scrape_queue`,
    fetches /tool/{slug}, parses into normalized tables, marks done.
    Multiple workers can run concurrently — SQLite WAL + atomic
    UPDATE ... RETURNING makes claim races safe.

Also caches raw HTML in `raw_pages` so parser changes can re-run
without re-fetching.

Subcommands:
  init                    create db + schema
  enumerate               phase A (pages 1..94)
  worker                  phase B (claim + scrape detail pages)
  monthly                 all-in-one: enumerate + workers + snapshot + diff
                          + Slack digest + atomic swap into the live DB
  inspect-listing <page>  parse one grid page + print (no db writes)
  inspect-detail <slug>   parse one detail page + print (no db writes)
  status                  counts per queue status
  diff                    print the diff between the last two runs

Env vars:
  SCRAPE_DB_PATH          override the DB path (default: ./1800dtc.db)
  SLACK_BOT_TOKEN         bot token for posting monthly digests
  SLACK_DIGEST_CHANNEL    channel ID (default: C08QRA47JMD = #dtcmvp-mvc)
  BRAND_COUNT_JUMP_MIN    minimum absolute brand-count increase to flag
                          (default 50)
  BRAND_COUNT_JUMP_PCT    minimum % brand-count increase to flag (default 25)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import re
import shutil
import sqlite3
import sys
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Tag

# ─── Paths / constants ──────────────────────────────────────────────

ROOT = Path(__file__).parent
DB_PATH = Path(os.environ.get("SCRAPE_DB_PATH") or (ROOT / "1800dtc.db"))
SCHEMA_PATH = ROOT / "schema.sql"
LOG_PATH = ROOT / "scraper.log"

# Atomic-swap working copy. `monthly` scrapes here, then renames on success.
WORKING_DB_PATH = DB_PATH.with_suffix(".next.db")
PREV_DB_PATH = DB_PATH.with_suffix(".prev.db")

SLACK_DIGEST_CHANNEL = os.environ.get("SLACK_DIGEST_CHANNEL", "C08QRA47JMD")  # #dtcmvp-mvc
BRAND_COUNT_JUMP_MIN = int(os.environ.get("BRAND_COUNT_JUMP_MIN", "50"))
BRAND_COUNT_JUMP_PCT = int(os.environ.get("BRAND_COUNT_JUMP_PCT", "25"))

BASE = "https://1800dtc.com"
LISTINGS_URL = f"{BASE}/best-shopify-apps"
TOTAL_LISTING_PAGES = 94
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
)
REQUEST_DELAY_SEC = 0.6          # polite pacing between network fetches
MAX_ATTEMPTS = 3
RETRY_BACKOFF = [2, 6, 15]       # seconds after 1st/2nd/3rd failure

# ─── Logging ────────────────────────────────────────────────────────

def setup_logging() -> logging.Logger:
    logger = logging.getLogger("1800dtc")
    if logger.handlers:
        return logger
    logger.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    logger.addHandler(sh)
    fh = logging.FileHandler(LOG_PATH)
    fh.setFormatter(fmt)
    logger.addHandler(fh)
    return logger

log = setup_logging()

# ─── DB helpers ─────────────────────────────────────────────────────

# The `monthly` command scrapes into a working copy and atomically swaps
# it in at the end. To avoid threading a db path through every helper,
# we keep a module-level override that connect() reads.
_active_db_path: Path = DB_PATH

def set_active_db(path: Path) -> None:
    global _active_db_path
    _active_db_path = path
    log.info("active db set to %s", path)

def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_active_db_path, timeout=30, isolation_level=None)
    conn.row_factory = sqlite3.Row
    # NOTE: we deliberately do NOT set `journal_mode = WAL` here. WAL is a
    # file-level setting that persists after it's set once (in init_db), so
    # re-issuing it on every connection is redundant and — worse — it
    # counts as a writer operation that can race with finalize's switch
    # back to DELETE. Let new connections inherit the file's mode.
    conn.execute("PRAGMA busy_timeout = 30000")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db() -> None:
    schema = SCHEMA_PATH.read_text()
    with connect() as conn:
        conn.executescript(schema)
        # Set WAL once at init. Persists on the file; every later
        # connect() inherits it automatically.
        conn.execute("PRAGMA journal_mode = WAL")
    log.info("initialized db at %s", _active_db_path)

# ─── HTTP fetch with cache ──────────────────────────────────────────

_session: requests.Session | None = None

def session() -> requests.Session:
    global _session
    if _session is None:
        s = requests.Session()
        s.headers.update({
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        })
        _session = s
    return _session

def fetch(url: str, *, force: bool = False) -> str:
    """Return HTML for url, using raw_pages cache unless force=True."""
    with connect() as conn:
        if not force:
            row = conn.execute(
                "SELECT html, status_code FROM raw_pages WHERE url = ?", (url,)
            ).fetchone()
            if row and row["status_code"] == 200:
                return row["html"] if isinstance(row["html"], str) else row["html"].decode("utf-8", "replace")

    last_exc: Exception | None = None
    for attempt in range(MAX_ATTEMPTS):
        try:
            time.sleep(REQUEST_DELAY_SEC)
            r = session().get(url, timeout=30)
            ct = r.headers.get("content-type", "")
            html = r.text
            with connect() as conn:
                conn.execute(
                    """
                    INSERT INTO raw_pages(url, html, status_code, content_type, fetched_at)
                    VALUES (?, ?, ?, ?, datetime('now'))
                    ON CONFLICT(url) DO UPDATE SET
                      html = excluded.html,
                      status_code = excluded.status_code,
                      content_type = excluded.content_type,
                      fetched_at = datetime('now')
                    """,
                    (url, html, r.status_code, ct),
                )
            if r.status_code >= 500 or r.status_code == 429:
                raise RuntimeError(f"HTTP {r.status_code}")
            r.raise_for_status()
            return html
        except Exception as e:
            last_exc = e
            wait = RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)]
            log.warning("fetch failed (attempt %d/%d) %s — retry in %ds: %s",
                        attempt + 1, MAX_ATTEMPTS, url, wait, e)
            time.sleep(wait)
    raise RuntimeError(f"fetch failed after {MAX_ATTEMPTS} attempts: {url}: {last_exc}")

# ─── Small parse utilities ──────────────────────────────────────────

_ws_re = re.compile(r"\s+")
def clean(s: str | None) -> str:
    if s is None:
        return ""
    return _ws_re.sub(" ", s).strip()

def parse_int_loose(s: str | None) -> int | None:
    if not s:
        return None
    m = re.search(r"[\d,]+", s)
    if not m:
        return None
    try:
        return int(m.group(0).replace(",", ""))
    except ValueError:
        return None

def parse_float_loose(s: str | None) -> float | None:
    if not s:
        return None
    m = re.search(r"\d+(?:\.\d+)?", s)
    return float(m.group(0)) if m else None

# ─── Listing page parser ────────────────────────────────────────────

@dataclass
class ListingCard:
    slug: str
    detail_url: str
    name: str | None = None
    short_desc: str | None = None
    logo_url: str | None = None
    visit_url: str | None = None
    popular_score: int | None = None
    recommended_score: int | None = None

def parse_listing_page(html: str) -> list[ListingCard]:
    soup = BeautifulSoup(html, "lxml")
    # The main grid sits under `.filter-grid .w-dyn-list`, not the header
    # featured list. Pick the w-dyn-list with the most /tool/ links.
    candidates = [
        w for w in soup.select(".filter-grid .w-dyn-list")
        if w.select('a[href*="/tool/"]')
    ]
    if not candidates:
        # Fallback: any w-dyn-list inside .filter-grid
        candidates = soup.select(".filter-grid .w-dyn-list")
    if not candidates:
        return []
    grid = candidates[0]
    cards: list[ListingCard] = []
    for item in grid.select(".w-dyn-item"):
        img_link = item.select_one("a.card-image[href*='/tool/']")
        if not img_link:
            continue
        href = img_link["href"]
        slug = href.split("/tool/")[-1].strip("/").split("?")[0].split("#")[0]
        if not slug:
            continue
        c = ListingCard(slug=slug, detail_url=urljoin(BASE, href))
        name_el = item.select_one(".card-title")
        if name_el:
            c.name = clean(name_el.get_text())
        desc_el = item.select_one(".card-excerpt")
        if desc_el:
            c.short_desc = clean(desc_el.get_text())
        img = img_link.find("img")
        if img:
            c.logo_url = img.get("src") or img.get("data-src")
        visit = item.select_one(".card-buttons a[href], .grid-button[href]")
        if visit:
            c.visit_url = visit.get("href")
        for hidden in item.select(".hidden > div"):
            field_name = hidden.get("fs-cmsfilter-field") or ""
            val = parse_int_loose(hidden.get_text())
            if field_name == "popular":
                c.popular_score = val
            elif field_name == "recommended":
                c.recommended_score = val
        cards.append(c)
    return cards

# ─── Detail page parser ─────────────────────────────────────────────

@dataclass
class PricingTier:
    position: int
    tier_name: str | None
    price_text: str | None
    period: str | None
    features: list[str] = field(default_factory=list)

@dataclass
class MediaItem:
    kind: str
    url: str
    alt_text: str | None = None

@dataclass
class BrandUse:
    brand_name: str | None
    brand_logo_url: str | None

@dataclass
class CaseStudy:
    title: str | None
    url: str | None
    brand_name: str | None
    content_text: str | None

@dataclass
class ExtraKV:
    section: str
    key: str | None
    value_text: str | None = None
    value_json: str | None = None

@dataclass
class DetailData:
    slug: str
    name: str | None = None
    verified: bool = False
    logo_url: str | None = None
    short_desc: str | None = None
    overview: str | None = None
    rating: float | None = None
    review_count: int | None = None
    brand_count: int | None = None
    website_url: str | None = None
    pricing_note: str | None = None
    categories: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    pricing_tiers: list[PricingTier] = field(default_factory=list)
    media: list[MediaItem] = field(default_factory=list)
    brands_using: list[BrandUse] = field(default_factory=list)
    case_studies: list[CaseStudy] = field(default_factory=list)
    extras: list[ExtraKV] = field(default_factory=list)

def _is_visible(tag: Tag) -> bool:
    """Webflow hides alternate states via .w-condition-invisible."""
    cur = tag
    while cur is not None and hasattr(cur, "get"):
        classes = cur.get("class") or []
        if "w-condition-invisible" in classes:
            return False
        cur = cur.parent
    return True

def _section_by_h2(soup: BeautifulSoup, *substrings: str) -> Tag | None:
    for h2 in soup.find_all("h2"):
        t = clean(h2.get_text())
        if any(s.lower() in t.lower() for s in substrings):
            return h2.find_parent("section") or h2.parent
    return None

def _visible_section_by_h2(soup: BeautifulSoup, *substrings: str) -> Tag | None:
    """Like _section_by_h2, but skip sections inside a w-condition-invisible ancestor."""
    for h2 in soup.find_all("h2"):
        t = clean(h2.get_text())
        if not any(s.lower() in t.lower() for s in substrings):
            continue
        section = h2.find_parent("section") or h2.parent
        if section is not None and _is_visible(section):
            return section
    return None

def _languages_container(soup: BeautifulSoup, title_substr: str) -> Tag | None:
    """1800dtc packs both 'Category:' and 'Tags:' into .languages.tool-page divs."""
    for el in soup.select(".languages.tool-page"):
        title = el.select_one(".languages__title")
        if title and title_substr.lower() in title.get_text(strip=True).lower():
            return el
    return None

def parse_detail_page(slug: str, html: str) -> DetailData:
    soup = BeautifulSoup(html, "lxml")
    d = DetailData(slug=slug)

    # ── Name ────────────────────────────────────────────────────────
    h1 = soup.find("h1")
    if h1:
        d.name = clean(h1.get_text())

    # ── Verified badge ──────────────────────────────────────────────
    for v in soup.select(".verified-tool"):
        if "w-condition-invisible" in (v.get("class") or []):
            continue
        title = v.select_one(".verified-tooltip-title")
        if title and "Verified" in title.get_text() and "Not" not in title.get_text():
            d.verified = True
        break

    # ── Short description: .truncate-2 inside .tool-hero ────────────
    hero = soup.select_one(".tool-hero")
    if hero:
        for el in hero.select(".truncate-2"):
            if not _is_visible(el):
                continue
            t = clean(el.get_text(" ", strip=True))
            if t:
                d.short_desc = t
                break

    # Note: we intentionally skip the hero logo img — the hero <img> is a
    # "discount-icon" badge, not the tool logo. Listings already captured a
    # clean logo_url from the grid; save_detail reuses it via COALESCE.

    # ── Rating + review count ───────────────────────────────────────
    rating_section = _section_by_h2(soup, " Rating")
    if rating_section:
        rating_vals: list[float] = []
        review_vals: list[int] = []
        for el in rating_section.find_all(string=True):
            parent = el.parent
            if parent is not None and not _is_visible(parent):
                continue
            s = str(el).strip()
            if not s:
                continue
            m = re.fullmatch(r"\d+(?:\.\d+)?", s)
            if m:
                v = float(m.group(0))
                if 0 < v <= 5:
                    rating_vals.append(v)
            m2 = re.fullmatch(r"\(?\s*(\d[\d,]*)\s*reviews?\s*\)?", s, re.IGNORECASE)
            if m2:
                review_vals.append(int(m2.group(1).replace(",", "")))
        if rating_vals:
            d.rating = rating_vals[0]
        if review_vals:
            nonzero = [v for v in review_vals if v > 0]
            d.review_count = nonzero[0] if nonzero else review_vals[0]

    # ── Brand count: unique phrase "NNNN Brands" on page ────────────
    page_text = soup.get_text(" ", strip=True)
    m = re.search(r"(\d[\d,]+)\s+Brands\b", page_text)
    if m:
        d.brand_count = int(m.group(1).replace(",", ""))

    # ── Overview: 'About <Tool>' section body lives in .tool-section-text ──
    about = _section_by_h2(soup, f"About {d.name}" if d.name else "About ")
    if about:
        body = about.select_one(".tool-section-text")
        if body and _is_visible(body):
            d.overview = " ".join(s.strip() for s in body.stripped_strings).strip() or None

    # ── Categories (server-rendered in .languages 'Category:' block) ─
    cat_box = _languages_container(soup, "Category")
    if cat_box:
        for item in cat_box.select(".languages__item"):
            leaf = item.select_one('[fs-cmsfilter-field="category"]')
            name = clean(leaf.get_text()) if leaf else clean(item.get_text(" ", strip=True))
            if name and name not in d.categories:
                d.categories.append(name)
    # Breadcrumb fallback
    if not d.categories:
        for a in soup.select("a.breadcrumbs-link[href*='/tool-category/']"):
            txt = clean(a.get_text())
            if txt and txt not in d.categories:
                d.categories.append(txt)

    # ── Tags (.languages 'Tags:' block, uses .toolmetadatalabel) ────
    tag_box = _languages_container(soup, "Tags")
    if tag_box:
        for item in tag_box.select(".languages__item"):
            leaf = item.select_one(".toolmetadatalabel")
            name = clean(leaf.get_text()) if leaf else clean(item.get_text(" ", strip=True))
            if name and name not in d.tags:
                d.tags.append(name)

    # ── Pricing tiers: the real tier name / starting price live in
    #    the `data-plan` attribute ("<name> / <price> / <period> / [Recommended]")
    #    The visible text is just CMSNest placeholder content. ───────
    for i, plan in enumerate(soup.select(".plan_item")):
        if not _is_visible(plan):
            continue
        raw = plan.get("data-plan", "") or ""
        parts = [clean(p) for p in raw.split("/")] if raw else []
        tier_name = parts[0] if len(parts) > 0 and parts[0] else None
        price_text = parts[1] if len(parts) > 1 and parts[1] else None
        period = parts[2] if len(parts) > 2 and parts[2] else None
        recommended = any("recommend" in p.lower() for p in parts[3:])
        features: list[str] = []
        fe = plan.select_one(".plan_item_features")
        if fe:
            for p in fe.find_all(["p", "li"]):
                t = clean(p.get_text(" ", strip=True))
                if t:
                    features.append(t)
        tier = PricingTier(
            position=i,
            tier_name=tier_name,
            price_text=price_text,
            period=period,
            features=features,
        )
        if recommended:
            tier.features.append("__recommended__")
        d.pricing_tiers.append(tier)

    # ── Videos: iframe[data-src] under .video-embed, non-empty ──────
    video_seen: set[str] = set()
    for iframe in soup.select(".video-embed iframe[data-src]"):
        if not _is_visible(iframe):
            continue
        src = (iframe.get("data-src") or "").strip()
        if src and src not in video_seen:
            video_seen.add(src)
            d.media.append(MediaItem(kind="video", url=src))

    # ── Screenshots: imgs under a media/carousel section ────────────
    media_section = _visible_section_by_h2(soup, f"{d.name} Media" if d.name else " Media")
    if media_section:
        seen_media: set[str] = set()
        for img in media_section.find_all("img"):
            if not _is_visible(img):
                continue
            src = img.get("src") or img.get("data-src")
            if not src or src in seen_media:
                continue
            if "website-files.com" not in src:
                continue
            seen_media.add(src)
            d.media.append(MediaItem(
                kind="screenshot",
                url=src,
                alt_text=clean(img.get("alt") or "") or None,
            ))

    # ── Brands using: only the VISIBLE section (skip invisible dupes) ─
    brands_section = _visible_section_by_h2(
        soup,
        f"Top brands that use {d.name}" if d.name else "Top brands that use",
        "Brands Using",
    )
    if brands_section:
        seen_brand: set[str] = set()
        for img in brands_section.find_all("img"):
            if not _is_visible(img):
                continue
            src = img.get("src") or img.get("data-src")
            if not src or src in seen_brand:
                continue
            if "website-files.com" not in src:
                continue
            seen_brand.add(src)
            alt = clean(img.get("alt") or "") or None
            d.brands_using.append(BrandUse(brand_name=alt, brand_logo_url=src))

    # ── Case study link in the breadcrumb strip ─────────────────────
    # The `a.mainlinkreads` anchor is rendered on every tool page as a
    # template; pages without a real case study leave href="#" and the
    # label as just "FEATURED CASE STUDY". Require a real external URL
    # AND extra text beyond the generic label before we count it.
    cs_link = soup.select_one("a.mainlinkreads[href]")
    if cs_link:
        href = (cs_link.get("href") or "").strip()
        cs_text = " ".join(cs_link.stripped_strings).strip()
        is_real_url = href.startswith(("http://", "https://"))
        has_real_title = cs_text and cs_text.upper() != "FEATURED CASE STUDY"
        if is_real_url and has_real_title:
            d.case_studies.append(CaseStudy(
                title=cs_text,
                url=href,
                brand_name=None,
                content_text=cs_text,
            ))

    # ── Primary outbound link — any visible /go/{slug} affiliate anchor ──
    for a in soup.find_all("a", href=True):
        href = a.get("href", "")
        if "1800dtc.com/go/" not in href:
            continue
        if not _is_visible(a):
            continue
        d.website_url = href
        break

    # ── FAQ ─────────────────────────────────────────────────────────
    faq_section = _visible_section_by_h2(soup, "FAQs", "FAQ")
    if faq_section:
        for item in faq_section.select(".faq_item, .w-dyn-item, li"):
            if not _is_visible(item):
                continue
            t = clean(item.get_text(" ", strip=True))
            if t:
                d.extras.append(ExtraKV(section="faq", key=None, value_text=t))

    # ── Integrations (usually CMS-populated, often empty in static) ─
    integ_section = _visible_section_by_h2(soup, "Integrations")
    if integ_section:
        for item in integ_section.find_all(["li", "a"]):
            if not _is_visible(item):
                continue
            t = clean(item.get_text(" ", strip=True))
            if t:
                d.extras.append(ExtraKV(section="integrations", key=None, value_text=t))

    # ── Similar tools (cross-references we'll want later) ───────────
    similar_section = _visible_section_by_h2(soup, "Similar Tools")
    if similar_section:
        for a in similar_section.select('a[href*="/tool/"]'):
            href = a.get("href", "")
            other = href.split("/tool/")[-1].strip("/").split("?")[0]
            if other and other != slug:
                d.extras.append(ExtraKV(
                    section="similar_tools",
                    key=other,
                    value_text=clean(a.get_text()) or None,
                ))

    return d

# ─── Writers ────────────────────────────────────────────────────────

def _upsert_many(conn: sqlite3.Connection, name_list: Iterable[str], table: str) -> None:
    for n in name_list:
        n = clean(n)
        if not n:
            continue
        conn.execute(f"INSERT OR IGNORE INTO {table}(name) VALUES (?)", (n,))

def save_listings(cards: list[ListingCard], page_num: int) -> int:
    inserted = 0
    with connect() as conn:
        conn.execute("BEGIN IMMEDIATE")
        try:
            for idx, c in enumerate(cards):
                conn.execute("""
                    INSERT INTO listings(slug, detail_url, name, short_desc, logo_url,
                                         listing_page, position_on_page, first_seen_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
                    ON CONFLICT(slug) DO UPDATE SET
                      detail_url = excluded.detail_url,
                      name = COALESCE(excluded.name, listings.name),
                      short_desc = COALESCE(excluded.short_desc, listings.short_desc),
                      logo_url = COALESCE(excluded.logo_url, listings.logo_url),
                      listing_page = excluded.listing_page,
                      position_on_page = excluded.position_on_page
                """, (c.slug, c.detail_url, c.name, c.short_desc, c.logo_url,
                      page_num, idx))
                conn.execute("""
                    INSERT INTO scrape_queue(slug, status) VALUES (?, 'pending')
                    ON CONFLICT(slug) DO NOTHING
                """, (c.slug,))
                inserted += 1
            conn.execute("COMMIT")
        except Exception:
            conn.execute("ROLLBACK")
            raise
    return inserted

def save_detail(d: DetailData) -> None:
    with connect() as conn:
        conn.execute("BEGIN IMMEDIATE")
        try:
            # The detail-page hero <img> is the site's discount-unlocked badge,
            # not the tool's logo. Fall back to the listing-card logo which we
            # captured in phase A.
            logo_url = d.logo_url
            if not logo_url:
                row = conn.execute("SELECT logo_url FROM listings WHERE slug = ?", (d.slug,)).fetchone()
                if row:
                    logo_url = row["logo_url"]

            conn.execute("""
                INSERT INTO apps(slug, name, verified, logo_url, short_desc, overview,
                                 rating, review_count, brand_count, website_url,
                                 pricing_note, scraped_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(slug) DO UPDATE SET
                  name = excluded.name,
                  verified = excluded.verified,
                  logo_url = COALESCE(excluded.logo_url, apps.logo_url),
                  short_desc = excluded.short_desc,
                  overview = excluded.overview,
                  rating = excluded.rating,
                  review_count = excluded.review_count,
                  brand_count = excluded.brand_count,
                  website_url = excluded.website_url,
                  pricing_note = excluded.pricing_note,
                  scraped_at = datetime('now')
            """, (d.slug, d.name, 1 if d.verified else 0, logo_url, d.short_desc,
                  d.overview, d.rating, d.review_count, d.brand_count, d.website_url,
                  d.pricing_note))

            _upsert_many(conn, d.categories, "categories")
            conn.execute("DELETE FROM app_categories WHERE slug = ?", (d.slug,))
            for c in d.categories:
                c = clean(c)
                if c:
                    conn.execute("INSERT OR IGNORE INTO app_categories(slug, category_name) VALUES (?, ?)",
                                 (d.slug, c))

            _upsert_many(conn, d.tags, "tags")
            conn.execute("DELETE FROM app_tags WHERE slug = ?", (d.slug,))
            for t in d.tags:
                t = clean(t)
                if t:
                    conn.execute("INSERT OR IGNORE INTO app_tags(slug, tag_name) VALUES (?, ?)",
                                 (d.slug, t))

            conn.execute("DELETE FROM pricing_tiers WHERE slug = ?", (d.slug,))
            for t in d.pricing_tiers:
                conn.execute("""
                    INSERT INTO pricing_tiers(slug, position, tier_name, price_text,
                                              price_monthly, period, features_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (d.slug, t.position, t.tier_name, t.price_text,
                      parse_float_loose(t.price_text), t.period,
                      json.dumps(t.features, ensure_ascii=False)))

            conn.execute("DELETE FROM media WHERE slug = ?", (d.slug,))
            for i, m in enumerate(d.media):
                conn.execute("""
                    INSERT INTO media(slug, kind, url, alt_text, position)
                    VALUES (?, ?, ?, ?, ?)
                """, (d.slug, m.kind, m.url, m.alt_text, i))

            conn.execute("DELETE FROM brands_using WHERE slug = ?", (d.slug,))
            for i, b in enumerate(d.brands_using):
                conn.execute("""
                    INSERT INTO brands_using(slug, brand_name, brand_logo_url, position)
                    VALUES (?, ?, ?, ?)
                """, (d.slug, b.brand_name, b.brand_logo_url, i))

            conn.execute("DELETE FROM case_studies WHERE slug = ?", (d.slug,))
            for i, cs in enumerate(d.case_studies):
                conn.execute("""
                    INSERT INTO case_studies(slug, title, brand_name, url, content_text, content_html, position)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (d.slug, cs.title, cs.brand_name, cs.url, cs.content_text, None, i))

            conn.execute("DELETE FROM app_extras WHERE slug = ?", (d.slug,))
            for i, e in enumerate(d.extras):
                conn.execute("""
                    INSERT INTO app_extras(slug, section, key, value_text, value_json, position)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (d.slug, e.section, e.key, e.value_text, e.value_json, i))

            conn.execute("COMMIT")
        except Exception:
            conn.execute("ROLLBACK")
            raise

# ─── Queue claim (atomic, multi-agent safe) ─────────────────────────

def claim_slug(worker_id: str) -> str | None:
    """Claim one pending slug atomically. Returns the slug, or None if queue empty.

    Uses UPDATE ... RETURNING on a CTE-selected row. SQLite serializes writes
    so two workers calling this simultaneously get distinct slugs (or one gets
    None). Busy_timeout covers the brief lock contention.
    """
    with connect() as conn:
        row = conn.execute(
            """
            UPDATE scrape_queue
               SET status = 'in_progress',
                   worker_id = ?,
                   claimed_at = datetime('now'),
                   attempts = attempts + 1
             WHERE slug = (
                     SELECT slug FROM scrape_queue
                      WHERE status = 'pending'
                      ORDER BY slug
                      LIMIT 1
                   )
            RETURNING slug
            """,
            (worker_id,),
        ).fetchone()
        return row["slug"] if row else None

def mark_done(slug: str) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE scrape_queue SET status='done', completed_at=datetime('now'), last_error=NULL WHERE slug=?",
            (slug,),
        )

def mark_failed(slug: str, err: str, *, retryable: bool) -> None:
    """If retryable and below attempts cap, return to 'pending'; else 'failed'."""
    with connect() as conn:
        row = conn.execute("SELECT attempts FROM scrape_queue WHERE slug=?", (slug,)).fetchone()
        attempts = row["attempts"] if row else 0
        new_status = "pending" if retryable and attempts < MAX_ATTEMPTS else "failed"
        conn.execute("""
            UPDATE scrape_queue
               SET status = ?,
                   last_error = ?,
                   last_error_at = datetime('now')
             WHERE slug = ?
        """, (new_status, err[:500], slug))

# ─── Snapshots + diff + Slack digest ───────────────────────────────

def _stable_hash(values: Iterable[str]) -> str:
    items = sorted(v.strip() for v in values if v and v.strip())
    h = hashlib.sha1()
    for v in items:
        h.update(v.encode("utf-8"))
        h.update(b"\0")
    return h.hexdigest()[:16]

def take_snapshot(run_id: int) -> int:
    """Write one scrape_snapshots row per app. Returns row count."""
    with connect() as conn:
        rows = conn.execute("""
            SELECT
              a.slug, a.verified, a.rating, a.review_count, a.brand_count,
              (SELECT COUNT(*) FROM app_categories WHERE slug = a.slug)  AS category_count,
              (SELECT COUNT(*) FROM app_tags       WHERE slug = a.slug)  AS tag_count,
              (SELECT COUNT(*) FROM pricing_tiers  WHERE slug = a.slug)  AS pricing_tier_count,
              (SELECT COUNT(*) FROM media          WHERE slug = a.slug)  AS media_count,
              (SELECT COUNT(*) FROM media          WHERE slug = a.slug AND kind = 'video') AS video_count,
              (SELECT COUNT(*) FROM brands_using   WHERE slug = a.slug)  AS brand_logo_count,
              (SELECT COUNT(*) FROM case_studies   WHERE slug = a.slug)  AS case_study_count
            FROM apps a
        """).fetchall()

        # Pull linked lists for hashing in one go, grouped by slug.
        cat_by_slug: dict[str, list[str]] = {}
        for r in conn.execute("SELECT slug, category_name FROM app_categories"):
            cat_by_slug.setdefault(r["slug"], []).append(r["category_name"])
        tag_by_slug: dict[str, list[str]] = {}
        for r in conn.execute("SELECT slug, tag_name FROM app_tags"):
            tag_by_slug.setdefault(r["slug"], []).append(r["tag_name"])
        price_by_slug: dict[str, list[str]] = {}
        for r in conn.execute(
            "SELECT slug, tier_name, price_text, period, features_json "
            "FROM pricing_tiers ORDER BY slug, position"
        ):
            key = f"{r['tier_name']}|{r['price_text']}|{r['period']}|{r['features_json']}"
            price_by_slug.setdefault(r["slug"], []).append(key)
        case_by_slug: dict[str, list[str]] = {}
        for r in conn.execute("SELECT slug, url FROM case_studies"):
            if r["url"]:
                case_by_slug.setdefault(r["slug"], []).append(r["url"])

        inserted = 0
        for r in rows:
            slug = r["slug"]
            conn.execute("""
                INSERT INTO scrape_snapshots(
                    run_id, slug, verified, rating, review_count, brand_count,
                    category_count, tag_count, pricing_tier_count,
                    media_count, video_count, brand_logo_count, case_study_count,
                    categories_hash, tags_hash, pricing_hash, case_study_urls_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                run_id, slug, r["verified"], r["rating"], r["review_count"], r["brand_count"],
                r["category_count"], r["tag_count"], r["pricing_tier_count"],
                r["media_count"], r["video_count"], r["brand_logo_count"], r["case_study_count"],
                _stable_hash(cat_by_slug.get(slug, [])),
                _stable_hash(tag_by_slug.get(slug, [])),
                _stable_hash(price_by_slug.get(slug, [])),
                _stable_hash(case_by_slug.get(slug, [])),
            ))
            inserted += 1
        return inserted

@dataclass
class ChangeEvent:
    kind: str        # NEW | REMOVED | VERIFIED_TRUE | VERIFIED_FALSE
                     # | CASE_STUDY_ADDED | PRICING_CHANGED
                     # | BRAND_COUNT_JUMP | REVIEWS_JUMP
    slug: str
    name: str | None
    detail: str
    # numeric deltas where relevant
    before: Any = None
    after: Any = None

def diff_runs(prev_run_id: int, cur_run_id: int) -> list[ChangeEvent]:
    """Compare two scrape_snapshots runs and emit change events."""
    with connect() as conn:
        # Pull both snapshots as dicts keyed by slug
        def rows_for(rid: int) -> dict[str, sqlite3.Row]:
            return {
                r["slug"]: r
                for r in conn.execute(
                    "SELECT * FROM scrape_snapshots WHERE run_id = ?", (rid,)
                )
            }
        prev = rows_for(prev_run_id)
        cur = rows_for(cur_run_id)
        name_by_slug = {
            r["slug"]: r["name"]
            for r in conn.execute("SELECT slug, name FROM apps")
        }

    events: list[ChangeEvent] = []

    # NEW: slugs in cur but not prev
    for slug in cur.keys() - prev.keys():
        events.append(ChangeEvent(
            kind="NEW", slug=slug, name=name_by_slug.get(slug),
            detail="first appearance on 1800dtc",
        ))
    # REMOVED: slugs in prev but not cur
    for slug in prev.keys() - cur.keys():
        events.append(ChangeEvent(
            kind="REMOVED", slug=slug, name=name_by_slug.get(slug),
            detail="no longer listed",
        ))
    # Per-slug field changes
    for slug in cur.keys() & prev.keys():
        p, c = prev[slug], cur[slug]
        name = name_by_slug.get(slug)
        if (p["verified"] or 0) == 0 and (c["verified"] or 0) == 1:
            events.append(ChangeEvent(
                kind="VERIFIED_TRUE", slug=slug, name=name,
                detail="flipped verified=true (likely became a 1800dtc client)",
            ))
        elif (p["verified"] or 0) == 1 and (c["verified"] or 0) == 0:
            events.append(ChangeEvent(
                kind="VERIFIED_FALSE", slug=slug, name=name,
                detail="flipped verified=false",
            ))
        if (c["case_study_count"] or 0) > (p["case_study_count"] or 0):
            events.append(ChangeEvent(
                kind="CASE_STUDY_ADDED", slug=slug, name=name,
                detail=f"case studies {p['case_study_count']} → {c['case_study_count']}",
                before=p["case_study_count"], after=c["case_study_count"],
            ))
        elif (p["case_study_urls_hash"] or "") != (c["case_study_urls_hash"] or "") \
             and (c["case_study_count"] or 0) >= 1:
            events.append(ChangeEvent(
                kind="CASE_STUDY_ADDED", slug=slug, name=name,
                detail="case study url changed",
            ))
        if (p["pricing_hash"] or "") != (c["pricing_hash"] or ""):
            events.append(ChangeEvent(
                kind="PRICING_CHANGED", slug=slug, name=name,
                detail=f"tiers {p['pricing_tier_count']} → {c['pricing_tier_count']}",
                before=p["pricing_tier_count"], after=c["pricing_tier_count"],
            ))
        pb = p["brand_count"] or 0
        cb = c["brand_count"] or 0
        if cb > pb:
            abs_jump = cb - pb
            pct_jump = (abs_jump / pb * 100) if pb > 0 else 100.0
            if abs_jump >= BRAND_COUNT_JUMP_MIN or pct_jump >= BRAND_COUNT_JUMP_PCT:
                events.append(ChangeEvent(
                    kind="BRAND_COUNT_JUMP", slug=slug, name=name,
                    detail=f"brands {pb} → {cb} (+{abs_jump}, +{pct_jump:.0f}%)",
                    before=pb, after=cb,
                ))
    return events

def last_two_run_ids() -> tuple[int | None, int | None]:
    with connect() as conn:
        rows = conn.execute("""
            SELECT DISTINCT run_id FROM scrape_snapshots
            ORDER BY run_id DESC LIMIT 2
        """).fetchall()
    if len(rows) < 2:
        return (None, rows[0]["run_id"] if rows else None)
    return (rows[1]["run_id"], rows[0]["run_id"])

def format_digest(events: list[ChangeEvent], run_id: int, app_count: int) -> str:
    """Markdown-ish message for Slack chat.postMessage."""
    if not events:
        return (
            f"*:mag: 1800dtc monthly scrape — run #{run_id}*\n"
            f"{app_count:,} apps scraped, *no meaningful changes* since last run."
        )

    from collections import defaultdict
    by_kind: dict[str, list[ChangeEvent]] = defaultdict(list)
    for e in events:
        by_kind[e.kind].append(e)

    KIND_HEADERS = [
        ("VERIFIED_TRUE", ":white_check_mark: *Flipped to verified* (likely new 1800dtc clients)"),
        ("CASE_STUDY_ADDED", ":scroll: *New / updated case study* (likely new 1800dtc clients)"),
        ("NEW", ":new: *New listings*"),
        ("BRAND_COUNT_JUMP", ":chart_with_upwards_trend: *Big brand-count jumps*"),
        ("PRICING_CHANGED", ":moneybag: *Pricing changed*"),
        ("REMOVED", ":x: *Removed from listings*"),
        ("VERIFIED_FALSE", ":warning: *Flipped to unverified*"),
    ]

    lines = [
        f"*:mag: 1800dtc monthly scrape — run #{run_id}*",
        f"{app_count:,} apps scraped, {len(events)} change events.",
        "",
    ]
    for kind, header in KIND_HEADERS:
        items = by_kind.get(kind, [])
        if not items:
            continue
        lines.append(header + f" ({len(items)})")
        for e in items[:20]:
            display = e.name or e.slug
            slug_link = f"<https://offers.dtcmvp.com/scrape-results|view>"
            source_link = f"<https://1800dtc.com/tool/{e.slug}|1800dtc>"
            lines.append(f"• *{display}* — {e.detail}  ({slug_link} · {source_link})")
        if len(items) > 20:
            lines.append(f"_…and {len(items) - 20} more_")
        lines.append("")
    return "\n".join(lines).rstrip()

def post_slack_digest(message: str) -> dict:
    """POST to Slack chat.postMessage; returns {ok, error}."""
    token = os.environ.get("SLACK_BOT_TOKEN")
    if not token:
        log.warning("SLACK_BOT_TOKEN not set — skipping Slack digest post")
        return {"ok": False, "error": "no_token"}
    r = requests.post(
        "https://slack.com/api/chat.postMessage",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
        },
        data=json.dumps({
            "channel": SLACK_DIGEST_CHANNEL,
            "text": message,
            "unfurl_links": False,
            "unfurl_media": False,
        }),
        timeout=15,
    )
    try:
        result = r.json()
    except Exception:
        result = {"ok": False, "error": f"non-json response (status {r.status_code})"}
    if not result.get("ok"):
        log.error("Slack post failed: %s", result)
    else:
        log.info("Slack digest posted to %s (ts=%s)", SLACK_DIGEST_CHANNEL, result.get("ts"))
    return result

def finalize_db_for_shipping() -> None:
    """Convert WAL → DELETE journal mode and checkpoint so the DB can be
    opened by the offers container on a :ro bind mount.

    Uses a fresh, direct sqlite3 connection (bypassing connect()) so no
    prior pragmas linger. Retries the mode change a few times because
    even right after a checkpoint, a stale reader state can briefly hold
    a SHARED lock that blocks journal_mode changes.
    """
    last_err: Exception | None = None
    for attempt in range(5):
        conn = sqlite3.connect(_active_db_path, timeout=30, isolation_level=None)
        try:
            conn.execute("PRAGMA busy_timeout = 30000")
            ck = conn.execute("PRAGMA wal_checkpoint(TRUNCATE)").fetchone()
            mode = conn.execute("PRAGMA journal_mode = DELETE").fetchone()
            log.info("finalize: checkpoint=%s, journal_mode=%s (attempt %d)",
                     tuple(ck) if ck else None, tuple(mode) if mode else None, attempt + 1)
            if mode and mode[0] == "delete":
                return
            last_err = RuntimeError(f"journal_mode set to {mode[0] if mode else 'unknown'} (wanted delete)")
        except sqlite3.OperationalError as e:
            last_err = e
            log.warning("finalize attempt %d failed: %s — retrying", attempt + 1, e)
        finally:
            conn.close()
        time.sleep(1 + attempt * 2)
    raise RuntimeError(f"finalize_db_for_shipping could not set DELETE mode: {last_err}")

def atomic_swap(working: Path, live: Path, backup: Path) -> None:
    """Promote the working copy to live. Existing live → backup."""
    if live.exists():
        if backup.exists():
            backup.unlink()
        live.rename(backup)
    working.rename(live)
    # tidy WAL sidecars if any lingered (safe no-op on DELETE mode dbs)
    for side in (".db-wal", ".db-shm"):
        sidecar = Path(str(live) + side.replace(".db", ""))
        if sidecar.exists():
            sidecar.unlink()

# ─── Commands ───────────────────────────────────────────────────────

def cmd_init(_: argparse.Namespace) -> None:
    init_db()

def cmd_enumerate(args: argparse.Namespace) -> None:
    start = args.start or 1
    end = args.end or TOTAL_LISTING_PAGES
    with connect() as conn:
        run_id = conn.execute(
            "INSERT INTO scrape_runs(run_type, notes) VALUES ('enumerate', ?) RETURNING id",
            (f"pages {start}..{end}",),
        ).fetchone()["id"]
    total_cards = 0
    pages_fetched = 0
    errors = 0
    for page in range(start, end + 1):
        url = LISTINGS_URL if page == 1 else f"{LISTINGS_URL}?19a60db6_page={page}"
        try:
            html = fetch(url, force=args.force)
            cards = parse_listing_page(html)
            saved = save_listings(cards, page)
            total_cards += saved
            pages_fetched += 1
            log.info("page %d: parsed %d cards (saved %d)", page, len(cards), saved)
        except Exception as e:
            errors += 1
            log.exception("page %d failed: %s", page, e)
    with connect() as conn:
        conn.execute("""
            UPDATE scrape_runs
               SET finished_at = datetime('now'),
                   pages_fetched = ?, items_parsed = ?, errors = ?
             WHERE id = ?
        """, (pages_fetched, total_cards, errors, run_id))
    log.info("enumerate done: pages=%d items=%d errors=%d", pages_fetched, total_cards, errors)

def cmd_worker(args: argparse.Namespace) -> None:
    worker_id = args.worker_id or f"w-{os.getpid()}-{uuid.uuid4().hex[:6]}"
    limit = args.limit
    log.info("worker %s starting (limit=%s)", worker_id, limit)
    with connect() as conn:
        run_id = conn.execute(
            "INSERT INTO scrape_runs(run_type, worker_id) VALUES ('worker', ?) RETURNING id",
            (worker_id,),
        ).fetchone()["id"]

    done = 0
    errors = 0
    while True:
        if limit is not None and done + errors >= limit:
            break
        slug = claim_slug(worker_id)
        if slug is None:
            log.info("queue empty — worker exiting")
            break
        url = f"{BASE}/tool/{slug}"
        try:
            html = fetch(url, force=args.force)
            data = parse_detail_page(slug, html)
            save_detail(data)
            mark_done(slug)
            done += 1
            log.info("✓ %s (rating=%s reviews=%s brands=%s cats=%d tags=%d media=%d)",
                     slug, data.rating, data.review_count, data.brand_count,
                     len(data.categories), len(data.tags), len(data.media))
        except Exception as e:
            errors += 1
            log.exception("✗ %s: %s", slug, e)
            mark_failed(slug, str(e), retryable=True)

    with connect() as conn:
        conn.execute("""
            UPDATE scrape_runs
               SET finished_at = datetime('now'),
                   items_parsed = ?, errors = ?
             WHERE id = ?
        """, (done, errors, run_id))
    log.info("worker %s done: scraped=%d errors=%d", worker_id, done, errors)

def cmd_inspect_listing(args: argparse.Namespace) -> None:
    page = args.page
    url = LISTINGS_URL if page == 1 else f"{LISTINGS_URL}?19a60db6_page={page}"
    html = fetch(url, force=args.force)
    cards = parse_listing_page(html)
    print(f"Page {page}: {len(cards)} cards")
    for c in cards:
        print(f"  [{c.slug}] {c.name} — {(c.short_desc or '')[:100]}")

def cmd_inspect_detail(args: argparse.Namespace) -> None:
    slug = args.slug
    url = f"{BASE}/tool/{slug}"
    html = fetch(url, force=args.force)
    d = parse_detail_page(slug, html)
    out = {
        "slug": d.slug,
        "name": d.name,
        "verified": d.verified,
        "rating": d.rating,
        "review_count": d.review_count,
        "brand_count": d.brand_count,
        "logo_url": d.logo_url,
        "website_url": d.website_url,
        "short_desc": d.short_desc,
        "overview": (d.overview or "")[:300],
        "categories": d.categories,
        "tags": d.tags,
        "pricing_tiers": [t.__dict__ for t in d.pricing_tiers],
        "media_count": len(d.media),
        "media_sample": [m.__dict__ for m in d.media[:5]],
        "brands_using_count": len(d.brands_using),
        "brands_using_sample": [b.__dict__ for b in d.brands_using[:5]],
        "case_studies": [c.__dict__ for c in d.case_studies],
        "extras_by_section": {},
    }
    for e in d.extras:
        out["extras_by_section"].setdefault(e.section, 0)
        out["extras_by_section"][e.section] += 1
    print(json.dumps(out, indent=2, ensure_ascii=False))

def cmd_monthly(args: argparse.Namespace) -> None:
    """All-in-one monthly refresh: copy → scrape → snapshot → diff → swap → Slack."""
    started = time.time()
    log.info("monthly run starting (live=%s, working=%s)", DB_PATH, WORKING_DB_PATH)

    # 1) Prep working copy. If no prior live DB, create from scratch.
    if WORKING_DB_PATH.exists():
        WORKING_DB_PATH.unlink()
    for side in (".next.db-wal", ".next.db-shm"):
        p = Path(str(DB_PATH).replace(".db", side))
        if p.exists():
            p.unlink()
    if DB_PATH.exists():
        shutil.copy2(DB_PATH, WORKING_DB_PATH)
        log.info("copied live → working")
    set_active_db(WORKING_DB_PATH)
    init_db()  # apply any new schema (IF NOT EXISTS)

    # 2) Reset queue so every slug re-scrapes this run. New slugs found by
    #    enumerate will be inserted by save_listings().
    with connect() as conn:
        conn.execute("""
            UPDATE scrape_queue
               SET status = 'pending',
                   worker_id = NULL,
                   claimed_at = NULL,
                   completed_at = NULL,
                   attempts = 0,
                   last_error = NULL,
                   last_error_at = NULL
        """)
    # Clear the HTTP cache — we want fresh pages for the diff to be meaningful.
    with connect() as conn:
        conn.execute("DELETE FROM raw_pages")
    log.info("reset scrape_queue + raw_pages")

    # 3) Open a master 'monthly' run row and sub-runs for enumerate/worker.
    with connect() as conn:
        monthly_run_id = conn.execute(
            "INSERT INTO scrape_runs(run_type, notes) VALUES ('monthly', ?) RETURNING id",
            (f"working={WORKING_DB_PATH.name}",),
        ).fetchone()["id"]
    log.info("monthly run_id=%d", monthly_run_id)

    # 4) Enumerate all listing pages (force-fetch)
    enum_args = argparse.Namespace(start=1, end=TOTAL_LISTING_PAGES, force=True)
    cmd_enumerate(enum_args)

    # 5) Single-worker drain. Simpler + polite-enough for monthly at 4am.
    #    Takes ~12-14 min. Pass --force so worker re-fetches detail pages.
    worker_args = argparse.Namespace(worker_id=f"monthly-{monthly_run_id}",
                                     limit=None, force=True)
    cmd_worker(worker_args)

    # 6) Take the snapshot bound to THIS monthly run
    inserted = take_snapshot(monthly_run_id)
    log.info("snapshot: %d rows bound to run #%d", inserted, monthly_run_id)

    # 7) Diff against the previous snapshot if there is one
    prev_run_id, cur_run_id = last_two_run_ids()
    events: list[ChangeEvent] = []
    if prev_run_id is None:
        log.info("no prior snapshot — first monthly run, no diff")
    else:
        events = diff_runs(prev_run_id, cur_run_id or monthly_run_id)
        log.info("diff vs run #%d: %d events", prev_run_id, len(events))

    app_count = inserted

    # 8) Update the monthly run row with totals
    elapsed = int(time.time() - started)
    with connect() as conn:
        conn.execute("""
            UPDATE scrape_runs
               SET finished_at = datetime('now'),
                   items_parsed = ?,
                   notes = ?
             WHERE id = ?
        """, (app_count,
              f"events={len(events)} elapsed={elapsed}s", monthly_run_id))

    # 9) Finalize journal mode so live readers on a :ro mount can open it
    finalize_db_for_shipping()
    set_active_db(DB_PATH)  # flip module default back; no new connections yet

    # 10) Compose + post the digest
    digest = format_digest(events, monthly_run_id, app_count)
    log.info("digest:\n%s", digest)
    if args.dry_run:
        log.info("--dry-run: skipping atomic swap + Slack post")
        print(digest)
        return
    if args.skip_slack:
        log.info("--skip-slack: not posting digest")
    else:
        post_slack_digest(digest)

    # 11) Promote working DB to live (atomic on same FS)
    atomic_swap(WORKING_DB_PATH, DB_PATH, PREV_DB_PATH)
    log.info("atomic swap complete: working → live (prev backed up to %s)", PREV_DB_PATH.name)
    log.info("monthly run done in %ds", elapsed)

def cmd_diff(args: argparse.Namespace) -> None:
    prev_run_id, cur_run_id = last_two_run_ids()
    if prev_run_id is None or cur_run_id is None:
        print("Need at least two snapshot runs to diff.")
        return
    events = diff_runs(prev_run_id, cur_run_id)
    digest = format_digest(events, cur_run_id, app_count=0)
    print(digest)
    if args.post:
        post_slack_digest(digest)

def cmd_status(_: argparse.Namespace) -> None:
    with connect() as conn:
        qc = {r["status"]: r["c"] for r in conn.execute(
            "SELECT status, COUNT(*) c FROM scrape_queue GROUP BY status"
        ).fetchall()}
        app_count = conn.execute("SELECT COUNT(*) c FROM apps").fetchone()["c"]
        listing_count = conn.execute("SELECT COUNT(*) c FROM listings").fetchone()["c"]
        raw_count = conn.execute("SELECT COUNT(*) c FROM raw_pages").fetchone()["c"]
        runs = conn.execute(
            "SELECT id, run_type, worker_id, started_at, finished_at, items_parsed, errors "
            "FROM scrape_runs ORDER BY id DESC LIMIT 5"
        ).fetchall()
    print("queue:", qc)
    print(f"listings: {listing_count}  apps: {app_count}  raw_pages: {raw_count}")
    print("recent runs:")
    for r in runs:
        print(f"  #{r['id']} {r['run_type']} worker={r['worker_id']} "
              f"started={r['started_at']} finished={r['finished_at']} "
              f"items={r['items_parsed']} errors={r['errors']}")

# ─── Main ───────────────────────────────────────────────────────────

def main() -> None:
    p = argparse.ArgumentParser(description="1800dtc.com scraper")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("init", help="create db + schema")

    e = sub.add_parser("enumerate", help="phase A: walk listing pages")
    e.add_argument("--start", type=int, default=None)
    e.add_argument("--end", type=int, default=None)
    e.add_argument("--force", action="store_true", help="re-fetch even if cached")
    e.set_defaults(func=cmd_enumerate)

    w = sub.add_parser("worker", help="phase B: scrape detail pages from queue")
    w.add_argument("--worker-id", default=None)
    w.add_argument("--limit", type=int, default=None)
    w.add_argument("--force", action="store_true", help="re-fetch even if cached")
    w.set_defaults(func=cmd_worker)

    il = sub.add_parser("inspect-listing", help="parse one listing page + print")
    il.add_argument("page", type=int)
    il.add_argument("--force", action="store_true")
    il.set_defaults(func=cmd_inspect_listing)

    id_ = sub.add_parser("inspect-detail", help="parse one detail page + print")
    id_.add_argument("slug")
    id_.add_argument("--force", action="store_true")
    id_.set_defaults(func=cmd_inspect_detail)

    s = sub.add_parser("status", help="queue + run stats")
    s.set_defaults(func=cmd_status)

    m = sub.add_parser("monthly",
                       help="end-to-end monthly refresh: scrape + snapshot + diff + Slack + swap")
    m.add_argument("--dry-run", action="store_true",
                   help="do the scrape + diff, print the digest, but don't Slack or swap")
    m.add_argument("--skip-slack", action="store_true",
                   help="run + swap but skip the Slack post")
    m.set_defaults(func=cmd_monthly)

    df = sub.add_parser("diff",
                        help="print the diff between the last two snapshot runs")
    df.add_argument("--post", action="store_true", help="also post to Slack")
    df.set_defaults(func=cmd_diff)

    args = p.parse_args()
    if args.cmd == "init":
        cmd_init(args)
    else:
        args.func(args)

if __name__ == "__main__":
    main()
