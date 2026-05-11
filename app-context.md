# dtcmvp-offers — partner SWAG marketplace

Standalone Next.js app at **partners.dtcmvp.com**. Brands discover Shopify-app partners that have a published dtcmvp **SWAG** (Scientific Wild-Ass Guess — a first-party ROI analysis), open the partner's detail modal, and click **Generate SWAG** to launch an interactive ROI calculator that computes what that tool is worth to their specific store. Generating a SWAG persists a `Request` record so the brand can come back to it from "my swags / created". Partners get warm intros from brands who have already seen the financial upside.

The marketplace was previously framed as "exclusive partner offers" with a claim-an-offer flow. The full pivot to SWAGs landed 2026-05-07 — see `~/.claude/plans/let-s-keep-pricing-off-ethereal-thimble.md` (backend / data layer) and `~/.claude/plans/ok-we-re-making-major-encapsulated-cloud.md` (frontend rewrite).

Admin tooling under `/admin/*`: `/admin/scrape-results` (1,126 apps from 1800dtc.com) and `/admin/swags` (SWAG review queue with lint + flag-for-fix workflow).

## tech stack

| layer | tech |
|-------|------|
| framework | Next.js 16 (Turbopack), React 19, TypeScript 5 |
| styling | Tailwind CSS 4, Lucide React icons |
| 3D graphics | Three.js (MoleculeLoader animation on the marketplace + SwagLoader) |
| state | React Context (`AuthContext`, `BrandContext`, `ImpersonationContext`) |
| auth | Supabase JWT — proxied through `api.dtcmvpete.com`, mirrors dtcmvp-2.0 |
| backend (Listings/Requests) | Node/Express in `dtcmvp-app/handlers/listings/` (DO droplet) |
| backend (scrape) | `better-sqlite3` reading bind-mounted `/app/data/1800dtc.db` |
| SWAG specs | `better-sqlite3` reading/writing `/app/swag-data/swags.db` |
| primary data store | Airtable base `appnBsoKSUIYu6Nn1` — `Listings` (`tblflFmuuuDhcs0mX`), `Requests`, `Companies`, `Contacts` |
| read cache | SQLite `listings_*` tables in `dtcmvp-tam-large.db` (synced hourly) |

## current state

Live at **https://partners.dtcmvp.com** (deployed via `./deploy/deploy.sh` → DO droplet, host port 3005).

**Brand flow:**
- Marketplace at `/`: one card per partner with a published SWAG. Card shows logo, partner name, tagline, tag chips. Clicking opens the detail modal.
- Detail modal: partner name + tags header, tagline, short description, benefit bullets, "Recommended by …" champion section, and three footer actions:
  - `not for me` (hide, removes from list)
  - `save for later` (toggle, lands in `my swags / saved`)
  - **`generate swag`** (primary) — first-time only. Subsequent visits show **`view swag`**.
- Generate SWAG → `SwagLoader` plays for ~3-5s (typewriter steps + 3D MoleculeLoader) while the spec is fetched and a Request record is upserted. Then the modal swaps to `SwagCalculator` with the partner's spec loaded and the brand's profile applied.
- View SWAG (existing Request) → skips the loader, opens `SwagCalculator` directly.
- Inside the calculator, **`Ask for an intro`** opens a confirmation modal; on submit the CTA flips in-place to **`Intro Requested {date}`** (inline + sticky + the Brief panel). Optimistic local state, persists across reloads via the `intro_requested_at` field on the Request.
- `find swags for me` — green button in the navbar runs the recommendation engine (3D MoleculeLoader animation + brand profile from `data/brandProfile.ts`). Surfaces 2-3 listings as a session-scoped recommendation set.
- `my swags`: three tabs.
  - **created**: every Request record for the logged-in brand. Click any to reopen the calculator. "Add outcome" appends a server-side note (timestamps preserved).
  - **intro requested**: subset of `created` where the brand has clicked Ask for an intro. Each row shows an `intro requested {date}` chip.
  - **saved for later** — listings the brand bookmarked but hasn't generated yet.
- `/[slug]` — deep-linkable URL. Renders the marketplace with the drawer pre-opened on that listing.

