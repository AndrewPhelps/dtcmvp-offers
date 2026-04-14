/**
 * /offers/[id] — single offer detail page.
 *
 * Server component: fetches the offer by slug + derives partner info,
 * hands off to client for rendering + the claim form.
 */

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/common';
import { Navbar } from '@/components/layout';
import OfferDetailClient from './OfferDetailClient';
import { getOfferBySlug } from '@/lib/api';
import { Partner } from '@/types';

export const dynamic = 'force-dynamic';

interface OfferDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OfferDetailPage({ params }: OfferDetailPageProps) {
  const { id } = await params;
  const offer = await getOfferBySlug(id);

  if (!offer) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link
            href="/offers"
            className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to offers
          </Link>
          <Card className="text-center p-12">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              Offer not found
            </h2>
            <p className="text-[var(--text-secondary)]">
              The offer you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // Minimal partner shape derived from the offer — enough for the detail view
  // (name + website). Full partner record would require an extra API call;
  // the backend doesn't expose `/partners/:id` yet. Website stays empty for
  // now — the detail page only uses it if present.
  const partner: Partner = {
    id: offer.partnerId,
    name: (offer as { partner_name?: string }).partner_name || offer.partnerId,
    website: '',
    description: '',
  };

  return <OfferDetailClient offer={offer} partner={partner} />;
}
