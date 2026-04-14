# Offers Marketplace Rollout Plan

Living doc for bringing the offers marketplace online. Two surfaces share one backend:
- **Standalone** (this repo) → will deploy to `offers.dtcmvp.com` on the DO droplet
- **Embedded** in dtcmvp-2.0 → `main.staging.dtcmvp.com/offers` (and eventually `app.dtcmvp.com/offers`)

---

## What's done (as of 2026-04-13)

### Airtable (source of truth)
- Base `appnBsoKSUIYu6Nn1`
- **Offers** table `tblflFmuuuDhcs0mX` — 20 rows, fields match spec in `dtcmvp-offers/airtable/README.md`
  - Partner links to existing **Companies** table
  - Category as singleSelect (7 options), Tags as multipleSelect (~56 options)
  - `Form Fields (JSON)` + flat Champion fields
  - Created At = `createdTime` (auto)
- **Claims** table `tblxJ5yGYm6OgU0op` — 3 seed rows
  - Links: Offer, Brand Contact (→Contacts), Brand Company (→Companies)
  - Snapshot fields: Brand Name ref, Brand Email
  - Lookup: Email (from Contacts)
- New fields added to **Companies** table: Offer Partner Description, Offer Partner Logo, Offer Partner Active

### Backend (in `dtcmvp-app`, deployed to DO)
- `handlers/offers/` — 4 files: `index.js` (routes), `sqlite-client.js`, `airtable-client.js`, `sync-runner.js`
- Tables in `dtcmvp-tam-large.db`: `offers_offers`, `offers_claims`, `offers_sync_metadata`, `offers_sync_log`
- PM2 cron `offers-sync-hourly` at `:15` past the hour (`ecosystem.docker.config.js`)
- `handlers/linkedinDashboard/offers.js` (previous scaffolded version) was removed — its schema was incompatible (separate partner/category/tag tables, separate offers.db). No data lost; it was never populated.
- Live endpoints (all under `https://webhooks.dtcmvp.com/api/offers/`):
  - `GET /` · `GET /:slug` · `GET /categories` · `GET /tags` · `GET /partners`
  - `POST /claims` (public — creates in Airtable + local; looks up Contact/Company by email)
  - `GET /claims/mine` (auth)
  - `GET /admin/claims` · `PUT /admin/claims/:claimId` · `POST /admin/sync` · `GET /admin/sync/logs`
- `config/projects.json` → `offers` project with CORS for localhost, `offers.dtcmvp.com`, `main.staging.dtcmvp.com`, and `*.staging.dtcmvp.com`

### Decisions locked in
- Single SQLite DB (`dtcmvp-tam-large.db`) with `offers_*` prefix — not a separate `offers.db`
- Airtable = SOT; SQLite = read cache (plus write-through for new claims)
- Standalone hosts on DO droplet (not Vercel) — matches dtcmvpete/brand-portal/cal-platform pattern
- Category/Tags as select fields on Offers (not separate tables)
- Partners = Companies with Type=Partner (not a separate offer-partners table)
- Form Fields as JSON long-text (simplest for MVP; form builder UI deferred)

---

## Outstanding work

### 1. Standalone DO container (`dtcmvp-offers`) — ✅ DONE 2026-04-14

Live at **https://offers.dtcmvp.com**. Currently serves mock data from `src/data/*` (section 4 replaces that with API calls). Cert expires 2026-07-13, auto-renew via certbot.