**Marketplace sidebar — five structured filter sections** (AND across sections, OR within):
1. **brand category** — `spec.narrative.byCategory` keys minus `Other` (canonical 9: Apparel & Fashion, Beauty & Cosmetics, Health & Wellness, Sports & Fitness, Food & Drink, Home & Electronics, Baby & Kids, Pet & Vet)
2. **benefit type** — `spec.benefits[].type` (3 buckets: cost-saving / revenue-generation / time-saving)
3. **benefit** — `spec.benefits[].label` (canonical 21: CVR Lift, AOV Lift, Ticket Deflection, Attributed Revenue, etc.). All `Attributed Revenue (X)` variants collapse to a single `Attributed Revenue` option in the filter — the underlying spec still carries the specific channel (Email / SMS / Affiliate / DM / Organic / Display) for narrative + drawer copy.
4. **department** — `spec.narrative.byDepartment` keys minus `Other` (canonical 19: CX / Support, Performance / Paid, Retention / CRM, etc.)
5. **tag** — free-form descriptive tags from the spec. Originally 976 long-tail values; consolidated 2026-05-08 to 51 canonical buckets via an algorithmic pre-pass (754 deterministic remaps) + Sonnet residual review (222 remaining). Vertical-named tags (apparel, beauty, etc.) were dropped from this dimension since brand category covers them.

The four structured dimensions are derived from each Listing's underlying SwagSpec by `scripts/sync-listings.js` and pushed to Airtable Listings as `Benefit Types` / `Benefit Labels` / `Departments` / `Categories` multipleSelects, then mirrored to `listings_listings` SQLite.

**Auth (live, mirrors dtcmvp-2.0):**
- Partner login at `/login` — OTP + password, proxied through `api.dtcmvpete.com`.
- Brand login at `/b/[contactId]` — first-name verification against Airtable Contact ID. Old `/brand/...` URLs 301 to `/b/...`.
- Old `/offers/*` and `/swags/*` URLs 301 to root-level paths (after the partners.dtcmvp.com move). Old `offers.dtcmvp.com` DNS is removed.
- Middleware gates everything except `/login`, `/b/*`, `/api/*`, Next internals, and static assets. Cookie-based session with 45-min refresh.

**Admin tooling:**
- `/admin/scrape-results` — searchable/sortable/paginated table over 1800dtc.com scrape (admin-only).
- `/admin/swags` — SWAG review queue with side-by-side review panel + live calculator, sortable lint columns, flag-for-fix workflow.

**Backend (live in dtcmvp-app/handlers/listings/):**
- `GET /api/listings` — public listing index (active listings only). `?status=draft` shows drafts.
- `GET /api/listings/:slug` — single listing detail.
- `GET /api/listings/tags` — tag counts for sidebar / filter UI.
- `POST /api/listings/requests` (auth) — upsert a Request for the authed contact + listing.
- `GET /api/listings/requests/mine` (auth) — Request records for the logged-in brand.
- `PUT /api/listings/requests/:airtableId/notes` (auth) — append outcome note.
- `POST /api/listings/intros` (auth): "Ask for an intro" submission from inside SwagCalculator. Side effects: (a) Slack notification to the intros channel with airtable links to the Meeting + Request records; (b) creates an Airtable Meeting record (`Status='Drafted'`, `SWAG Request=true`, with Brand / Partner / Participant / Host links resolved server-side); (c) PATCHes the matching Request with `Intro Requested At` and backfills the SWAG snapshot fields (`SWAG Total Annual Value`, `SWAG Max Monthly Price`, `SWAG Target ROI Multiple`).
- `GET /api/listings/admin/test-brands` (admin) — search Brand contacts for impersonation.

