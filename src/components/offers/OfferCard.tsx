'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/common';
import Badge from '@/components/common/Badge';
import { Offer, Partner, Category, Tag } from '@/types';
import { getCategoryColorByColorName, tagBadgeStyle } from '@/lib';

interface OfferCardProps {
  offer: Offer;
  partner: Partner;
  category?: Category;
  tags?: Tag[];
}

export default function OfferCard({ offer, partner, category, tags }: OfferCardProps) {
  const categoryColor = category ? getCategoryColorByColorName(category.color) : null;

  return (
    <Link href={`/offers/${offer.id}`}>
      <Card variant="interactive" className="h-full flex flex-col">
        <div className="p-5 flex-1">
          {/* Partner info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--bg-card-hover)] flex items-center justify-center text-[var(--brand-green-primary)] font-semibold text-sm">
              {partner.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{partner.name}</p>
              <p className="text-xs text-[var(--text-tertiary)]">{partner.website}</p>
            </div>
          </div>

          {/* Offer info */}
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            {offer.name} <span className="font-normal text-[var(--text-secondary)]">from {partner.name}</span>
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">
            {offer.shortDescription}
          </p>

          {/* Category and tag badges */}
          <div className="flex flex-wrap gap-2">
            {category && categoryColor && (
              <Badge className={categoryColor.badge}>{category.name}</Badge>
            )}
            {tags?.map((tag) => (
              <Badge key={tag.id} className={tagBadgeStyle}>{tag.name}</Badge>
            ))}
          </div>

          {/* Champion / Recommended by */}
          {offer.champion && offer.champion.name && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border-default)]">
              <div className="w-8 h-8 rounded-full bg-[var(--bg-card-hover)] flex items-center justify-center overflow-hidden flex-shrink-0">
                {offer.champion.avatarUrl ? (
                  <img
                    src={offer.champion.avatarUrl}
                    alt={offer.champion.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    {offer.champion.name.split(' ').map(n => n[0]).join('')}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">
                Recommended by <span className="text-[var(--text-secondary)]">{offer.champion.name}</span>, {offer.champion.title} at {offer.champion.brand}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-default)] flex items-center justify-between">
          <span className="text-sm text-[var(--brand-green-primary)] font-medium">
            Learn more
          </span>
          <ArrowRight className="w-4 h-4 text-[var(--brand-green-primary)]" />
        </div>
      </Card>
    </Link>
  );
}
