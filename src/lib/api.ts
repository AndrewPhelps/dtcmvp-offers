/**
 * API client for the offers backend.
 *
 * Base URL comes from NEXT_PUBLIC_API_URL (baked at build time).
 * Backend lives at https://webhooks.dtcmvp.com/api — see dtcmvp-app/handlers/offers.
 *
 * Server-side fetches (RSC) use `{ cache: 'no-store' }` so each request reflects
 * the latest hourly Airtable sync. For static generation we'd switch to
 * `{ next: { revalidate: 3600 } }` but SSR is fine at current traffic.
 */

import { Offer, Partner, FormField, OfferChampion } from '@/types';
import { authFetch } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://webhooks.dtcmvp.com/api';

// ----- API response shapes (snake_case, what the backend returns) -----

interface ApiOffer {
  airtable_id: string;
  slug: string;
  name: string;
  partner_airtable_id: string | null;
  partner_name: string | null;
  partner_website: string | null;
  partner_logo_url: string | null;
  partner_description: string | null;
  short_description: string | null;
  full_description: string | null;
  video_url: string | null;
  category: string | null;
  tags: string[];
  claim_instructions: string | null;
  form_fields: FormField[];
  status: 'active' | 'draft' | 'archived';
  is_active: boolean;
  sample_deliverable_url: string | null;
  champion_name: string | null;
  champion_title: string | null;
  champion_brand: string | null;
  champion_avatar_url: string | null;
  champion_linkedin_url: string | null;
  airtable_created_at: string | null;
}

interface ApiCategoryCount {
  category: string;
  offer_count: number;
}

interface ApiTagCount {
  name: string;
  offer_count: number;
}

interface ApiPartnerSummary {
  partner_airtable_id: string;
  partner_name: string;
  offer_count: number;
}

// ----- Mappers: backend snake_case → frontend Offer type -----

function mapApiOffer(a: ApiOffer): Offer {
  const champion: OfferChampion | undefined = a.champion_name
    ? {
        name: a.champion_name,
        title: a.champion_title || '',
        brand: a.champion_brand || '',
        avatarUrl: a.champion_avatar_url || '',
        linkedInUrl: a.champion_linkedin_url || undefined,
      }
    : undefined;

  return {
    id: a.slug,
    partnerId: a.partner_airtable_id || '',
    name: a.name,
    shortDescription: a.short_description || '',
    fullDescription: a.full_description || '',
    videoUrl: a.video_url || undefined,
    categoryId: a.category ? slugifyCategory(a.category) : '',
    tagIds: (a.tags || []).map(slugifyTag),
    claimInstructions: a.claim_instructions || undefined,
    formFields: a.form_fields || [],
    status: a.status,
    isActive: a.is_active,
    sampleDeliverablePdf: a.sample_deliverable_url || undefined,
    champion,
    createdAt: a.airtable_created_at || '',
  };
}

// Derive the category slug used by the existing UI (`operations`, `email-sms-subscribers`)
// from the Airtable display name ("Operations", "Email, SMS & Subscribers").
export function slugifyCategory(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function slugifyTag(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ----- Fetchers -----

async function apiGet<T>(path: string): Promise<T> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`API ${res.status} from ${url}: ${await res.text().catch(() => '')}`);
  }
  return res.json() as Promise<T>;
}

function partnerFromApiOffer(a: ApiOffer): Partner | null {
  if (!a.partner_airtable_id) return null;
  return {
    id: a.partner_airtable_id,
    name: a.partner_name || a.partner_airtable_id,
    website: a.partner_website || '',
    logo: a.partner_logo_url || undefined,
    description: a.partner_description || '',
  };
}

export async function getOffers(): Promise<Offer[]> {
  const data = await apiGet<{ offers: ApiOffer[]; count: number }>('/offers');
  return data.offers.map(mapApiOffer);
}

/**
 * Fetch offers + derive the unique partner list (with logos) from the same
 * response. The backend denormalizes partner info onto each offer, so one
 * API call covers both views.
 */
export async function getOffersAndPartners(): Promise<{ offers: Offer[]; partners: Partner[] }> {
  const data = await apiGet<{ offers: ApiOffer[]; count: number }>('/offers');
  const offers = data.offers.map(mapApiOffer);
  const partnerMap = new Map<string, Partner>();
  for (const a of data.offers) {
    const p = partnerFromApiOffer(a);
    if (p && !partnerMap.has(p.id)) partnerMap.set(p.id, p);
  }
  return { offers, partners: Array.from(partnerMap.values()) };
}

