/**
 * API client for the SWAG marketplace backend.
 *
 * Base URL comes from NEXT_PUBLIC_API_URL (baked at build time).
 * Backend lives at https://webhooks.dtcmvp.com/api — see dtcmvp-app/handlers/listings.
 *
 * Server-side fetches (RSC) use `{ cache: 'no-store' }` so each request reflects
 * the latest hourly Airtable sync.
 */

import { Listing, ListingChampion, BrandRequest, BenefitType, RequestStatus } from '@/types';
import { authFetch } from '@/lib/auth';
import type { BrandProfile } from '@/lib/swag/swag-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://webhooks.dtcmvp.com/api';

async function apiGet<T>(path: string): Promise<T> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`API ${res.status} from ${url}: ${await res.text().catch(() => '')}`);
  }
  return res.json() as Promise<T>;
}

export function slugifyTag(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ----- Listings + Requests -----

interface ApiListing {
  airtable_id: string;
  slug: string;
  name: string;
  tagline: string | null;
  short_description: string | null;
  benefit_bullets: string | null;       // newline-separated; we split on the client
  tags: string[];
  tier: number | null;
  logo_url: string | null;
  partner_url: string | null;
  video_url: string | null;
  partner_airtable_id: string | null;
  champion_airtable_id: string | null;
  champion_name: string | null;
  champion_title: string | null;
  champion_brand: string | null;        // company name from Champion lookup
  champion_avatar_url: string | null;
  champion_linkedin_url: string | null;
  status: 'active' | 'draft' | 'archived';
  is_active: boolean;
  created_at: string | null;
  // Structured filter dimensions (populated by sync-listings.js from each spec).
  // Backend may return null/undefined while the sync is still backfilling — fall back to [].
  benefit_types?: BenefitType[] | null;
  benefit_labels?: string[] | null;
  departments?: string[] | null;
  categories?: string[] | null;
}

interface ApiRequest {
  airtable_id: string;
  listing_slug: string;
  listing_name: string;
  status: RequestStatus;
  generated_at: string;
  intro_requested_at: string | null;
  notes: string | null;
  swag_total_annual_value: number | null;
  swag_max_monthly_price: number | null;
  swag_target_roi_multiple: number | null;
}

interface ApiTagCount {
  name: string;
  listing_count: number;
}

function mapApiListing(a: ApiListing): Listing {
  const champion: ListingChampion | undefined = a.champion_name
    ? {
        airtableId: a.champion_airtable_id || undefined,
        name: a.champion_name,
        title: a.champion_title || '',
        brand: a.champion_brand || '',
        avatarUrl: a.champion_avatar_url || '',
        linkedInUrl: a.champion_linkedin_url || undefined,
      }
    : undefined;

  return {
    airtableId: a.airtable_id,
    slug: a.slug,
    name: a.name,
    tagline: a.tagline || '',
    shortDescription: a.short_description || '',
    benefitBullets: (a.benefit_bullets || '')
      .split(/\r?\n/)
      .map((s) => s.replace(/^[-*•\s]+/, '').trim())
      .filter(Boolean),
    tags: a.tags || [],
    tier: a.tier ?? 0,
    logoUrl: a.logo_url || undefined,
    partnerUrl: a.partner_url || undefined,
    videoUrl: a.video_url || undefined,
    partnerAirtableId: a.partner_airtable_id || undefined,
    champion,
    status: a.status,
    isActive: a.is_active,
    createdAt: a.created_at || '',
    benefitTypes: a.benefit_types || [],
    benefitLabels: a.benefit_labels || [],
    departments: a.departments || [],
    categories: a.categories || [],
  };
}

function mapApiRequest(a: ApiRequest): BrandRequest {
  return {
    airtableId: a.airtable_id,
    listingSlug: a.listing_slug,
    listingName: a.listing_name,
    status: a.status,
    generatedAt: a.generated_at,
    introRequestedAt: a.intro_requested_at || undefined,
    notes: a.notes || undefined,
    swagSnapshot:
      a.swag_total_annual_value !== null || a.swag_max_monthly_price !== null
        ? {
            totalAnnualValue: a.swag_total_annual_value ?? undefined,
            maxMonthlyPrice: a.swag_max_monthly_price ?? undefined,
            targetRoiMultiple: a.swag_target_roi_multiple ?? undefined,
          }
        : undefined,
  };
}

export async function getListings(): Promise<Listing[]> {
  const data = await apiGet<{ listings: ApiListing[]; count: number }>('/listings');
  return data.listings.map(mapApiListing);
}

export async function getListingBySlug(slug: string): Promise<Listing | null> {
  try {
    const data = await apiGet<{ listing: ApiListing }>(
      `/listings/${encodeURIComponent(slug)}`,
    );
    return mapApiListing(data.listing);
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) return null;
    throw err;
  }
}

