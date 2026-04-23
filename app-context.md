# dtcmvp-offers — partner offer marketplace + SWAG ROI calculators

Standalone Next.js app at **offers.dtcmvp.com**. Brands discover and claim exclusive offers from dtcmvp partner companies (app developers); partners get qualified intros without the cost of paid lead-gen. Each partner can also have a **SWAG** (Scientific Wild-Ass Guess) — an interactive ROI calculator that tells a brand what the partner's tool is worth to their specific store. Admin-only tooling under `/admin/*`: `/admin/scrape-results` (1,126 apps from 1800dtc.com) and `/admin/swags` (SWAG review queue with lint + flag-for-fix workflow).

For roadmap + outstanding work, see `OFFERS_ROLLOUT_PLAN.md`. This doc describes what's live today.

## tech stack

| layer | tech |
|-------|------|
| framework | Next.js 16 (Turbopack), React 19, TypeScript 5 |
| styling | Tailwind CSS 4, Lucide React icons |
| 3D graphics | Three.js (MoleculeLoader animation on `/offers`) |
| state | React Context (`AuthContext`, `BrandContext`) |
| auth | Supabase JWT — proxied through `api.dtcmvpete.com`, mirrors dtcmvp-2.0 |
| backend (catalog/claims) | Node/Express in `dtcmvp-app/handlers/offers/` (DO droplet) |
| backend (scrape) | `better-sqlite3` reading bind-mounted `/app/data/1800dtc.db` |
| SWAG specs | `better-sqlite3` reading/writing `/app/swag-data/swags.db` |
| primary data store | Airtable base `appnBsoKSUIYu6Nn1` (Offers, Claims, Companies tables) |
| read cache | SQLite tables `offers_*` in `dtcmvp-tam-large.db` (synced hourly) |

## current state

Live at **https://offers.dtcmvp.com** (deployed via `./deploy/deploy.sh` → DO droplet, host port 3005).

**Brand flow (live):**
- ✅ Marketplace grid with search, category filters, partner logos
- ✅ Offer detail pages with custom claim forms
- ✅ "find offers for me" recommendation engine (client-side tag matching + brand profile priorities)
- ✅ MoleculeLoader 3D animation during analysis
- ✅ My Offers page — claimed offers hydrated from `GET /api/offers/claims/mine`, saved/hidden in localStorage
- ✅ Mobile responsive, dark theme

**Auth (live, mirrors dtcmvp-2.0):**
- ✅ Partner login at `/login` — OTP + password, proxied through `api.dtcmvpete.com`
- ✅ Brand login at `/brand/[contactId]` — first-name verification against Airtable contact ID
- ✅ Middleware gates `/`, `/offers/*`, `/questionnaire/*`, `/admin/*`
- ✅ Cookie-based session with 45-min refresh, mutex/debounce, cookie restore from localStorage clear

**SWAG calculators (live):**
- ✅ SWAG specs stored in `swags.db` (writable SQLite, separate from read-only 1800dtc.db)
- ✅ `GET /api/swag` — lightweight index of available SWAGs (slug + partner name)
- ✅ `GET /api/swag/[slug]` — full spec JSON, fetched on demand when user clicks "See the SWAG"
- ✅ OfferDrawer shows "See the SWAG" button for partners with specs in the database
- ✅ Clicking opens the SWAG calculator inside the same modal (no page navigation)
- ✅ Back arrow returns to offer details, scroll position preserved
- ✅ `scripts/upsert-swag.js` — CLI for agents to insert/update specs without rebuild
- ✅ 9 partner specs seeded: AIX, AfterSell, Gorgias, Klaviyo, Order Editing, PostPilot, Postscript, Superfiliate, Videowise

**Admin tooling (live):**
- ✅ `/admin/scrape-results` — searchable/sortable/paginated table over 1800dtc.com scrape (admin-only)
- ✅ `/admin/swags` — SWAG review queue with side-by-side review panel + live calculator, sortable lint columns, flag-for-fix workflow

