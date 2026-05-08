'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/common';
import { Listing } from '@/types';
import { tagBadgeStyle } from '@/lib';

interface SwagListingCardProps {
  listing: Listing;
}

export default function SwagListingCard({ listing }: SwagListingCardProps) {
  return (
    <Link href={`/${listing.slug}`}>
      <Card variant="interactive" className="h-full flex flex-col">
        <div className="p-5 flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
              {listing.logoUrl ? (
                <Image
                  src={listing.logoUrl}
                  alt={listing.name}
                  width={36}
                  height={36}
                  className="object-contain w-7 h-7"
                />
              ) : (
                <span className="text-xs font-bold text-slate-600">
                  {listing.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{listing.name}</p>
              {listing.partnerUrl && (
                <p className="text-xs text-[var(--text-tertiary)]">{listing.partnerUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
              )}
            </div>
          </div>

          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
            {listing.tagline}
          </h3>
          {listing.shortDescription && (
            <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">
              {listing.shortDescription}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {listing.tags.slice(0, 4).map((tag) => (
              <span key={tag} className={`text-xs px-2 py-0.5 rounded-full border ${tagBadgeStyle}`}>
                {tag}
              </span>
            ))}
          </div>

          {listing.champion?.name && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border-default)]">
              <div className="w-8 h-8 rounded-full bg-[var(--bg-card-hover)] flex items-center justify-center overflow-hidden flex-shrink-0">
                {listing.champion.avatarUrl ? (
                  <img
                    src={listing.champion.avatarUrl}
                    alt={listing.champion.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    {listing.champion.name.split(' ').map((n) => n[0]).join('')}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">
                Recommended by{' '}
                <span className="text-[var(--text-secondary)]">{listing.champion.name}</span>
                {listing.champion.title && `, ${listing.champion.title}`}
                {listing.champion.brand && ` at ${listing.champion.brand}`}
              </p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[var(--border-default)] flex items-center justify-between">
          <span className="text-sm text-[var(--brand-green-primary)] font-medium">
            view swag
          </span>
          <ArrowRight className="w-4 h-4 text-[var(--brand-green-primary)]" />
        </div>
      </Card>
    </Link>
  );
}
