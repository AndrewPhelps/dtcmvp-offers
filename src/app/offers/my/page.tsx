/**
 * /offers/my — saved + claimed offers.
 *
 * Server component: fetches the full offer catalog so the client can resolve
 * locally-stored saved/claimed slugs to full offer objects. Claims state
 * (which slugs) still lives in BrandContext (localStorage) for v1.
 */

import MyOffersClient from './MyOffersClient';
import { getOffersAndPartners } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function MyOffersPage() {
  const { offers, partners } = await getOffersAndPartners();
  return <MyOffersClient offers={offers} partners={partners} />;
}