**Backend (live in dtcmvp-app/handlers/offers/):**
- ✅ `GET /api/offers` (public, filtered by category/tag/partner/search/status)
- ✅ `GET /api/offers/:slug` (public, active only)
- ✅ `GET /api/offers/categories` · `tags` · `partners` (public)
- ✅ `POST /api/offers/claims` (auth) — identity from session, Airtable contact/company link
- ✅ `GET /api/offers/claims/mine` (auth)
- ✅ `GET /api/offers/partner/mine` · `/partner/claims` (auth, partner/admin)
- ✅ `GET /api/offers/admin/claims` · `PUT /admin/claims/:id` · `POST /admin/sync` · `GET /admin/sync/logs` (admin)

**Data plumbing (live):**
- ✅ Airtable → SQLite hourly sync via PM2 cron (`offers-sync-hourly` at `:15`)
- ✅ Manual `POST /admin/sync` for VAs after bulk Airtable edits
- ✅ Sync log tracked in `offers_sync_log` table

## project structure

```
src/
├── app/
│   ├── login/page.tsx                  # partner OTP + password
│   ├── brand/[contactId]/page.tsx      # brand first-name verification
│   ├── offers/                         # brand marketplace (API-backed)
│   │   ├── page.tsx                    # marketplace grid (server) → client
│   │   ├── OffersMarketplaceClient.tsx
│   │   ├── [id]/page.tsx               # offer detail
│   │   ├── my/page.tsx                 # claimed + saved
│   │   └── layout.tsx                  # navbar + BrandProvider
│   ├── admin/                          # admin-only tools under shared layout + topbar
│   │   ├── layout.tsx                  # shared topbar with tab row + SignOutButton
│   │   ├── AdminTabs.tsx                # tab definitions — add new admin views here
│   │   ├── page.tsx                    # redirects to /admin/scrape-results
│   │   ├── scrape-results/             # 1800dtc apps viewer
│   │   └── swags/page.tsx              # SWAG review queue (side-by-side + lint)
│   ├── api/
│   │   ├── auth/[...path]/route.ts     # proxy → api.dtcmvpete.com
│   │   ├── swag/route.ts               # GET — list approved SWAG slugs (user-facing)
│   │   ├── swag/[slug]/route.ts        # GET — fetch approved spec by slug
│   │   ├── swag/admin/list             # GET — all specs w/ lint counts (draft/approved/needs-regen)
│   │   ├── swag/admin/spec/[slug]      # GET, DELETE, PUT (PUT preserves review metadata)
│   │   ├── swag/admin/status           # PATCH — set status/notes (also used by "Save notes" flag)
│   │   ├── sheet/route.ts              # GET — Google Sheets CSV proxy (for AI research links)
│   │   └── scrape-results/apps/        # internal queries against /app/data/1800dtc.db
│   ├── questionnaire/page.tsx          # standalone recommendation quiz (still mock-data)
│   ├── layout.tsx                      # root — wraps AuthProvider
│   └── page.tsx                        # redirects to /offers
├── components/
│   ├── common/                         # Badge, Button, Card, Drawer, Input, Modal, MoleculeLoader
│   ├── offers/                         # OfferCard, OfferGrid, OfferFilters, OfferDrawer, ClaimForm
│   └── swag/                           # SwagCalculator, ProjectionChart, SwagReport, SwagLoader, SwagReviewPanel (admin),
│                                       # SwagDisclaimer, AskForIntroModal, AdminToolbar (dev-only),
│                                       # AiResearchBar, InputField, InputSection, DerivedField,
│                                       # CustomDropdown, MoleculeLoader, AnimatedValue
├── contexts/
│   ├── AuthContext.tsx                 # session + permissions (mirrors dtcmvp-2.0)
│   └── BrandContext.tsx                # claims (API-hydrated), saved/hidden (localStorage)
├── lib/
│   ├── auth.ts                         # token lifecycle, authFetch helper
│   ├── api.ts                          # offers/claims fetchers + mappers
│   ├── scrapeDb.ts                     # better-sqlite3 reader for 1800dtc.db
│   ├── swagDb.ts                       # better-sqlite3 reader/writer for swags.db
│   ├── serverAuth.ts                   # is_admin check for /admin/scrape-results
│   ├── categoryColors.ts               # category color mapping
│   └── swag/                           # SWAG engine + types
│       ├── swag-types.ts               # SwagSpec, BrandProfile, SwagBenefit, etc.
│       ├── swag-engine.ts              # computeSwag(), formula evaluation
│       ├── review.ts                   # lintSwagSpec() — canonical-label + shape checks for admin
│       ├── format.ts                   # fmtMoney, fmtPct, fmtMultiple
│       ├── highlight.tsx               # green token highlighting with TextScramble
│       └── prompt-builder.ts           # AI research prompt generation
├── data/                               # remaining mocks (no claims.ts as of 2026-04-14)
│   ├── offers.ts                       # used by /questionnaire
│   ├── partners.ts                     # used by getPartner lookup helpers
│   ├── categories.ts · tags.ts         # used by helpers + /questionnaire
│   ├── questionnaire.ts                # quiz data
│   └── brandProfile.ts                 # recommendation priority profile
├── types/index.ts                      # Offer, Partner, Category, Tag, Claim, FormField
└── middleware.ts                       # cookie-based route gating
```

