'use client';

import { Offer } from '@/types';
import { getPartner } from '@/data';
import OfferCard from './OfferCard';

interface OfferGridProps {
  offers: Offer[];
}

export default function OfferGrid({ offers }: OfferGridProps) {
  if (offers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-secondary)]">No offers found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {offers.map((offer) => {
        const partner = getPartner(offer.partnerId);
        if (!partner) return null;
        return <OfferCard key={offer.id} offer={offer} partner={partner} />;
      })}
    </div>
  );
}
