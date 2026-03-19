'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Bookmark, EyeOff, FileText } from 'lucide-react';
import { Modal, Button } from '@/components/common';
import { ClaimForm } from '@/components/offers';
import { getCategoryColorByColorName, tagBadgeStyle } from '@/lib';
import { Offer, Partner, Category, Tag } from '@/types';
import { getCategory, getTagsByIds } from '@/data';
import { useBrand } from '@/contexts';

interface OfferDrawerProps {
  offer: Offer | null;
  partner: Partner | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function OfferDrawer({ offer, partner, isOpen, onClose }: OfferDrawerProps) {
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const { isOfferSaved, saveOffer, unsaveOffer, hideOffer, claimOffer, isOfferClaimed } = useBrand();

  // Reset to offer view when modal closes or offer changes
  useEffect(() => {
    if (!isOpen) {
      setShowClaimForm(false);
      setFormSubmitted(false);
    }
  }, [isOpen]);

  if (!offer || !partner) return null;

  const category = getCategory(offer.categoryId);
  const categoryColor = category ? getCategoryColorByColorName(category.color) : getCategoryColorByColorName('blue');
  const offerTags = getTagsByIds(offer.tagIds);
  const isSaved = isOfferSaved(offer.id);
  const isClaimed = isOfferClaimed(offer.id);

  const handleClaimSubmit = (data: Record<string, string | boolean>) => {
    console.log('Claim submitted:', { offerId: offer.id, data });
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
    <div className="flex items-center gap-5">
      <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
        {partner.logo ? (
          <Image
            src={`/logos/${partner.logo}`}
            alt={`${partner.name} logo`}
            width={36}
            height={36}
            className="object-contain"
          />
        ) : (
          <span className="text-sm font-bold text-slate-600">
            {partner.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] truncate mb-1">
          {offer.name} <span className="font-normal text-[var(--text-secondary)]">from {partner.name}</span>
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {category && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${categoryColor.badge}`}>
              {category.name}
            </span>
          )}
          {offerTags.slice(0, 3).map((tag) => (
            <span key={tag.id} className={`text-xs px-2 py-0.5 rounded-full border ${tagBadgeStyle}`}>
              {tag.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  // Footer content - actions on right
  const footerContent = (
    <div className="flex items-center justify-end px-8 py-6">

      {/* Right side - Not for Me, Save for Later, Claim button */}
      <div className="flex items-center gap-3">
        {!isClaimed && (
          <>
            <button
              onClick={handleHide}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <EyeOff className="w-4 h-4" />
              Not for Me
            </button>
            <button
              onClick={handleSaveToggle}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isSaved
                  ? 'bg-[var(--brand-green-primary)]/10 text-[var(--brand-green-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              {isSaved ? 'Saved' : 'Save for Later'}
            </button>
          </>
        )}
        <Button onClick={() => setShowClaimForm(true)} disabled={isClaimed}>
          {isClaimed ? 'Already Claimed' : 'Claim Offer'}
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
        <div className={`flex h-full overflow-hidden ${!hasInstructions ? 'justify-center' : ''}`}>
          {/* Left column - How it works (fixed, no scroll) - hide after submission */}
          {hasInstructions && (
            <div className="w-96 flex-shrink-0 p-8 border-r border-[var(--border-default)] overflow-hidden">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                How it works
              </h3>
              <div className="space-y-3">
                {offer.claimInstructions!.split('\n').map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[var(--brand-green-primary)]/20 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-[var(--brand-green-primary)]">
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
          <div className={`p-8 overflow-y-auto ${hasInstructions ? 'flex-1' : 'w-[calc(100%-24rem)]'}`}>
            <div className="max-w-md">
              {!formSubmitted && (
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
                  Claim your {offer.name}
                </h3>
              )}
              <ClaimForm
                formFields={offer.formFields}
                offerName={offer.name}
                onSubmit={handleClaimSubmit}
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
      <div className="py-8 px-16">
        <div className="flex gap-8 mb-10">
          {/* Main content column */}
          <div className={hasPdf ? 'flex-1' : 'w-full'}>
            {/* Short description as heading */}
            <h3 className="text-xl font-semibold text-[var(--text-primary)] leading-relaxed mb-4">
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
                    <div key={i} className="mb-5 last:mb-0">
                      {lines.map((line, j) => {
                        const trimmedLine = line.trim();
                        if (trimmedLine.startsWith('•')) {
                          return (
                            <div key={j} className="flex gap-2 text-[var(--text-secondary)] text-base leading-relaxed mb-1">
                              <span className="flex-shrink-0">•</span>
                              <span>{trimmedLine.slice(1).trim()}</span>
                            </div>
                          );
                        }
                        return (
                          <p key={j} className="text-[var(--text-secondary)] text-base leading-relaxed mb-2">
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  );
                }

                return (
                  <p key={i} className="text-[var(--text-secondary)] text-base mb-5 last:mb-0 whitespace-pre-line leading-relaxed">
                    {paragraph}
                  </p>
                );
              })}
            </div>

            {/* Claim instructions if present */}
            {offer.claimInstructions && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                  How it works
                </h3>
                <div className="space-y-3">
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
              </div>
            )}

            {/* Champion / Recommended by */}
            {championContent}
          </div>

          {/* PDF preview column - only show when PDF exists */}
          {hasPdf && (
            <div className="w-64 flex-shrink-0">
              <div className="border border-[var(--border-default)] rounded-xl p-5">
                {/* PDF thumbnail preview */}
                <div className="aspect-[8.5/11] bg-white rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <FileText className="w-12 h-12 mb-2" />
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
        </div>

        {/* Partner info */}
        <div className="border border-[var(--border-default)] rounded-xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0 pr-6">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
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
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-card-hover)] hover:bg-[var(--border-hover)] border border-[var(--border-default)] rounded-lg transition-colors flex-shrink-0"
            >
              Visit Website
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
}