export async function getOfferBySlug(slug: string): Promise<{ offer: Offer; partner: Partner | null } | null> {
  try {
    const data = await apiGet<{ offer: ApiOffer }>(`/offers/${encodeURIComponent(slug)}`);
    return {
      offer: mapApiOffer(data.offer),
      partner: partnerFromApiOffer(data.offer),
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) return null;
    throw err;
  }
}

export interface CategorySummary {
  id: string;     // slug form
  name: string;   // display name from Airtable
  count: number;
}

export async function getCategorySummaries(): Promise<CategorySummary[]> {
  const data = await apiGet<{ categories: ApiCategoryCount[] }>('/offers/categories');
  return data.categories.map((c) => ({
    id: slugifyCategory(c.category),
    name: c.category,
    count: c.offer_count,
  }));
}

export interface TagSummary {
  id: string;
  name: string;
  count: number;
}

export async function getTagSummaries(): Promise<TagSummary[]> {
  const data = await apiGet<{ tags: ApiTagCount[] }>('/offers/tags');
  return data.tags.map((t) => ({
    id: slugifyTag(t.name),
    name: t.name,
    count: t.offer_count,
  }));
}

export interface PartnerSummary {
  airtableId: string;
  name: string;
  count: number;
}

export async function getPartnerSummaries(): Promise<PartnerSummary[]> {
  const data = await apiGet<{ partners: ApiPartnerSummary[] }>('/offers/partners');
  return data.partners.map((p) => ({
    airtableId: p.partner_airtable_id,
    name: p.partner_name,
    count: p.offer_count,
  }));
}

// ----- Claims -----

export interface SubmitClaimInput {
  slug: string;
  formData: Record<string, string | boolean>;
}

export interface ClaimRecord {
  claim_id: string;
  offer_slug: string;
  offer_name: string;
  status: 'pending' | 'reviewed' | 'completed';
  claimed_at: string;
  notes?: string | null;
  reviewed_at?: string | null;
}

export interface SubmitClaimResult {
  success: true;
  claim: ClaimRecord;
}

/**
 * Submit a claim. Auth required — backend derives identity from session.
 */
export async function submitClaim(input: SubmitClaimInput): Promise<SubmitClaimResult> {
  const res = await authFetch(`${API_URL}/offers/claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Claim submission failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<SubmitClaimResult>;
}

export interface TestBrandMatch {
  contactAirtableId: string;
  name: string | null;
  email: string | null;
  title: string | null;
  companyAirtableId: string | null;
  companyName: string | null;
  primaryCategoryBucket: string | null;
}

/**
 * Admin-only: search Brand-type Contacts by email substring.
 */
export async function searchTestBrands(q: string): Promise<TestBrandMatch[]> {
  if (!q || q.trim().length < 2) return [];
  const res = await authFetch(`${API_URL}/offers/admin/test-brands?q=${encodeURIComponent(q.trim())}`);
  if (!res.ok) {
    if (res.status === 403 || res.status === 401) return [];
    throw new Error(`searchTestBrands failed (${res.status})`);
  }
  const data = (await res.json()) as { contacts: TestBrandMatch[] };
  return data.contacts || [];
}

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

/**
 * Submit a SWAG "Ask for an intro" request. Auth required.
 * Server posts to Slack and logs verbosely; no Airtable record yet.
 */
export async function submitIntroRequest(input: SubmitIntroInput): Promise<{ success: true }> {
  const res = await authFetch(`${API_URL}/offers/intros`, {
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

/**
 * Append an outcome note to a claim. Server concatenates with existing
 * Notes (timestamped); the previous content is never overwritten.
 */
export async function appendClaimNotes(claimId: string, notes: string): Promise<{ success: true; claim_id: string; notes: string }> {
  const res = await authFetch(`${API_URL}/offers/claims/${encodeURIComponent(claimId)}/notes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`appendClaimNotes failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<{ success: true; claim_id: string; notes: string }>;
}

/**
 * Fetch claims belonging to the authenticated user (matched by email).
 */
export async function getMyClaims(): Promise<ClaimRecord[]> {
  const res = await authFetch(`${API_URL}/offers/claims/mine`);
  if (!res.ok) {
    if (res.status === 401) return [];
    const body = await res.text().catch(() => '');
    throw new Error(`getMyClaims failed (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { claims: ClaimRecord[] };
  return data.claims;
}
