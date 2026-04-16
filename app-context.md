# dtcmvp-offers — partner offer marketplace

Standalone Next.js app at **offers.dtcmvp.com**. Brands discover and claim exclusive offers from dtcmvp partner companies (app developers); partners get qualified intros without the cost of paid lead-gen. Plus an admin-only `/scrape-results` viewer for the 1,126 apps scraped from 1800dtc.com.

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
- ✅ Middleware gates `/`, `/offers/*`, `/questionnaire/*`, `/scrape-results/*`
- ✅ Cookie-based session with 45-min refresh, mutex/debounce, cookie restore from localStorage clear

**Admin tooling (live):**
- ✅ `/scrape-results` — searchable/sortable/paginated table over 1800dtc.com scrape (admin-only)

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
│   ├── scrape-results/                 # admin-only 1800dtc viewer
│   ├── api/
│   │   ├── auth/[...path]/route.ts     # proxy → api.dtcmvpete.com
│   │   └── scrape-results/apps/        # internal queries against /app/data/1800dtc.db
│   ├── questionnaire/page.tsx          # standalone recommendation quiz (still mock-data)
│   ├── layout.tsx                      # root — wraps AuthProvider
│   └── page.tsx                        # redirects to /offers
├── components/
│   ├── common/                         # Badge, Button, Card, Drawer, Input, Modal, MoleculeLoader
│   └── offers/                         # OfferCard, OfferGrid, OfferFilters, OfferDrawer, ClaimForm
├── contexts/
│   ├── AuthContext.tsx                 # session + permissions (mirrors dtcmvp-2.0)
│   └── BrandContext.tsx                # claims (API-hydrated), saved/hidden (localStorage)
├── lib/
│   ├── auth.ts                         # token lifecycle, authFetch helper
│   ├── api.ts                          # offers/claims fetchers + mappers
│   ├── scrapeDb.ts                     # better-sqlite3 reader for 1800dtc.db
│   ├── serverAuth.ts                   # is_admin check for /scrape-results
│   └── categoryColors.ts               # category color mapping
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

## deployment

| target | location | trigger |
|--------|----------|---------|
| Standalone frontend | DO droplet `142.93.27.155`, container `dtcmvp-offers-frontend`, host port 3005 | `./deploy/deploy.sh` (git pull + docker build) |
| Backend handler | container `webhook-server-v2` on same droplet | `dtcmvp-app/deploy.sh` |

The standalone container bind-mounts `./data:/app/data:ro` for the scrape DB. `1800dtc.db` is too large for git — scp'd to the droplet out-of-band (see `deploy/README-DEPLOY.md`). The monthly auto-refresh cron (`1800dtc/run-monthly.sh`) re-scrapes, snapshots into `scrape_snapshots`, diffs vs last run, posts a Slack digest, and atomically swaps the new DB in.

## env vars

| var | scope | purpose |
|-----|-------|---------|
| `NEXT_PUBLIC_API_URL` | build | `https://webhooks.dtcmvp.com/api` — offers backend |
| `NEXT_PUBLIC_APP_URL` | build | `https://offers.dtcmvp.com` |
| `AUTH_API_URL` | runtime | `https://api.dtcmvpete.com` — auth proxy target |
| `SCRAPE_DB_PATH` | runtime | `/app/data/1800dtc.db` (read by `lib/scrapeDb.ts`) |
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

For `/scrape-results` to work locally you need a copy of `1800dtc.db` at the path `SCRAPE_DB_PATH` points to (default `./data/1800dtc.db`).

## related docs

- `OFFERS_ROLLOUT_PLAN.md` — what's done, what's next, gotchas
- `deploy/README-DEPLOY.md` — DO droplet setup + 1800dtc.db scp workflow
- `dtcmvp-app/handlers/offers/` — backend code (sqlite-client, airtable-client, sync-runner)

---

*last updated: 2026-04-16*