## auth model

Identical to dtcmvp-2.0 — same `user_profiles` table in Supabase, same JWT, same backend (`api.dtcmvpete.com`). The browser never talks to Supabase directly:

```
browser → /api/auth/[...path] → AUTH_API_URL (api.dtcmvpete.com) → Supabase
```

**`UserProfile` fields used here:**
- `email`, `username`, `is_admin`
- `user_type`: `'admin' | 'partner' | 'brand'`
- `airtable_contact_id` — for brand users, their Airtable Contact rec ID
- `partner_airtable_id` — overloaded: partner users → their company; brand users → their company. Disambiguate with `user_type`.

**Public paths** (no session required): `/login`, `/brand/*`, `/api/auth/*`. Everything else redirects to `/login` with `?redirect=<original>`.

## data model

Airtable is the source of truth. SQLite is a read cache (synced hourly) plus write-through for new claims.

```typescript
// API response shape (snake_case from backend, mapped to camelCase Offer in lib/api.ts)
ApiOffer {
  airtable_id, slug, name,
  partner_airtable_id, partner_name, partner_website, partner_logo_url, partner_description,
  short_description, full_description, video_url,
  category, tags[], claim_instructions,
  form_fields: FormField[], status: 'active'|'draft'|'archived', is_active,
  sample_deliverable_url,
  champion_name, champion_title, champion_brand, champion_avatar_url, champion_linkedin_url,
  airtable_created_at
}

ApiClaim {
  claim_id, offer_airtable_id, offer_slug, offer_name,
  brand_contact_airtable_id, brand_company_airtable_id, brand_name, brand_email,
  form_data: Record<string, string|boolean>,
  status: 'pending'|'reviewed'|'completed',
  claimed_at, reviewed_at, notes
}

FormField { id, type: 'text'|'email'|'textarea'|'select'|'checkbox'|'url', label, placeholder?, required, options? }
```

Notes:
- Category and tags are **fields on the Offers Airtable table** (singleSelect / multipleSelect), NOT separate tables. The backend exposes them via convenience endpoints (`/categories`, `/tags`).
- Partners are Companies in Airtable with `Type=Partner` — also not a separate table.
- Frontend `Offer.id` is the slug (URL key); Airtable's primary field stays as Name.

## SWAG system

**What is a SWAG:** Scientific Wild-Ass Guess. dtcmvp publishes first-party ROI analyses for Shopify apps. The brand sets a target ROI multiple (5x, 8x, 15x) and we tell them the max they should pay to hit that target. Every number we don't know for certain, we SWAG — and label it as such.

**UX flow:** offer grid → click offer → OfferDrawer opens (details view) → "See the SWAG" button in footer → click → modal expands with SwagCalculator → back arrow returns to details → close returns to grid (scroll preserved). All in-place, no page navigation.

