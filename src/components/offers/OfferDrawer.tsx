'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Bookmark, EyeOff, FileText, ArrowLeft, BarChart3 } from 'lucide-react';
import { Modal, Button } from '@/components/common';
import { ClaimForm } from '@/components/offers';
import { getCategoryColorByColorName, tagBadgeStyle } from '@/lib';
import { Offer, Partner, Category, Tag } from '@/types';
import { getCategory, getTagsByIds } from '@/data';
import { useBrand } from '@/contexts';
import { getSwagSlugForPartner } from '@/lib/swag/offer-swag-map';
import { getSpec } from '@/lib/swag/partners-registry';

const SwagCalculator = dynamic(() => import('@/components/swag/SwagCalculator'), { ssr: false });

interface OfferDrawerProps {
  offer: Offer | null;
  partner: Partner | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function OfferDrawer({ offer, partner, isOpen, onClose }: OfferDrawerProps) {
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [showSwag, setShowSwag] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const { isOfferSaved, saveOffer, unsaveOffer, hideOffer, claimOffer, isOfferClaimed } = useBrand();

  // Reset to offer view when modal closes or offer changes
  useEffect(() => {
    if (!isOpen) {
      setShowClaimForm(false);
      setShowSwag(false);
      setFormSubmitted(false);
    }
  }, [isOpen]);

  if (!offer || !partner) return null;

  const swagSlug = getSwagSlugForPartner(partner.name);
  const category = getCategory(offer.categoryId);
  const categoryColor = category ? getCategoryColorByColorName(category.color) : getCategoryColorByColorName('blue');
  const offerTags = getTagsByIds(offer.tagIds);
  const isSaved = isOfferSaved(offer.id);
  const isClaimed = isOfferClaimed(offer.id);

  const handleClaimed = (_claimId: string) => {
    // Track locally so the UI reflects the claim immediately (the
    // authoritative record lives in Airtable/the backend).
    claimOffer(offer.id);
  };

  const handleSaveToggle = () => {
    if (isSaved) {
      unsaveOffer(offer.id);
    } else {
      saveOffer(offer.id);
    }
  };

  const handleHide = () => {
    hideOffer(offer.id);
    onClose();
  };

  // Header content with logo, offer name with partner, category badge, and tags
  const headerContent = (
    <div className="flex items-center gap-3 md:gap-5">
      <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
        {partner.logo ? (
          <Image
            src={partner.logo}
            alt={`${partner.name} logo`}
            width={36}
            height={36}
            className="object-contain w-6 h-6 md:w-9 md:h-9"
          />
        ) : (
          <span className="text-xs md:text-sm font-bold text-slate-600">
            {partner.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base md:text-xl font-semibold text-[var(--text-primary)] truncate mb-1">
          {offer.name} <span className="hidden md:inline font-normal text-[var(--text-secondary)]">from {partner.name}</span>
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {category && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${categoryColor.badge}`}>
              {category.name}
            </span>
          )}
          {offerTags.slice(0, 2).map((tag) => (
            <span key={tag.id} className={`text-xs px-2 py-0.5 rounded-full border ${tagBadgeStyle}`}>
              {tag.name}
            </span>
          ))}
          <span className="hidden md:inline">
            {offerTags.slice(2, 3).map((tag) => (
              <span key={tag.id} className={`text-xs px-2 py-0.5 rounded-full border ${tagBadgeStyle} ml-2`}>
                {tag.name}
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );

  // Footer content - actions on right
  const footerContent = (
    <div className="flex items-center justify-end px-4 md:px-8 py-4 md:py-6 gap-2 md:gap-3">

      {/* Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        {!isClaimed && (
          <>
            {/* Hide button - icon only on mobile */}
            <button
              onClick={handleHide}
              className="flex items-center gap-2 p-2 md:px-4 md:py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <EyeOff className="w-4 h-4" />
              <span className="hidden md:inline">Not for Me</span>
            </button>
            {/* Save button - icon only on mobile */}
            <button
              onClick={handleSaveToggle}
              className={`flex items-center gap-2 p-2 md:px-4 md:py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isSaved
                  ? 'bg-[var(--brand-green-primary)]/10 text-[var(--brand-green-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              <span className="hidden md:inline">{isSaved ? 'Saved' : 'Save for Later'}</span>
            </button>
          </>
        )}
        {swagSlug && (
          <button
            onClick={() => setShowSwag(true)}
            className="flex items-center gap-2 p-2 md:px-4 md:py-2 rounded-lg text-sm font-medium text-[var(--brand-blue-primary)] hover:bg-[var(--brand-blue-primary)]/10 transition-colors cursor-pointer"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden md:inline">See the SWAG</span>
          </button>
        )}
        <Button onClick={() => setShowClaimForm(true)} disabled={isClaimed} className="text-sm md:text-base">
          {isClaimed ? 'Claimed' : 'Claim Offer'}
        </Button>
      </div>
    </div>
  );

  // Champion content for display in main content area
  const championContent = offer.champion && offer.champion.name && (
    <div className="flex items-center gap-3 mt-8 pt-6 border-t border-[var(--border-default)]">
      <div className="w-10 h-10 rounded-full bg-[var(--bg-card-hover)] flex items-center justify-center overflow-hidden flex-shrink-0">
        {offer.champion.avatarUrl ? (
          <img
            src={offer.champion.avatarUrl}
            alt={offer.champion.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {offer.champion.name.split(' ').map(n => n[0]).join('')}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-[var(--text-tertiary)]">Recommended by</p>
        <p className="text-sm text-[var(--text-secondary)]">
          <span className="text-[var(--text-primary)] font-medium">{offer.champion.name}</span>, {offer.champion.title} at {offer.champion.brand}
        </p>
      </div>
    </div>
  );

  // SWAG calculator view
  if (showSwag && swagSlug) {
    const spec = getSpec(swagSlug);
    if (spec) {
      const swagHeader = (
        <div className="flex items-center gap-3 md:gap-5">
          <button
            onClick={() => setShowSwag(false)}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              {partner.logo ? (
                <Image
                  src={partner.logo}
                  alt={`${partner.name} logo`}
                  width={28}
                  height={28}
                  className="object-contain w-5 h-5 md:w-7 md:h-7"
                />
              ) : (
                <span className="text-xs font-bold text-slate-600">
                  {partner.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-base md:text-lg font-semibold text-[var(--text-primary)]">
                {partner.name} SWAG
              </h2>
              <p className="text-xs text-[var(--text-secondary)] hidden md:block">
                {spec.tagline}
              </p>
            </div>
          </div>
        </div>
      );

      return (
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          header={swagHeader}
          maxWidth="max-w-6xl"
        >
          <SwagCalculator spec={spec} />
        </Modal>
      );
    }
  }

  // Claim form view
  if (showClaimForm) {
    // Two-column layout if there are claim instructions and form not yet submitted
    const hasInstructions = !!offer.claimInstructions && !formSubmitted;

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        header={headerContent}
      >
        <div className={`flex flex-col md:flex-row h-full overflow-hidden ${!hasInstructions ? 'justify-center' : ''}`}>
          {/* Left column - How it works (fixed, no scroll) - hide after submission */}
          {hasInstructions && (
            <div className="w-full md:w-96 flex-shrink-0 p-4 md:p-8 border-b md:border-b-0 md:border-r border-[var(--border-default)] overflow-hidden">
              <h3 className="text-base md:text-lg font-semibold text-[var(--text-primary)] mb-3 md:mb-4">
                How it works
              </h3>
              <div className="space-y-2 md:space-y-3">
                {offer.claimInstructions!.split('\n').map((step, i) => (
                  <div key={i} className="flex items-start gap-2 md:gap-3">
                    <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-[var(--brand-green-primary)]/20 flex items-center justify-center flex-shrink-0 text-xs md:text-sm font-semibold text-[var(--brand-green-primary)]">
                      {i + 1}
                    </span>
                    <p className="text-[var(--text-secondary)] text-sm pt-0.5">
                      {step.replace(/^\d+\.\s*/, '')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Right column - Form (scrollable), or centered if no instructions/after submission */}
          <div className={`p-4 md:p-8 overflow-y-auto ${hasInstructions ? 'flex-1' : 'w-full md:w-[calc(100%-24rem)]'}`}>
            <div className="max-w-md mx-auto md:mx-0">
              {!formSubmitted && (
                <h3 className="text-base md:text-lg font-semibold text-[var(--text-primary)] mb-4 md:mb-6">
                  Claim your {offer.name}
                </h3>
              )}
              <ClaimForm
                offerSlug={offer.id}
                offerName={offer.name}
                formFields={offer.formFields}
                onClaimed={handleClaimed}
                onSubmitted={() => setFormSubmitted(true)}
              />
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  const hasPdf = !!offer.sampleDeliverablePdf;

  // Offer details view
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header={headerContent}
      footer={footerContent}
    >
      <div className="py-4 md:py-8 px-4 md:px-16">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-6 md:mb-10">
          {/* PDF preview - show at top on mobile, side on desktop */}
          {hasPdf && (
            <div className="w-full md:w-64 md:flex-shrink-0 md:order-last">
              <div className="border border-[var(--border-default)] rounded-xl p-4 md:p-5">
                {/* PDF thumbnail preview - smaller on mobile */}
                <div className="aspect-[8.5/11] bg-white rounded-lg mb-3 md:mb-4 flex items-center justify-center relative overflow-hidden max-w-[160px] md:max-w-none mx-auto md:mx-0">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <FileText className="w-8 h-8 md:w-12 md:h-12 mb-1 md:mb-2" />
                    <span className="text-xs font-medium uppercase">PDF Preview</span>
                  </div>
                </div>

                {/* Download button */}
                <a
                  href={`/pdfs/${offer.sampleDeliverablePdf}`}
                  download
                  className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-card-hover)] hover:bg-[var(--border-hover)] border border-[var(--border-default)] rounded-lg transition-colors"
                >
                  Download Sample
                </a>
              </div>
            </div>
          )}

          {/* Main content column */}
          <div className={hasPdf ? 'flex-1' : 'w-full'}>
            {/* Short description as heading */}
            <h3 className="text-lg md:text-xl font-semibold text-[var(--text-primary)] leading-relaxed mb-3 md:mb-4">
              {offer.shortDescription}
            </h3>

            {/* Full description */}
            <div className="prose prose-invert max-w-none">
              {offer.fullDescription.split('\n\n').map((paragraph, i) => {
                // Check if paragraph contains bullet points
                const lines = paragraph.split('\n');
                const hasBullets = lines.some(line => line.trim().startsWith('•'));

                if (hasBullets) {
                  return (
                    <div key={i} className="mb-4 md:mb-5 last:mb-0">
                      {lines.map((line, j) => {
                        const trimmedLine = line.trim();
                        if (trimmedLine.startsWith('•')) {
                          return (
                            <div key={j} className="flex gap-2 text-[var(--text-secondary)] text-sm md:text-base leading-relaxed mb-1">
                              <span className="flex-shrink-0">•</span>
                              <span>{trimmedLine.slice(1).trim()}</span>
                            </div>
                          );
                        }
                        return (
                          <p key={j} className="text-[var(--text-secondary)] text-sm md:text-base leading-relaxed mb-2">
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  );
                }

                return (
                  <p key={i} className="text-[var(--text-secondary)] text-sm md:text-base mb-4 md:mb-5 last:mb-0 whitespace-pre-line leading-relaxed">
                    {paragraph}
                  </p>
                );
              })}
            </div>

            {/* Claim instructions if present */}
            {offer.claimInstructions && (
              <div className="mt-6 md:mt-8">
                <h3 className="text-base md:text-lg font-semibold text-[var(--text-primary)] mb-2 md:mb-3">
                  How it works
                </h3>
                <div className="space-y-2 md:space-y-3">
                  {offer.claimInstructions.split('\n').map((step, i) => (
                    <div key={i} className="flex items-start gap-2 md:gap-3">
                      <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-[var(--brand-green-primary)]/20 flex items-center justify-center flex-shrink-0 text-xs md:text-sm font-semibold text-[var(--brand-green-primary)]">
                        {i + 1}
                      </span>
                      <p className="text-[var(--text-secondary)] text-sm md:text-base pt-0.5">
                        {step.replace(/^\d+\.\s*/, '')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Champion / Recommended by */}
            {championContent}
          </div>
        </div>

        {/* Partner info */}
        <div className="border border-[var(--border-default)] rounded-xl p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
            <div className="flex-1 min-w-0 md:pr-6">
              <h3 className="text-base md:text-lg font-semibold text-[var(--text-primary)] mb-1 md:mb-2">
                About {partner.name}
              </h3>
              <p className="text-[var(--text-secondary)] text-sm">
                {partner.description}
              </p>
            </div>
            <a
              href={`https://${partner.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-card-hover)] hover:bg-[var(--border-hover)] border border-[var(--border-default)] rounded-lg transition-colors flex-shrink-0"
            >
              Visit Website
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
}
