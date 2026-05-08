// /swags/[slug] — deep-link target. Renders the marketplace with the drawer pre-opened.

import { notFound } from 'next/navigation';
import SwagsMarketplaceClient from '../SwagsMarketplaceClient';
import { getListings, getListingTagSummaries } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface SwagListingDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function SwagListingDetailPage({ params }: SwagListingDetailPageProps) {
  const { slug } = await params;
  const [listings, tags] = await Promise.all([
    getListings(),
    getListingTagSummaries(),
  ]);
  const found = listings.find((l) => l.slug === slug);
  if (!found) notFound();
  return <SwagsMarketplaceClient listings={listings} tags={tags} initialListingSlug={slug} />;
}
