# Airtable seed data for dtcmvp-offers

Three CSVs generated from the current mock data in `../src/data/*`. Re-run the generator anytime the mock data changes:

```bash
npx tsx airtable/generate-csvs.ts
```

## Files

| File | Purpose |
|---|---|
| `offers.csv` | 20 offers, one row each. Import as a new **Offers** table in the main base (`appnBsoKSUIYu6Nn1`). |
| `claims.csv` | 3 sample claims. Import as a new **Claims** table. Safe to delete sample rows after. |
| `partners-reference.csv` | 20 partners + the 2 new fields we need on Companies. **Do not import this** — it's a reference sheet so VAs know which Companies rows to update with Offer Partner Description + Logo. |

## Import order

Import Offers first, then Claims. Link-to-record fields need the other table to already exist.

---

## Step 1 — Add 3 fields to the existing **Companies** table

CSV import can't add fields to an existing table, so do this by hand:

| Field name | Type |
|---|---|
| Offer Partner Description | Long text |
| Offer Partner Logo | Attachment |
| Offer Partner Active | Checkbox |

Use `partners-reference.csv` as a cheat sheet to populate Description + Logo filename for the 20 partners already in Companies.

---

## Step 2 — Import `offers.csv` as new **Offers** table

1. Base → `+ Add or import` → `CSV file` → pick `offers.csv` → create as new table named **Offers**
2. After import, every column will be "Single line text". Convert these:

| Column | Convert to | Notes |
|---|---|---|
| Slug | Single line text | (default — leave as-is) |
| Name | Single line text | Make this the primary field |
| Partner | Link to another record | Target: **Companies**. Airtable will match on name — confirm matches for all 20 |
| Short Description | Long text | |
| Full Description | Long text | |
| Video URL | URL | |
| Category | **Single select** | Options auto-populate from the 7 values in the data |
| Tags | **Multiple select** | Airtable prompts for delimiter → choose `,` (comma) → options auto-populate from the ~40 unique tag values |
| Claim Instructions | Long text | |
| Form Fields (JSON) | Long text | Keep as text; contains escaped JSON |
| Status | **Single select** | 3 values: active, draft, archived |
| Is Active | **Checkbox** | Cells contain `true` / `false` — Airtable detects |
| Sample Deliverable | Attachment | Filenames only in the CSV (e.g. `sample-fraud-audit.pdf`); re-upload actual PDFs after |
| Champion Name / Title / Brand | Single line text | |
| Champion Avatar URL | URL | Paths currently like `/avatars/sarah-chen.jpg` — will validate as URL once hosted |
| Champion LinkedIn URL | URL | |
| Created At | Date | Enable "include time" |

3. Create views:
   - **Active** — filter `Status = active AND Is Active = checked`
   - **Draft** — filter `Status = draft`
   - **Archived** — filter `Status = archived`

---

## Step 3 — Import `claims.csv` as new **Claims** table

1. Base → `+ Add or import` → `CSV file` → pick `claims.csv` → create as new table named **Claims**
2. Convert fields:

| Column | Convert to | Notes |
|---|---|---|
| Claim ID | Single line text | Primary field |
| Offer | Link to another record | Target: **Offers**. Matches by Name |
| Brand Name | Single line text | Snapshot at claim time |
| Brand Email | Email | |
| Form Data (JSON) | Long text | |
| Status | **Single select** | 3 values: pending, reviewed, completed |
| Claimed At | Date | Enable "include time" |
| Reviewed At | Date | Enable "include time" |
| Notes | Long text | |

3. Add these fields manually after import (CSV can't seed link-to-record to other tables):

| Field | Type | Notes |
|---|---|---|
| Brand Contact | Link to another record → **Contacts** | Allow 1. Optional — populated by the API when a claim submitter matches an existing contact |
| Brand Company | Link to another record → **Companies** | Allow 1. Optional — same pattern |

4. Create view **Pending** — filter `Status = pending`, sort by `Claimed At` desc.

---

## Gotchas

- **Multi-line cells**: `Full Description` and `Claim Instructions` contain embedded newlines (bullet lists). Airtable preserves these correctly — `offers.csv` shows as 150 lines total but resolves to 20 records.
- **Delimiter for Tags**: must pick comma when converting to multi-select. Tag names themselves never contain commas so this is safe.
- **Category with comma in name**: "Email, SMS & Subscribers" contains a comma. For a singleSelect this is fine — the whole quoted cell becomes one option. Verify after conversion that the option name wasn't split.
- **JSON columns**: `Form Fields (JSON)` and `Form Data (JSON)` stay as Long text. The backend will parse/write them as JSON strings.

---

## After setup

Once these tables exist in Airtable, the next step is the backend wiring:
- new handler `dtcmvp-app/handlers/offers/` with hourly Airtable→SQLite sync for Offers (+ Companies' offer fields)
- `POST /api/offers/claims` endpoint that writes to both Airtable and SQLite
- replace mock imports in `src/data/*.ts` with fetches to `webhooks.dtcmvp.com/api/offers/*`
