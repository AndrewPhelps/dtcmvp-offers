// SWAG marketplace types. Source of truth: Airtable Listings table (tblflFmuuuDhcs0mX),
// mirrored to listings_listings in dtcmvp-tam-large.db. See the backend plan at
// ~/.claude/plans/let-s-keep-pricing-off-ethereal-thimble.md.

export interface ListingChampion {
  airtableId?: string;
  name: string;
  title: string;
  brand: string;
  avatarUrl: string;
  linkedInUrl?: string;
}

export interface Listing {
  airtableId: string;        // Airtable record ID (canonical for downstream linking)
  slug: string;              // URL key + join key with swags.db
  name: string;              // partner display name (the card/modal title)
  tagline: string;           // one-sentence value prop
  shortDescription: string;  // 2-3 sentence overview (LLM-generated from SWAG spec)
  benefitBullets: string[];  // 3-5 plain-English bullets (LLM-generated)
  tags: string[];            // lowercase, e.g. ["email", "sms", "crm"]
  tier: number;              // 0/1/2 — sort key for the marketplace
  logoUrl?: string;          // partner logo (from 1800dtc.db apps.logo_url)
  partnerUrl?: string;       // resolved canonical (no 1800dtc redirects)
  videoUrl?: string;         // reserved for future
  partnerAirtableId?: string; // Companies record (linked when applicable)
  champion?: ListingChampion;
  status: 'active' | 'draft' | 'archived';
  isActive: boolean;
  createdAt: string;
}

export type RequestStatus = 'generated' | 'intro_requested' | 'intro_sent' | 'completed';

/** A "Generate SWAG" event — one row per (brand contact, listing). Upsert on click. */
export interface BrandRequest {
  airtableId: string;
  listingSlug: string;
  listingName: string;
  status: RequestStatus;
  generatedAt: string;
  notes?: string;
  swagSnapshot?: {
    totalAnnualValue?: number;
    maxMonthlyPrice?: number;
    targetRoiMultiple?: number;
  };
}

/**
 * Slim shape used by the recommendation engine in BrandContext.
 * The marketplace adapter (SwagsMarketplaceClient) projects each Listing
 * down to this. Future cleanup: feed Listing[] directly to the engine.
 */
export interface Offer {
  id: string;
  isActive: boolean;
}