export interface TagSummary {
  id: string;
  name: string;
  count: number;
}

export async function getListingTagSummaries(): Promise<TagSummary[]> {
  const data = await apiGet<{ tags: ApiTagCount[] }>('/listings/tags');
  return data.tags.map((t) => ({
    id: slugifyTag(t.name),
    name: t.name,
    count: t.listing_count,
  }));
}

export interface CreateRequestInput {
  listingSlug: string;
  swagSnapshot?: {
    totalAnnualValue?: number;
    maxMonthlyPrice?: number;
    targetRoiMultiple?: number;
  };
}

export interface CreateRequestResult {
  success: true;
  request: BrandRequest;
  isNew: boolean;
}

/**
 * Upsert a Request for the authenticated brand contact + given listing.
 * Backend dedupes on (contact, listing) — second call for the same pair
 * returns the existing record with `isNew: false`.
 */
export async function createRequest(input: CreateRequestInput): Promise<CreateRequestResult> {
  const res = await authFetch(`${API_URL}/listings/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`createRequest failed (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { success: true; request: ApiRequest; is_new: boolean };
  return { success: true, request: mapApiRequest(data.request), isNew: data.is_new };
}

/** Fetch all Requests belonging to the authenticated brand contact. */
export async function getMyRequests(): Promise<BrandRequest[]> {
  const res = await authFetch(`${API_URL}/listings/requests/mine`);
  if (!res.ok) {
    if (res.status === 401) return [];
    const body = await res.text().catch(() => '');
    throw new Error(`getMyRequests failed (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { requests: ApiRequest[] };
  return data.requests.map(mapApiRequest);
}

/** Append an outcome note to a Request. Concatenated server-side, never overwritten. */
export async function appendRequestNotes(
  airtableId: string,
  notes: string,
): Promise<{ success: true; airtable_id: string; notes: string }> {
  const res = await authFetch(
    `${API_URL}/listings/requests/${encodeURIComponent(airtableId)}/notes`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`appendRequestNotes failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<{ success: true; airtable_id: string; notes: string }>;
}

// ----- Admin-only helpers (still used by SwagCalculator AdminToolbar / TestBrandPicker) -----

export interface TestBrandMatch {
  contactAirtableId: string;
  name: string | null;
  email: string | null;
  title: string | null;
  companyAirtableId: string | null;
  companyName: string | null;
  primaryCategoryBucket: string | null;
}

export async function searchTestBrands(q: string): Promise<TestBrandMatch[]> {
  if (!q || q.trim().length < 2) return [];
  const res = await authFetch(`${API_URL}/listings/admin/test-brands?q=${encodeURIComponent(q.trim())}`);
  if (!res.ok) {
    if (res.status === 403 || res.status === 401) return [];
    throw new Error(`searchTestBrands failed (${res.status})`);
  }
  const data = (await res.json()) as { contacts: TestBrandMatch[] };
  return data.contacts || [];
}

// ----- "Ask for an intro" submission (fired from inside SwagCalculator) -----

export interface SubmitIntroInput {
  partnerSlug: string;
  partnerName: string;
  email: string;
  brandProfile: {
    brandName?: string;
    contactName?: string;
    department?: string;
    primaryCategory?: string;
    targetRoiMultiple?: number;
  };
  swagSummary: {
    totalAnnualValue?: number;
    maxMonthlyPrice?: number;
  };
}

export async function submitIntroRequest(input: SubmitIntroInput): Promise<{ success: true }> {
  const res = await authFetch(`${API_URL}/listings/intros`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Intro request failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<{ success: true }>;
}

// ----- Brand Inputs (the Inputs surface) -----

export type BrandInputs = Partial<BrandProfile>;

export interface InputsPrefill {
  /** The brand's previously-saved Inputs, or null if they've never saved. */
  saved: BrandInputs | null;
  /** Partial profile derived from Airtable enrichment + Storeleads. */
  prefill: BrandInputs;
}

/**
 * Prefill cascade for the authed brand. Returns the saved Inputs (if any) plus
 * an enrichment-derived partial profile; the caller runs both through
 * cascade() from @/lib/inputs.
 */
export async function getInputsPrefill(): Promise<InputsPrefill> {
  const res = await authFetch(`${API_URL}/inputs/prefill`);
  if (!res.ok) {
    if (res.status === 401) return { saved: null, prefill: {} };
    throw new Error(`getInputsPrefill failed (${res.status})`);
  }
  return (await res.json()) as InputsPrefill;
}

/** Persist the authed brand's Inputs. */
export async function saveMyInputs(inputs: BrandInputs): Promise<void> {
  const res = await authFetch(`${API_URL}/inputs/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`saveMyInputs failed (${res.status}): ${body}`);
  }
}
