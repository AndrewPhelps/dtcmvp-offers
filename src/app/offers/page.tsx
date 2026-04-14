/**
 * /offers — marketplace landing page.
 *
 * Server component: fetches offers/categories/tags/partners from the backend
 * (hourly-synced from Airtable), then hands data off to the client component
 * for the interactive grid + filters.
 *
 * Backend lives at NEXT_PUBLIC_API_URL/offers/* — see dtcmvp-app/handlers/offers.
 */

import OffersMarketplaceClient from './OffersMarketplaceClient';
import {
  getOffers,
  getCategorySummaries,
  getPartnerSummaries,
  getTagSummaries,
} from '@/lib/api';
import { Offer, Partner, Category, Tag } from '@/types';
import { categories as fallbackCategories } from '@/data/categories';

// Always render fresh (honors hourly Airtable sync). Flip to revalidate later if needed.
export const dynamic = 'force-dynamic';

export default async function OffersPage() {
  const [offers, categoryRows, tagRows, partnerRows] = await Promise.all([
    getOffers(),
    getCategorySummaries(),
    getTagSummaries(),
    getPartnerSummaries(),
  ]);

  // The backend doesn't carry the legacy UI color-per-category mapping, so we
  // overlay it from the static list. Falls back to 'blue' for anything new.
  const colorById = new Map(fallbackCategories.map((c) => [c.id, c.color]));
  const categories: Category[] = categoryRows.map((c) => ({
    id: c.id,
    name: c.name,
    color: colorById.get(c.id) || 'blue',
  }));

  const tags: Tag[] = tagRows.map((t) => ({ id: t.id, name: t.name }));

  const partners: Partner[] = partnerRows.map((p) => ({
    id: p.airtableId,
    name: p.name,
    website: '',
    description: '',
  }));

  return (
    <OffersMarketplaceClient
      offers={offers as Offer[]}
      partners={partners}
      categories={categories}
      tags={tags}
    />
  );
}
