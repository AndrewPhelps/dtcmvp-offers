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

### 2. Supabase auth — ✅ DONE 2026-04-14

Mirrors dtcmvp-2.0 verbatim — all auth flows proxy through `api.dtcmvpete.com` via `/api/auth/[...path]`. No direct Supabase calls from the browser.

- [x] `/login` page — partner OTP + password, offers theme
- [x] `/brand/[contactId]` page — brand first-name verification (mirrors dtcmvp-2.0's `/brand/[contactId]` flow; reuses the same `POST /auth/brand-login` endpoint)
- [x] `src/contexts/AuthContext.tsx` — cookie restore, 45-min periodic refresh, visibility-change refresh, mutex + debounce on refresh
- [x] `src/middleware.ts` gates `/`, `/offers/*`, `/questionnaire` on the `supabase.auth.token` cookie; `/login` and `/brand/*` stay public
- [x] `src/lib/auth.ts` — `sendOTP`, `verifyOTP`, `loginWithPassword`, `brandLogin`, `refreshAccessToken`, `getCurrentUser`, `signOut`, `authFetch` helper
- [x] `src/app/api/auth/[...path]/route.ts` — server-side proxy. `AUTH_API_URL` passed as runtime env via docker-compose
- [x] `AuthProvider` wraps the root layout
- [~] SSO token handler (`?sso=<token>`) — **skipped.** Brand-portal and offers are on different TLDs (`dtcmvp.com` vs `dtcmvpete.com`) so cookies can't share, but brands re-authenticate on offers with a single name input via the `/brand/[contactId]` route. No SSO exchange needed; the URL path IS the credential + name is the "security"
- [ ] Supabase redirect URL config — TODO: add `https://offers.dtcmvp.com` to Supabase auth settings if/when we move to direct Supabase (currently everything flows through api.dtcmvpete.com which already has the redirect)

### 3. Partner-scoped backend endpoints — ✅ DONE 2026-04-14 (read-only)

Scope intentionally narrowed: partners don't create/edit offers yet. Even admins edit in Airtable. So only read endpoints needed.

**Done in `dtcmvp-app/handlers/offers/`:**
- [x] `GET /api/offers/partner/mine` (auth, user_type=partner|admin) — all of the partner's offers including drafts/archived, scoped by `req.user.partner_airtable_id`
- [x] `GET /api/offers/partner/claims` (auth) — claims on the partner's own offers (joins `offers_claims` → `offers_offers` on partner_airtable_id). Filters: `?status=`
- [x] `POST /api/offers/claims` — now **auth-required**; identity (contact + company airtable IDs) comes from the session profile with email-lookup fallback
- [x] `sqlite-client.js` → new `getClaimsForPartner(partnerAirtableId, { status })`
- [ ] `POST /api/offers/partner` / `PUT /api/offers/partner/:slug` — **deferred.** VAs edit in Airtable; partner-facing CRUD comes later if needed

### 4. Replace mock data in standalone frontend — ✅ DONE 2026-04-14

Brand-facing routes pull real Airtable-synced offers from the backend. Admin UI deleted rather than gated — VAs edit in Airtable directly.

- [x] `src/lib/api.ts` — typed fetchers + backend→frontend mappers
- [x] `/offers` (marketplace grid) — real offers/categories/tags/partners
- [x] `/offers/[slug]` — real offer detail
- [x] `/offers/my` — claims hydrated from `GET /api/offers/claims/mine` on login (saved/hidden stay in localStorage — device-level prefs)
- [x] Claim form → `POST /api/offers/claims`; identity comes from session (inline name/email fields removed)
- [x] BrandContext: loads claims from API on user-available, optimistic updates on new claim
- [x] `/admin/*` pages **deleted** (9 routes removed) — pure mock-data with no backend writes
- [x] `src/data/claims.ts` deleted (only admin used it); `airtable/generate-csvs.ts` trimmed
- [ ] `updateClaimNotes` / `markIntroSent` in BrandContext are still client-only — they update local state but don't persist. Needs a backend endpoint for claim notes/status edits before the "Add Outcome" button on `/offers/my` does anything real.
- [ ] Remaining `src/data/*.ts` files (offers/partners/categories/tags/questionnaire/brandProfile) still used by `/questionnaire` + `BrandContext` recommendations + a few lookup helpers. Safe to delete once those are rewired to the API — low priority.

### 5. dtcmvp-2.0 integration
**Goal:** offers pages embedded inside the unified frontend at `/offers`.

**Tasks in `dtcmvp-2.0`:**
- [ ] Port offers pages from this repo into `frontend/src/app/offers/*`
- [ ] Add sidebar section "Marketplace" → `/offers`
- [ ] API proxy routes at `frontend/src/app/api/offers/[...path]/route.ts` forwarding to `webhooks.dtcmvp.com/api/offers/*`
- [ ] Share existing AuthContext (Supabase already wired)
- [ ] ChatBar integration: SeanVoice agent can recommend offers based on meeting data (later, tool-addition in agent)

### 5b. brand-portal launch link
- [x] CTA added to `brand.dtcmvp.com/[contactId]` linking to `offers.dtcmvp.com/brand/{contactId}` — commit `498295e` on 2026-04-14
- [x] **Reverted** in commit `cf22112` (2026-04-14) — offers marketplace isn't launched yet, bring back when ready
- [ ] Re-enable the CTA at launch (the two `<a>` tags can be wrapped back into a flex container the way they were)

### 6. Partner-facing dashboard (future)
- [ ] `/partner` landing page in offers standalone that calls `GET /partner/mine` + `GET /partner/claims` — table of their offers + claims with read-only status. Backend endpoints are already live.

### 7. Nice-to-haves (post-launch)
- [ ] Form-builder UI (post-launch admin) so VAs don't hand-edit JSON
- [ ] Slack notification to `#dtcmvp-cs` on new claim (mirror pattern from feedback-links)
- [ ] Convert Airtable Sample Deliverable attachment URLs → CDN-cached files (avoid Airtable bandwidth)
- [ ] Backend endpoints for editing claim notes + intro-sent status so `/offers/my` "Add Outcome" persists

---

## Gotchas worth remembering

- **dtcmvp-2.0 staging hits production backends.** When testing chat/offers from `main.staging.dtcmvp.com`, you're hitting `webhooks.dtcmvp.com` → writing to real Airtable. Same will be true for offers.
- **Claim POST is auth-required** (as of 2026-04-14). Identity comes from the session — no name/email in the body. For brand users (`user_type='brand'`), `req.user.airtable_contact_id` + `req.user.partner_airtable_id` (= brand's company) feed the Airtable link fields directly. For admin/partner users, we fall back to email-based contact/company lookup so admins can test claims.
- **Cross-subdomain cookies don't carry** — `brand.dtcmvp.com` and `offers.dtcmvp.com` share the parent domain but `brand.dtcmvpete.com` and `offers.dtcmvp.com` don't. Brand re-entry on offers uses the `/brand/[contactId]` route (same flow as dtcmvp-2.0's `/brand/[contactId]`), not an SSO token.
- **partner_airtable_id is overloaded on `req.user`** — it maps to `user_profiles.airtable_company_id`. For partner users that's their partner's company; for brand users it's the BRAND's company. Use `req.user.user_type` to disambiguate.
- **Hourly sync pulls claims too** — so admin edits in Airtable (status/notes) flow down to SQLite. App-originated claims write to both and don't need to wait for the next sync to appear locally.
- **Status + Is Active** are both stored. Public list filters on both (`status='active' AND is_active=1`). Archiving an offer means flipping Status to `archived` in Airtable.
- **Slug is URL key; Name is primary display field.** Don't change the primary to Slug — breaks link-field readability in Airtable.

---

## File map

```
dtcmvp-offers/                           # frontend, deployed to offers.dtcmvp.com
├── airtable/                            # seed scaffolding (done, retained for re-seed)
│   ├── generate-csvs.ts                 # claims references removed 2026-04-14
│   ├── offers.csv
│   └── README.md
├── src/
│   ├── app/
│   │   ├── login/page.tsx               # partner OTP + password
│   │   ├── brand/[contactId]/page.tsx   # brand name verification
│   │   ├── offers/                      # real API-backed marketplace
│   │   ├── api/auth/[...path]/route.ts  # proxy → api.dtcmvpete.com
│   │   └── questionnaire/               # still mock-data, low-priority
│   ├── contexts/
│   │   ├── AuthContext.tsx              # session + refresh
│   │   └── BrandContext.tsx             # claims hydrated from API
│   ├── lib/
│   │   ├── auth.ts                      # token lifecycle + authFetch
│   │   └── api.ts                       # offers/claims fetchers
│   ├── middleware.ts                    # gates routes on cookie
│   └── data/                            # remaining mocks (no claims.ts)
└── OFFERS_ROLLOUT_PLAN.md               # this file

dtcmvp-app/                              # backend (deployed to DO)
├── handlers/offers/
│   ├── index.js                         # routes (public + auth + partner + admin)
│   ├── sqlite-client.js                 # DB queries + getClaimsForPartner
│   ├── airtable-client.js               # Airtable API
│   └── sync-runner.js                   # Airtable → SQLite
├── middleware/auth.js                   # attaches req.user from Supabase JWT
├── jobs/offers-sync-hourly.js           # PM2 cron wrapper
├── config/projects.json                 # "offers" project registered
└── ecosystem.docker.config.js           # offers-sync-hourly cron at :15
```

---

*Last updated: 2026-04-15*