**Data plumbing:**
- Airtable Listings → `listings_listings` SQLite mirror, hourly sync via PM2 cron. See backend plan for the sync runner shape.
- `Requests` Airtable table dedupes on `(Listing, Contact)`. `createRequest` upserts. SWAG snapshot fields stay null at create-time (the calculator hasn't computed numbers yet) and are backfilled by the intros handler at intro-time, capturing the values the brand saw when they engaged.
- Every Listing has a `Partner` linked record (Companies, Type=Partner). Coverage went 0% → 100% via a four-stage matcher: exact-domain (514) → Shopify App Store slug (30) → LLM swarm via `claude -p` headless (147 high-confidence + 24 medium) → exact-name recovery (6) → newly-created Companies for genuinely-not-in-pool partners (388 vendors covering 396 listings). One-off scripts in `dtcmvp-app/scripts/match-listing-partners*.js` and `create-missing-partners.js`. Idempotent on re-runs.
- Meeting `Host` resolves to the first Contact at the Partner Company (whether or not LinkedIn is set). Falls back to `null` when the Partner has no linked Contacts; admins fill in manually.

**Vocabulary-cleanup history (2026-05-08):**
- **Tag consolidation**: 976 free-form tags → 51 canonical buckets across all 1,115 listings. Algorithmic pre-pass (754 deterministic, dictionary-driven) + Sonnet on the 222-tag residual. 16 vertical tags dropped (already covered by Categories filter). Mapping persisted at `/tmp/tag-mapping-final.json` for re-runs; PATCH via `scripts/apply-tag-mapping.py`.
- **Attributed Revenue canonicalization**: 54 swarm-generated specs had non-canonical channel names (Referral, Push, Chat, Treasury, etc.). Cleanup script (`/tmp/cleanup-attr-rev.py`) remapped 46 to canonical channels (Referral→Affiliate, Push→SMS, etc.), 7 to a different canonical label entirely (Shipping/Protection/B2B/Gift Cards → `Upsell Revenue`, Wholesale/Channel → `Attributed Revenue (Affiliate)`, Wallet → `Attributed Revenue (SMS)`), and 1 (parker-banking-analytics Treasury) was flagged for Sean's manual review. All 54 reset to `status=draft` with `review_notes` describing the change.

## project structure

```
src/
├── app/
│   ├── layout.tsx                       # root — wraps AuthProvider
│   ├── login/page.tsx
│   ├── b/[contactId]/page.tsx           # brand first-name verification
│   ├── (brand)/                         # route group: brand-facing pages share the navbar layout
│   │   ├── layout.tsx                   # navbar + BrandProvider + ImpersonationProvider
│   │   ├── page.tsx                     # `/` — marketplace (server) → SwagsMarketplaceClient
│   │   ├── SwagsMarketplaceClient.tsx
│   │   ├── [slug]/page.tsx              # `/[slug]` deep link → marketplace + drawer pre-opened
│   │   └── my/page.tsx · MySwagsClient.tsx
│   ├── admin/
│   │   ├── layout.tsx · AdminTabs.tsx
│   │   ├── page.tsx                     # → /admin/scrape-results
│   │   ├── scrape-results/              # 1800dtc apps viewer
│   │   └── swags/page.tsx               # SWAG review queue
│   ├── api/
│   │   ├── auth/[...path]/route.ts      # proxy → api.dtcmvpete.com
│   │   ├── swag/route.ts · swag/[slug]/route.ts   # user-facing approved-SWAG endpoints
│   │   ├── swag/admin/list · swag/admin/spec/[slug] · swag/admin/status   # admin
│   │   ├── sheet/route.ts               # Google Sheets CSV proxy (AI research)
│   │   └── scrape-results/apps/         # internal queries against /app/data/1800dtc.db
├── components/
│   ├── common/                          # Badge, Button, Card, Drawer, Input, Modal, MoleculeLoader
│   ├── swags/                           # SwagListingCard, SwagListingDrawer (the partner-detail modal)
│   └── swag/                            # SwagCalculator + supporting (SwagLoader, SwagReport,
│                                        # AskForIntroModal, ProjectionChart, AnimatedValue,
│                                        # SwagDisclaimer, SwagReviewPanel [admin], TestBrandPicker)
├── contexts/
│   ├── AuthContext.tsx                  # session + permissions
│   ├── BrandContext.tsx                 # requests, saved/hidden state, recommendation engine
│   └── ImpersonationContext.tsx         # admin "test as brand" picker
├── lib/
│   ├── auth.ts · api.ts                 # token lifecycle, Listings/Requests fetchers
│   ├── scrapeDb.ts                      # better-sqlite3 reader for 1800dtc.db
│   ├── swagDb.ts                        # better-sqlite3 reader/writer for swags.db
│   ├── serverAuth.ts                    # is_admin check for /admin/scrape-results
│   ├── categoryColors.ts                # color helpers (legacy + tag badge style)
│   └── swag/                            # SWAG engine
│       ├── swag-types.ts                # SwagSpec, BrandProfile, SwagBenefit, etc.
│       ├── swag-engine.ts               # computeSwag(), formula evaluation
│       ├── review.ts                    # lintSwagSpec()
│       ├── format.ts · highlight.tsx · prompt-builder.ts
├── data/
│   └── brandProfile.ts                  # default profile for the recommendation engine
├── types/index.ts                       # Listing, BrandRequest, ListingChampion, RequestStatus, slim Offer (for engine)
└── middleware.ts                        # cookie-based route gating + /offers/* and /swags/* → root 301
```

## auth model

Identical to dtcmvp-2.0 — same `user_profiles` table in Supabase, same JWT, same backend (`api.dtcmvpete.com`). The browser never talks to Supabase directly:

```
browser → /api/auth/[...path] → AUTH_API_URL (api.dtcmvpete.com) → Supabase
```

**`UserProfile` fields used here:** `email`, `username`, `is_admin`, `user_type` (`'admin' | 'partner' | 'brand'`), `airtable_contact_id` (brand users), `partner_airtable_id` (overloaded — partner users → their company; brand users → their company; disambiguate with `user_type`).

**Public paths:** `/login`, `/b/*`, `/api/auth/*`. Everything else redirects to `/login` with `?redirect=<original>`.

## data model

Airtable is the source of truth. SQLite is a read cache (synced hourly) plus write-through for new Requests.

```typescript
// Listing — what the marketplace renders. One row per partner with an approved SWAG.
ApiListing {
  airtable_id, slug, name,
  tagline, short_description, benefit_bullets,   // shortDescription + benefitBullets generated by LLM
  tags[], tier,
  logo_url, partner_url, video_url,
  partner_airtable_id,                            // optional — links to Companies record
  champion_airtable_id, champion_name, champion_title, champion_brand, champion_avatar_url, champion_linkedin_url,
  status: 'active'|'draft'|'archived', is_active,
  created_at
}

// Request — persisted "Generate SWAG" event. Upsert on (Contact, Listing).
ApiRequest {
  airtable_id, listing_slug, listing_name,
  status: 'generated'|'intro_requested'|'intro_sent'|'completed',
  generated_at,
  intro_requested_at,                            // null until the brand clicks Ask for an intro
  notes,
  swag_total_annual_value, swag_max_monthly_price, swag_target_roi_multiple   // backfilled at intro-time
}
```

Notes:
- `Tags` is a multipleSelects field on Listings (lowercase per dtcmvp brand).
- `Champion` is a linked record → Contacts; UI renders the champion's name/title/company/avatar via Airtable lookups.
- Partners are still Companies in Airtable with `Type=Partner`; `partner_airtable_id` on Listings links the SWAG to a real partner record where one exists.
- The `Requests` linked record on Listings is auto-populated by Airtable when a Request is created with a `Listing` link.

## SWAG system

**What is a SWAG:** Scientific Wild-Ass Guess. dtcmvp publishes first-party ROI analyses for Shopify apps. The brand sets a target ROI multiple (5x, 8x, 15x) and we tell them the max they should pay to hit that target. Every number we don't know for certain, we SWAG — and label it as such.

**UX flow:** marketplace card → detail modal → **Generate SWAG** → SwagLoader animation → SwagCalculator (in the same modal). Back arrow returns to detail. Close returns to grid (scroll preserved). Re-opening a partner the brand has already generated for shows **View SWAG** instead of Generate SWAG, which skips the loader and opens the calculator directly.

**Data storage:** SWAG specs live in `swags.db` (writable SQLite at `/app/swag-data/swags.db`), separate from the read-only `1800dtc.db`. Schema:

```sql
swag_specs (
  slug TEXT PRIMARY KEY,       -- matches Listing.slug
  partner_name TEXT NOT NULL,
  spec_json TEXT NOT NULL,     -- full SwagSpec as JSON
  tier INTEGER NOT NULL,       -- 0=public, 1=partner calculator, 2=private data
  status TEXT NOT NULL,        -- 'draft' | 'approved' | 'needs-regen'
  reviewed_by TEXT, reviewed_at TEXT, review_notes TEXT,
  generated_at TEXT NOT NULL, generated_by TEXT,
  created_at TEXT, updated_at TEXT
)
```

Only `status='approved'` specs surface in the user-facing `GET /api/swag` and `GET /api/swag/[slug]` endpoints.

**How specs get into the database:** agents and the `/generate-swag` skill use `scripts/upsert-swag.js` (also see `--seed` and `--batch` modes for bulk inserts). The Listings table is then populated from `swags.db` via `scripts/sync-listings.js` (one-shot per spec, regenerable via `--slugs <csv>`); see the backend plan for full details.

**The SWAG engine** (`src/lib/swag/swag-engine.ts`) evaluates benefit formulas at 3 confidence levels (60%, 80%, 100%), applies category-specific defaults, and computes break-even monthly pricing. The `SwagCalculator` component renders the interactive UI with charts (recharts), narrative briefs, and an "Ask for an intro" CTA.

**generate-swag skill** (`.claude/skills/generate-swag.md`) documents the 5-step process for creating a SWAG spec from a partner's public website. Includes canonical benefit label vocabulary for cross-partner comparability.

**Admin review workflow** (`/admin/swags`): unchanged from the offers era. Drafts land via `upsert-swag.js`, an operator approves / flags / deletes via the side-by-side review panel + live calculator. Lint flags non-canonical labels, em dashes, AI-speak, and >$1M sample totals. Approved specs are eligible for the Listings sync.

## deployment

| target | location | trigger |
|--------|----------|---------|
| Standalone frontend | DO droplet `142.93.27.155`, container `dtcmvp-offers-frontend`, host port 3005 | `./deploy/deploy.sh` (git pull + docker build) |
| Backend handler | container `webhook-server-v2` on same droplet | `dtcmvp-app/deploy.sh` |

The standalone container bind-mounts `./data:/app/data:ro` for the scrape DB and `./swag-data:/app/swag-data` (writable) for SWAG specs. `1800dtc.db` is too large for git — scp'd to the droplet out-of-band (see `deploy/README-DEPLOY.md`).

## env vars

| var | scope | purpose |
|-----|-------|---------|
| `NEXT_PUBLIC_API_URL` | build | `https://webhooks.dtcmvp.com/api` — Listings + Requests + auth + intros backend |
| `NEXT_PUBLIC_APP_URL` | build | `https://partners.dtcmvp.com` (was `offers.dtcmvp.com` until 2026-05-07, then `swags.dtcmvp.com` briefly the same day) |
| `AUTH_API_URL` | runtime | `https://api.dtcmvpete.com` — auth proxy target |
| `SCRAPE_DB_PATH` | runtime | `/app/data/1800dtc.db` (read by `lib/scrapeDb.ts`) |
| `SWAG_DB_PATH` | runtime | `/app/swag-data/swags.db` (read/write by `lib/swagDb.ts`) |
| `SLACK_BOT_TOKEN` / `SLACK_DIGEST_CHANNEL` | host cron only | monthly scrape digest |

## design system

Matches dtcmvp 2.0 dark theme:
- Brand green `#7bed9f` (primary) / `#2ed573` (secondary action)
- Backgrounds: slate-900 `#0f172a` body, slate-800 `#1e293b` cards
- Fonts: Space Grotesk (headings), Inter (body), Space Mono (mono accents)
- Lowercase wherever possible per dtcmvp brand convention (`swags`, not `SWAGs`, except in caps headlines like "Generate SWAG").

## recommendation engine

Client-side, in `BrandContext.generateRecommendations`:
1. Pool: active listings, not hidden, not already generated by the brand.
2. Pick 2-3 random from the pool.
3. Surfaced as a session-scoped recommendation set.

The previous "priority categories by department" matching is gone — Listings don't carry a category field. A future pass should re-introduce smarter matching using tags + `brandProfile.contactDepartment`.

## dev setup

```bash
cd dtcmvp-offers
npm install
npm run dev    # http://localhost:3000
```

`.env.local` (optional — defaults work):
```
NEXT_PUBLIC_API_URL=https://webhooks.dtcmvp.com/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_API_URL=https://api.dtcmvpete.com
```

For `/admin/scrape-results` to work locally you need a copy of `1800dtc.db` at the path `SCRAPE_DB_PATH` points to (default `./data/1800dtc.db`).

## related docs

- `~/.claude/plans/let-s-keep-pricing-off-ethereal-thimble.md` — Listings backend + sync (data layer)
- `~/.claude/plans/ok-we-re-making-major-encapsulated-cloud.md` — frontend SWAG marketplace rewrite
- `OFFERS_ROLLOUT_PLAN.md` — historical (pre-SWAG-pivot) rollout notes
- `deploy/README-DEPLOY.md` — DO droplet setup + 1800dtc.db scp workflow
- `dtcmvp-app/handlers/listings/` — backend code (sqlite-client, airtable-client, listings-sync-runner)
- `.claude/skills/generate-swag.md` — how to generate a SWAG spec for a partner (5-step process)
- `scripts/upsert-swag.js` — CLI for inserting/updating specs in swags.db
- `scripts/sync-listings.js` — CLI for backfilling Airtable Listings from swags.db (per backend plan)

---

*last updated: 2026-05-11*
