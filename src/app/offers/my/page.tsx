/**
 * /offers/my — saved + claimed offers.
 *
 * Server component: fetches the full offer catalog so the client can resolve
 * locally-stored saved/claimed slugs to full offer objects. Claims state
 * (which slugs) still lives in BrandContext (localStorage) for v1.
 */

import MyOffersClient from './MyOffersClient';
import { getOffers, getPartnerSummaries } from '@/lib/api';
import { Partner } from '@/types';

export const dynamic = 'force-dynamic';

export default async function MyOffersPage() {
  const [offers, partnerRows] = await Promise.all([getOffers(), getPartnerSummaries()]);

  const partners: Partner[] = partnerRows.map((p) => ({
    id: p.airtableId,
    name: p.name,
    website: '',
    description: '',
  }));

  return <MyOffersClient offers={offers} partners={partners} />;
}
