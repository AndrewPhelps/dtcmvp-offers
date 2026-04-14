'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { getCategory, getTagsByIds } from '@/data';
import { Card } from '@/components/common';
import { Navbar } from '@/components/layout';
import { ClaimForm } from '@/components/offers';
import { getCategoryColorByColorName } from '@/lib';
import { Offer, Partner } from '@/types';

interface OfferDetailClientProps {
  offer: Offer;
  partner: Partner;
}

export default function OfferDetailClient({ offer, partner }: OfferDetailClientProps) {
  // Get category and tags
  const category = getCategory(offer.categoryId);
  const categoryColor = category ? getCategoryColorByColorName(category.color) : getCategoryColorByColorName('blue');
  const offerTags = getTagsByIds(offer.tagIds);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
        href="/offers"
        className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to offers
      </Link>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              {category && (
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${categoryColor.badge}`}>
                  {category.name}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
              {offer.name}
            </h1>
            <p className="text-lg text-[var(--text-secondary)]">
              {offer.shortDescription}
            </p>
          </div>

          {/* Champion / Recommended by */}
          {offer.champion && offer.champion.name && (
            <Card className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[var(--bg-card-hover)] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {offer.champion.avatarUrl ? (
                    <img
                      src={offer.champion.avatarUrl}
                      alt={offer.champion.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-medium text-[var(--text-secondary)]">
                      {offer.champion.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Recommended by</p>
                  <p className="font-semibold text-[var(--text-primary)]">
                    {offer.champion.name}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {offer.champion.title} at {offer.champion.brand}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Full description */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              About this offer
            </h2>
            <div className="prose prose-invert max-w-none">
              {offer.fullDescription.split('\n\n').map((paragraph, i) => (
                <p key={i} className="text-[var(--text-secondary)] mb-4 last:mb-0 whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>
          </Card>

          {/* Partner info */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                {partner.logo ? (
                  <Image
                    src={partner.logo}
                    alt={`${partner.name} logo`}
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                ) : (
                  <span className="text-sm font-bold text-slate-600">
                    {partner.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--text-primary)] mb-1">
                  {partner.name}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {partner.description}
                </p>
                <a
                  href={`https://${partner.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-card-hover)] hover:bg-[var(--border-hover)] border border-[var(--border-default)] rounded-lg transition-colors"
                >
                  Visit website
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </Card>

          {/* Claim instructions if present */}
          {offer.claimInstructions && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                How it works
              </h2>
              <div className="space-y-2">
                {offer.claimInstructions.split('\n').map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[var(--brand-green-primary)]/20 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-[var(--brand-green-primary)]">
                      {i + 1}
                    </span>
                    <p className="text-[var(--text-secondary)] pt-0.5">
                      {step.replace(/^\d+\.\s*/, '')}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Tags */}
          {offerTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {offerTags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-3 py-1 text-sm bg-[var(--bg-card)] border border-[var(--border-default)] rounded-full text-[var(--text-tertiary)]"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar - Claim form */}
        <div className="lg:col-span-2">
          <div className="sticky top-8">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
                Claim this offer
              </h2>
              <ClaimForm
                offerSlug={offer.id}
                offerName={offer.name}
                formFields={offer.formFields}
              />
            </Card>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
