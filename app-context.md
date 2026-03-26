# dtcmvp-offers — partner offer marketplace

## what it is

a marketplace where brands discover and claim exclusive offers from dtcmvp partner companies (app developers). partners create offers (free audits, setup assistance, etc.), brands browse/filter/claim them. includes an AI-like recommendation engine and admin management.

two user experiences:
- **brands** (app.dtcmvp.com/offers or standalone) — browse offers, get recommendations, claim
- **admins** (/admin) — manage offers, partners, categories, claims

## tech stack

| layer | tech |
|-------|------|
| framework | Next.js 16, React 19, TypeScript 5 |
| styling | Tailwind CSS 4, Lucide React icons |
| 3D graphics | Three.js (MoleculeLoader animation) |
| state | React Context (BrandContext) |
| data | **mock/hardcoded** — no backend yet |
| auth | **none** — no auth yet |

## current state

**frontend complete, no backend**

- ✅ brand marketplace UI with search, category filters, offer grid
- ✅ offer detail pages with custom claim forms
- ✅ "find offers for me" recommendation engine (client-side tag matching)
- ✅ questionnaire for refined recommendations
- ✅ my offers page (saved + claimed tracking)
- ✅ admin dashboard with stats, CRUD for offers/partners/categories/tags/claims
- ✅ mobile responsive
- ✅ dark theme matching dtcmvp design system
- ❌ no backend API — all data is hardcoded in `/src/data/`
- ❌ no database
- ❌ no authentication
- ❌ no form submission (logs to console)
- ❌ no email/notification system

## project structure

```
src/
├── app/
│   ├── offers/           # brand marketplace
│   │   ├── page.tsx      # main grid with filters + recommendations
│   │   ├── [id]/page.tsx # offer detail + claim form
│   │   ├── my/page.tsx   # user's saved/claimed offers
│   │   └── layout.tsx    # navbar + BrandProvider
│   ├── admin/            # admin management
│   │   ├── page.tsx      # dashboard with stats
│   │   ├── offers/       # CRUD: list, new, [id] edit
│   │   ├── partners/     # partner management
│   │   ├── categories/   # category management
│   │   ├── claims/       # claim review
│   │   └── tags/         # tag management
│   ├── questionnaire/    # standalone recommendation quiz
│   └── layout.tsx        # root layout with fonts
├── components/
│   ├── common/           # Badge, Button, Card, Drawer, Input, Modal, MoleculeLoader
│   ├── layout/           # Navbar
│   └── offers/           # OfferCard, OfferGrid, OfferFilters, OfferDrawer, ClaimForm
├── contexts/
│   └── BrandContext.tsx   # saved/claimed/hidden offers, recommendations
├── data/                  # mock data (replace with API)
│   ├── offers.ts         # ~20-30 sample offers
│   ├── partners.ts       # ~20 partner companies
│   ├── categories.ts     # 7 categories
│   ├── tags.ts           # ~30 tags
│   ├── questionnaire.ts  # recommendation quiz data
│   ├── brandProfile.ts   # mock brand user profile
│   └── claims.ts         # sample claim records
├── types/index.ts         # Offer, Partner, Category, Tag, Claim, Brand, FormField
└── lib/categoryColors.ts  # category color mapping
```

## data model

```typescript
Offer {
  id, partnerId, name, shortDescription, fullDescription,
  videoUrl?, categoryId, tagIds[], claimInstructions?,
  formFields: FormField[], status: 'active'|'draft'|'archived',
  isActive, sampleDeliverablePdf?, champion?: OfferChampion,
  createdAt
}

FormField { id, type: 'text'|'email'|'textarea'|'select'|'checkbox'|'url', label, placeholder?, required, options? }
Claim { id, offerId, brandId, brandName, brandEmail, formData, status: 'pending'|'reviewed'|'completed', claimedAt, reviewedAt?, notes? }
Partner { id, name, description, logo, website, categoryIds[] }
Category { id, name, description, color }
Tag { id, name, categoryId? }
```

## design system

matches dtcmvp 2.0 dark theme:
- brand green `#7bed9f`, blue `#70a1ff`, orange `#ffa502`
- backgrounds: slate-900 `#0f172a`, slate-800 `#1e293b`
- fonts: Space Grotesk (headings), Inter (body), Space Mono (data)

## recommendation engine

current implementation (client-side):
1. brand profile has priorities (marketing, operations, etc.)
2. match against offer tags + categories
3. score by overlap, return top results
4. optional questionnaire for refined matching
5. MoleculeLoader 3D animation during "analysis"

future: could use SeanVoice agent or Claude API for smarter matching

---

## backend work needed

### option A: add to webhook-server-v2 (recommended)

add handlers to `dtcmvp-app/handlers/` — same pattern as linkedinDashboard, meetings, etc.

**database**: new SQLite database `offers.db` on DO (or add tables to existing)

```sql
offers (id, partner_id, name, short_description, full_description, video_url,
        category_id, tag_ids JSON, claim_instructions, form_fields JSON,
        status, is_active, champion JSON, created_at, updated_at)

claims (id, offer_id, brand_id, brand_name, brand_email,
        form_data JSON, status, claimed_at, reviewed_at, notes)

partners (id, name, description, logo_url, website, category_ids JSON)
categories (id, name, description, color)
tags (id, name, category_id)
```

**API endpoints** (at `webhooks.dtcmvp.com/api/offers/`):

| method | path | auth | description |
|--------|------|------|-------------|
| GET | /offers | public or auth | list active offers with filters |
| GET | /offers/:id | public or auth | single offer detail |
| POST | /offers | admin | create offer |
| PUT | /offers/:id | admin | update offer |
| DELETE | /offers/:id | admin | archive offer |
| GET | /offers/categories | public | list categories |
| GET | /offers/tags | public | list tags |
| GET | /offers/partners | public | list partners |
| POST | /claims | auth (brand) | submit a claim |
| GET | /claims | auth (brand) | user's claims |
| GET | /admin/claims | admin | all claims with filters |
| PUT | /admin/claims/:id | admin | update claim status |
| POST | /offers/recommend | auth | AI recommendations |

### option B: add to dtcmvp-2.0 as pages (no separate app)

since dtcmvp-2.0 is the unified frontend, offers could become pages within it:
- `/offers` route in dtcmvp-2.0 sidebar (new section)
- API proxy routes like other features
- shares auth, design system, ChatBar
- no separate deployment needed

**this is the recommended path** — avoids another standalone app.

## integration with dtcmvp 2.0

### as embedded pages (recommended)

1. **port offers pages** into dtcmvp-2.0 frontend at `/offers/*`
2. **add sidebar section** "marketplace" with offers link
3. **share auth** — brands already log in via Supabase
4. **share ChatBar** — agent can help find offers
5. **add API proxy routes** at `/api/offers/*` → webhook server
6. **backend handlers** in dtcmvp-app with SQLite database

### brand user flow
1. brand logs into dtcmvp 2.0 (already works via Supabase)
2. sidebar shows "marketplace" section with "offers" link
3. browse/filter/claim offers
4. claimed offers tracked in their profile
5. admin reviews claims in admin section

### data connections
- brand identity from Supabase auth (brand users already exist)
- partner companies already in Airtable (can link or duplicate)
- claims could trigger Slack notifications to #dtcmvp-cs
- SeanVoice agent could recommend offers based on meeting data

## dev setup

```bash
cd dtcmvp-offers
npm install
npm run dev    # http://localhost:3000
```

no env vars needed (all data is mocked).

---

*last updated: march 2026*
