// /swags/my — created (generated) SWAGs + saved-for-later listings.

import MySwagsClient from './MySwagsClient';
import { getListings } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function MySwagsPage() {
  const listings = await getListings();
  return <MySwagsClient listings={listings} />;
}
