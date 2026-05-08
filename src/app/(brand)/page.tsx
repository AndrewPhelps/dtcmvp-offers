// /swags — partner SWAG marketplace landing.
// Backend lives at NEXT_PUBLIC_API_URL/listings* — see dtcmvp-app/handlers/listings
// and the Listings-backfill plan at ~/.claude/plans/let-s-keep-pricing-off-ethereal-thimble.md.

import SwagsMarketplaceClient from './SwagsMarketplaceClient';
import { getListings } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function SwagsPage() {
  const listings = await getListings();
  return <SwagsMarketplaceClient listings={listings} />;
}