**Data storage:** SWAG specs live in `swags.db` (writable SQLite at `/app/swag-data/swags.db`), separate from the read-only `1800dtc.db`. Schema:

```sql
swag_specs (
  slug TEXT PRIMARY KEY,       -- matches partner slug (e.g., "klaviyo")
  partner_name TEXT NOT NULL,  -- display name (e.g., "Klaviyo")
  spec_json TEXT NOT NULL,     -- full SwagSpec as JSON
  tier INTEGER NOT NULL,       -- 0=public, 1=partner calculator, 2=private data
  status TEXT NOT NULL,        -- 'draft' | 'approved' | 'needs-regen'
  reviewed_by TEXT,            -- who approved/flagged (e.g., 'peter', 'claude-fix-em-dash')
  reviewed_at TEXT,            -- when the current status was set
  review_notes TEXT,           -- flag for fix — see admin review workflow below
  generated_at TEXT NOT NULL,
  generated_by TEXT,           -- who/what created it (agent name, skill, etc.)
  created_at TEXT, updated_at TEXT
)
```

Only `status='approved'` specs surface in the user-facing `GET /api/swag` and `GET /api/swag/[slug]` endpoints. Drafts and needs-regen specs are admin-only.

**How specs get into the database:** agents and the `/generate-swag` skill use `scripts/upsert-swag.js`:

```bash
# from a JSON file
node scripts/upsert-swag.js spec.json --by "generate-swag-skill"

# from stdin (agent piping output)
echo '{"slug":"newpartner",...}' | node scripts/upsert-swag.js --stdin --by "swarm-agent-42"

# seed all JSON files from src/partners/
node scripts/upsert-swag.js --seed

# list / delete
node scripts/upsert-swag.js --list
node scripts/upsert-swag.js --delete klaviyo
```

No rebuild or deploy needed — specs are served on demand via `GET /api/swag/[slug]`. The OfferDrawer fetches the index (`GET /api/swag`) once to know which partners have SWAGs, then fetches the full spec when the user clicks "See the SWAG".

**The SWAG engine** (`src/lib/swag/swag-engine.ts`) evaluates benefit formulas at 3 confidence levels (60%, 80%, 100%), applies category-specific defaults, and computes break-even monthly pricing. The `SwagCalculator` component renders the interactive UI with charts (recharts), narrative briefs, and an "Ask for an intro" CTA.

**generate-swag skill** (`.claude/skills/generate-swag.md`) documents the 5-step process for creating a SWAG spec from a partner's public website: read site → identify benefits → map to formulas → write spec → verify math. Includes canonical benefit label vocabulary for cross-partner comparability.

**Admin review workflow** (`/admin/swags`):