- [x] `Dockerfile` — multi-stage Next.js 16 standalone build; `ENV HOSTNAME=0.0.0.0`
- [x] `docker-compose.yml` — frontend on **host port 3005** (3000=dtcmvpete, 3001=brand-portal, 3002=cal-platform-frontend, 3003=webhook, 3004=stanger, 3005=offers, 3010=smartlead)
- [x] `.env.production.example` — no secrets; usable as-is in prod (auth proxies through dtcmvpete, no Supabase keys needed client-side)
- [x] `deploy/deploy.sh` — git-pull-based, preflight-checked
- [ ] `--staging` flag in deploy.sh for per-branch staging envs at `{slug}.staging.dtcmvp.com` (deferred)
- [x] Nginx site `/etc/nginx/sites-available/dtcmvp-offers` → localhost:3005 (Let's Encrypt SSL)
- [x] DNS A record `offers.dtcmvp.com` → `142.93.27.155`
- [ ] Add offers to `~/staging-infra/apps.json` + templates for per-branch staging (deferred)
- [x] GitHub deploy key (read-only) `~/.ssh/github_dtcmvp_offers` on droplet, host alias `github.com-dtcmvp-offers`

### 2. Supabase auth
**Goal:** partners sign in directly; brands follow an SSO link from brand-portal. Shared Supabase project (same one dtcmvp-2.0 uses).

**Tasks:**
- [ ] Add `/login` page — OTP + password, same pattern as dtcmvp-2.0's `src/app/login/`
- [ ] Add `AuthContext` (React Context) mirroring dtcmvp-2.0's — restores session from cookies, periodic refresh, mutex
- [ ] Middleware at `src/middleware.ts` to gate routes → `/login` if no session
- [ ] SSO token handler: `/login?sso=<token>` validates via Supabase and logs user in (brand-portal will link here)
- [ ] Admin redirect URL added to Supabase auth settings: `https://offers.dtcmvp.com/auth/callback` + `https://*.staging.dtcmvp.com/auth/callback`
- [ ] In brand-portal: add "Discover partner offers" button that generates an SSO token and redirects to `offers.dtcmvp.com/login?sso=...`

### 3. Partner-scoped backend endpoints
**Goal:** partners (app dev users, identified by `partner_airtable_id` on their Supabase profile) can only see/edit their own offers and claims on their offers.

**Tasks in `dtcmvp-app/handlers/offers/`:**
- [ ] `GET /api/offers/partner/mine` (auth, user_type=partner) — offers where `partner_airtable_id = req.user.partner_airtable_id`
- [ ] `POST /api/offers/partner` (auth) — create an offer; writes to Airtable with Partner linked to user's company
- [ ] `PUT /api/offers/partner/:slug` (auth) — update, only if offer.partner_airtable_id matches user
- [ ] `GET /api/offers/partner/claims` (auth) — claims on the partner's own offers
- [ ] Admin endpoints (already exist) stay as-is

### 4. Replace mock data in standalone frontend — ✅ DONE 2026-04-14 (partial)

Brand-facing routes now pull real Airtable-synced offers from the backend. Architecture: thin server components fetch + hand data to client components.

- [x] `src/lib/api.ts` — typed fetchers + backend→frontend mappers
- [x] `/offers` (marketplace grid) — real offers/categories/tags/partners
- [x] `/offers/[slug]` — real offer detail
- [x] `/offers/my` — resolves localStorage-saved slugs against live catalog
- [x] Claim form → `POST /api/offers/claims` (collects name + email inline; shows errors on failure)
- [x] BrandContext: removed hardcoded demo claims; recommendations now use offers pushed in from the marketplace page
- [ ] Admin pages (`/admin/*`) — still on mock data. Low priority since VAs edit in Airtable directly. Revisit post-auth or delete the admin UI entirely.
- [ ] `saved/claimed` state moves from localStorage → `/api/offers/claims/mine` (auth-backed). Deferred until step 2 lands.
- [ ] `src/data/*.ts` mock files (offers/partners/claims/questionnaire/brandProfile) — still present but only used by admin pages + BrandContext's `brandProfile` (for recommendation priority). Safe to delete once admin is removed.

### 5. dtcmvp-2.0 integration
**Goal:** offers pages embedded inside the unified frontend at `/offers`.

**Tasks in `dtcmvp-2.0`:**
- [ ] Port offers pages from this repo into `frontend/src/app/offers/*`
- [ ] Add sidebar section "Marketplace" → `/offers`
- [ ] API proxy routes at `frontend/src/app/api/offers/[...path]/route.ts` forwarding to `webhooks.dtcmvp.com/api/offers/*`
- [ ] Share existing AuthContext (Supabase already wired)
- [ ] ChatBar integration: SeanVoice agent can recommend offers based on meeting data (later, tool-addition in agent)

### 6. Nice-to-haves (post-launch)
- [ ] Form-builder UI in admin so VAs don't hand-edit JSON
- [ ] Slack notification to `#dtcmvp-cs` on new claim (mirror pattern from feedback-links)
- [ ] Convert Airtable Sample Deliverable attachment URLs → CDN-cached files (avoid Airtable bandwidth)

---

## Gotchas worth remembering

- **dtcmvp-2.0 staging hits production backends.** When testing chat/offers from `main.staging.dtcmvp.com`, you're hitting `webhooks.dtcmvp.com` → writing to real Airtable. Same will be true for offers.
- **Claim POST is public** (no auth required) so brands can claim without signing up. The Airtable write happens on the server; rate-limited to 100/min per project.
- **Hourly sync pulls claims too** — so admin edits in Airtable (status/notes) flow down to SQLite. App-originated claims write to both and don't need to wait for the next sync to appear locally.
- **Status + Is Active** are both stored. Public list filters on both (`status='active' AND is_active=1`). Archiving an offer means flipping Status to `archived` in Airtable.
- **Slug is URL key; Name is primary display field.** Don't change the primary to Slug — breaks link-field readability in Airtable.

---

## File map

```
dtcmvp-offers/                           # this repo — frontend (will deploy to DO)
├── airtable/                            # CSV seed + generator (done)
│   ├── generate-csvs.ts
│   ├── offers.csv
│   ├── claims.csv
│   └── README.md
├── src/
│   ├── app/offers/                      # (exists — currently mock data)
│   ├── data/                            # (TODO: replace imports with API calls)
│   └── contexts/BrandContext.tsx        # (TODO: back with API)
└── OFFERS_ROLLOUT_PLAN.md               # this file

dtcmvp-app/                              # backend (deployed)
├── handlers/offers/
│   ├── index.js                         # routes
│   ├── sqlite-client.js                 # DB queries + schema init
│   ├── airtable-client.js               # Airtable API
│   └── sync-runner.js                   # Airtable → SQLite
├── jobs/offers-sync-hourly.js           # PM2 cron wrapper
├── config/projects.json                 # "offers" project registered
└── ecosystem.docker.config.js           # offers-sync-hourly cron at :15
```

---

*Last updated: 2026-04-13*