1. Agent writes a spec via `scripts/upsert-swag.js` — it lands as `status='draft'`.
2. Operator opens `/admin/swags`, reviews drafts sorted by lint-severity (Red desc by default). The modal shows a **Review panel** side-by-side with the **Live calculator**:
   - Review panel lists each benefit's formula, resolved SWAG defaults with their sources, per-benefit $/yr contribution at the sample brand (250k orders, $120 AOV), and a reviewer checklist.
   - **Deterministic lint** from `src/lib/swag/review.ts` flags canonical-label mismatches, missing sources, non-canonical byCategory/byDepartment keys, em dashes, AI-speak words, and $1M+ sample totals. Red = block-worthy, Yellow = worth checking. Once a spec is approved, lint badges render muted with a strike-through (yellows were implicitly accepted at approval and shouldn't look like outstanding work).
3. Actions in the modal footer:
   - **Approve** — sets `status='approved'`, stamps `reviewed_by` + `reviewed_at`, stores any notes.
   - **Mark needs regen** — sets `status='needs-regen'`; an agent should re-run `/generate-swag` and upsert a fresh version.
   - **Delete** — drops the row entirely (use for bogus/off-topic partners, not text fixes).
   - **Save notes** — writes `review_notes` without changing status. Used to flag a small text fix ("remove em dash in X benefit") for Claude to handle without kicking the spec back to draft. The table's **Flag** column renders an orange `⚑ fix` badge on any row with non-empty notes and is sortable so flagged rows can be pulled to the top of a fix pass.
4. Claude handling flagged fixes: read `GET /api/swag/admin/list` and filter for `review_notes`, fetch each flagged spec via `GET /api/swag/admin/spec/[slug]`, apply the requested text change, `PUT` back. The PUT endpoint passes `preserveReview=true` to `upsertSwagSpec` so approved status and reviewer metadata stay intact. After the fix, `PATCH /api/swag/admin/status` with `notes: null` clears the flag.

Statuses map to visibility: `approved` is live in the user-facing API, `draft` and `needs-regen` are admin-only. `upsertSwagSpec` without `preserveReview` resets status to `draft` and nulls review metadata on conflict — correct behavior when an agent regenerates a spec but wrong for a typo fix, which is why `preserveReview` exists.

## deployment

| target | location | trigger |
|--------|----------|---------|
| Standalone frontend | DO droplet `142.93.27.155`, container `dtcmvp-offers-frontend`, host port 3005 | `./deploy/deploy.sh` (git pull + docker build) |
| Backend handler | container `webhook-server-v2` on same droplet | `dtcmvp-app/deploy.sh` |

The standalone container bind-mounts `./data:/app/data:ro` for the scrape DB and `./swag-data:/app/swag-data` (writable) for SWAG specs. `1800dtc.db` is too large for git — scp'd to the droplet out-of-band (see `deploy/README-DEPLOY.md`). `swags.db` auto-creates on first access; to seed production, scp from local: `scp data/swags.db deploy@142.93.27.155:~/dtcmvp-offers/swag-data/swags.db` (ensure chmod 666 for container write access). The monthly auto-refresh cron (`1800dtc/run-monthly.sh`) re-scrapes, snapshots into `scrape_snapshots`, diffs vs last run, posts a Slack digest, and atomically swaps the new DB in.

## env vars

| var | scope | purpose |
|-----|-------|---------|
| `NEXT_PUBLIC_API_URL` | build | `https://webhooks.dtcmvp.com/api` — offers backend |
| `NEXT_PUBLIC_APP_URL` | build | `https://offers.dtcmvp.com` |
| `AUTH_API_URL` | runtime | `https://api.dtcmvpete.com` — auth proxy target |
| `SCRAPE_DB_PATH` | runtime | `/app/data/1800dtc.db` (read by `lib/scrapeDb.ts`) |
| `SWAG_DB_PATH` | runtime | `/app/swag-data/swags.db` (read/write by `lib/swagDb.ts`) |
| `SLACK_BOT_TOKEN` / `SLACK_DIGEST_CHANNEL` | host cron only | monthly scrape digest |

## design system

Matches dtcmvp 2.0 dark theme:
- Brand green `#7bed9f` (primary) / `#2ed573` (secondary action)
- Backgrounds: slate-900 `#0f172a` body, slate-800 `#1e293b` cards
- Fonts: Space Grotesk (headings), Inter (body), Space Mono (mono accents)

## recommendation engine

Client-side, in `BrandContext.generateRecommendations`:
1. Brand profile from `src/data/brandProfile.ts` has `contactDepartment` and priorities
2. Filter pool: active offers, not hidden, not already claimed
3. Prioritize offers whose category matches the department's priority categories
4. Slice top 2-3 with a simulated "analysis" delay + MoleculeLoader

Future: SeanVoice agent could feed real meeting context to recommend smarter (see rollout plan §7).

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

- `OFFERS_ROLLOUT_PLAN.md` — what's done, what's next, gotchas
- `deploy/README-DEPLOY.md` — DO droplet setup + 1800dtc.db scp workflow
- `dtcmvp-app/handlers/offers/` — backend code (sqlite-client, airtable-client, sync-runner)
- `.claude/skills/generate-swag.md` — how to generate a SWAG spec for a partner (5-step process)
- `scripts/upsert-swag.js` — CLI for inserting/updating specs in swags.db

---

*last updated: 2026-04-21*
