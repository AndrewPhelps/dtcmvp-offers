'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Bookmark, EyeOff, ArrowLeft, Sparkles, Eye, Loader2 } from 'lucide-react';
import { Modal, Button } from '@/components/common';
import { Listing } from '@/types';
import { useBrand } from '@/contexts';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useAuth } from '@/contexts/AuthContext';
import { tagBadgeStyle } from '@/lib';
import type { SwagSpec, BrandProfile, Category } from '@/lib/swag/swag-types';
import { DEFAULT_BRAND_PROFILE, CATEGORIES } from '@/lib/swag/swag-types';

const SwagCalculator = dynamic(() => import('@/components/swag/SwagCalculator'), { ssr: false });
const SwagLoader = dynamic(() => import('@/components/swag/SwagLoader'), { ssr: false });

type DrawerMode = 'detail' | 'generating' | 'calculator';

interface SwagListingDrawerProps {
  listing: Listing | null;
  isOpen: boolean;
  onClose: () => void;
  /** When opened from "My SWAGs / Created", skip detail+animation and go straight to calculator. */
  initialMode?: DrawerMode;
}

export default function SwagListingDrawer({
  listing,
  isOpen,
  onClose,
  initialMode = 'detail',
}: SwagListingDrawerProps) {
  const [mode, setMode] = useState<DrawerMode>(initialMode);
  const [swagSpec, setSwagSpec] = useState<SwagSpec | null>(null);
  const [specError, setSpecError] = useState<string | null>(null);
  const [loaderDone, setLoaderDone] = useState(false);
  const [specReady, setSpecReady] = useState(false);

  const {
    isOfferSaved,
    saveOffer,
    unsaveOffer,
    hideOffer,
    hasGeneratedForListing,
    generateSwag,
  } = useBrand();

  // Resolve the loader-animation identity. Priority order:
  //   1. Admin impersonating via test-brand picker → that brand's identity.
  //   2. Real logged-in brand user → their own auth identity
  //      (user.partner_name is overloaded to brand-company name; username
  //      is the verified first-name from the /b/[contactId] login flow).
  //   3. Defaults — empty strings; SwagLoader falls back to "Your Brand" /
  //      "your team" rather than the old Sunday Swagger / Kyle Moloo
  //      placeholder data.
  const { testBrand } = useImpersonation();
  const { user } = useAuth();
  const loaderProfile: BrandProfile = useMemo(() => {
    if (testBrand) {
      const cat = testBrand.primaryCategoryBucket;
      return {
        ...DEFAULT_BRAND_PROFILE,
        brandName: testBrand.companyName || DEFAULT_BRAND_PROFILE.brandName,
        contactName: testBrand.name || DEFAULT_BRAND_PROFILE.contactName,
        contactEmail: testBrand.email || DEFAULT_BRAND_PROFILE.contactEmail,
        ...(cat && CATEGORIES.includes(cat as Category) ? { primaryCategory: cat as Category } : {}),
      };
    }
    return {
      ...DEFAULT_BRAND_PROFILE,
      brandName: user?.partner_name || DEFAULT_BRAND_PROFILE.brandName,
      contactName: user?.username || DEFAULT_BRAND_PROFILE.contactName,
      contactEmail: user?.email || DEFAULT_BRAND_PROFILE.contactEmail,
    };
  }, [testBrand, user]);

  // Reset on open / close
  useEffect(() => {
    if (!isOpen) {
      setMode(initialMode);
      setSwagSpec(null);
      setSpecError(null);
      setLoaderDone(false);
      setSpecReady(false);
      return;
    }
    setMode(initialMode);
    setLoaderDone(false);
    setSpecReady(false);
    // If opening directly into calculator (from My SWAGs / Created), prefetch the spec.
    if (initialMode === 'calculator' && listing) {
      void fetchSpec(listing.slug);
    }
  }, [isOpen, initialMode, listing?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSpec = useCallback(async (slug: string) => {
    try {
      const res = await fetch(`/api/swag/${slug}`);
      if (!res.ok) {
        setSpecError(`SWAG spec not found for ${slug}`);
        return null;
      }
      const data = await res.json();
      setSwagSpec(data.spec);
      setSpecReady(true);
      return data.spec as SwagSpec;
    } catch (err) {
      setSpecError(err instanceof Error ? err.message : 'Failed to load SWAG');
      return null;
    }
  }, []);

  // When both the loader animation and the spec fetch finish, advance to calculator.
  useEffect(() => {
    if (mode === 'generating' && loaderDone && specReady) {
      setMode('calculator');
    }
  }, [mode, loaderDone, specReady]);

  if (!listing) return null;

  const slug = listing.slug;
  const isSaved = isOfferSaved(slug);
  const hasGenerated = hasGeneratedForListing(slug);

  const handleGenerate = async () => {
    setMode('generating');
    setLoaderDone(false);
    setSpecReady(false);
    // Fire spec fetch and persistence in parallel.
    void fetchSpec(slug);
    void generateSwag({ listingSlug: slug, listingName: listing.name }).catch((err) => {
      // Persistence failure shouldn't block the calculator from opening — log and proceed.
      console.error('[SwagListingDrawer] generateSwag persistence failed:', err);
    });
  };

  const handleViewSwag = async () => {
    if (!swagSpec) {
      setSpecReady(false);
      const spec = await fetchSpec(slug);
      if (!spec) return;
    }
    setMode('calculator');
  };

  const handleSaveToggle = () => {
    if (isSaved) unsaveOffer(slug);
    else saveOffer(slug);
  };

  const handleHide = () => {
    hideOffer(slug);
    onClose();
  };

  const detailHeader = (
    <div className="flex items-center gap-3 md:gap-5">
      <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
        {listing.logoUrl ? (
          <Image
            src={listing.logoUrl}
            alt={`${listing.name} logo`}
            width={36}
            height={36}
            className="object-contain w-6 h-6 md:w-9 md:h-9"
          />
        ) : (
          <span className="text-xs md:text-sm font-bold text-slate-600">
            {listing.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base md:text-xl font-semibold text-[var(--text-primary)] truncate mb-1">
          {listing.name}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {listing.tags.slice(0, 3).map((tag) => (
            <span key={tag} className={`text-xs px-2 py-0.5 rounded-full border ${tagBadgeStyle}`}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const detailFooter = (
    <div className="flex items-center justify-end px-4 md:px-8 py-4 md:py-6 gap-2 md:gap-3">
      <button
        onClick={handleHide}
        aria-label="Not for me"
        className="flex items-center gap-2 p-2 md:px-4 md:py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
      >
        <EyeOff className="w-4 h-4" />
        <span className="hidden md:inline">not for me</span>
      </button>
      <button
        onClick={handleSaveToggle}
        aria-label={isSaved ? 'Unsave SWAG' : 'Save SWAG for later'}
        className={`flex items-center gap-2 p-2 md:px-4 md:py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
          isSaved
            ? 'bg-[var(--brand-green-primary)]/10 text-[var(--brand-green-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
        }`}
      >
        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        <span className="hidden md:inline">{isSaved ? 'saved' : 'save for later'}</span>
      </button>
      <Button
        onClick={hasGenerated ? handleViewSwag : handleGenerate}
        className="text-sm md:text-base whitespace-nowrap"
      >
        {hasGenerated ? (
          <span className="inline-flex items-center gap-2">
            <Eye className="w-4 h-4" />
            view swag
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            generate swag
          </span>
        )}
      </Button>
    </div>
  );

  // Calculator view: back arrow header → SwagCalculator
  if (mode === 'calculator') {
    if (!swagSpec) {
      return (
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          header={detailHeader}
          fullScreen
        >
          <div className="flex items-center justify-center py-24">
            {specError ? (
              <div className="text-center">
                <p className="text-[var(--text-secondary)] mb-3">{specError}</p>
                <button
                  onClick={() => setMode('detail')}
                  className="text-sm text-[var(--brand-green-primary)] hover:underline cursor-pointer"
                >
                  back to details
                </button>
              </div>
            ) : (
              <Loader2 className="w-6 h-6 animate-spin text-[var(--text-secondary)]" />
            )}
          </div>
        </Modal>
      );
    }

    const calcHeader = (
      <div className="flex items-center gap-3 md:gap-5">
        <button
          onClick={() => setMode('detail')}
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
          aria-label="Back to details"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
            {listing.logoUrl ? (
              <Image
                src={listing.logoUrl}
                alt={`${listing.name} logo`}
                width={28}
                height={28}
                className="object-contain w-5 h-5 md:w-7 md:h-7"
              />
            ) : (
              <span className="text-xs font-bold text-slate-600">
                {listing.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-base md:text-lg font-semibold text-[var(--text-primary)]">
              {listing.name} SWAG
            </h2>
            <p className="text-xs text-[var(--text-secondary)] hidden md:block">
              {swagSpec.tagline}
            </p>
          </div>
        </div>
      </div>
    );

    return (
      <Modal isOpen={isOpen} onClose={onClose} header={calcHeader} fullScreen>
        <SwagCalculator spec={swagSpec} />
      </Modal>
    );
  }

  // Generating view: SwagLoader inside the modal
  if (mode === 'generating') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} header={detailHeader} fullScreen>
        <div className="relative min-h-[480px]">
          <SwagLoader
            profile={loaderProfile}
            partnerName={listing.name}
            onComplete={() => setLoaderDone(true)}
          />
          {specError && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-body)]/90">
              <div className="text-center">
                <p className="text-[var(--text-secondary)] mb-3">{specError}</p>
                <button
                  onClick={() => setMode('detail')}
                  className="text-sm text-[var(--brand-green-primary)] hover:underline cursor-pointer"
                >
                  back to details
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    );
  }

  // Detail view (default)
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header={detailHeader}
      footer={detailFooter}
    >
      <div className="py-4 md:py-8 px-4 md:px-16">
        <h3 className="text-lg md:text-xl font-semibold text-[var(--text-primary)] leading-relaxed mb-3 md:mb-4">
          {listing.tagline}
        </h3>

        {listing.shortDescription && (
          <p className="text-[var(--text-secondary)] text-sm md:text-base leading-relaxed mb-6 md:mb-8 whitespace-pre-line">
            {listing.shortDescription}
          </p>
        )}

        {listing.benefitBullets.length > 0 && (
          <div className="mb-6 md:mb-8">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 md:mb-4">
              what {listing.name} does for your store:
            </h4>
            <ul className="space-y-2 md:space-y-3">
              {listing.benefitBullets.map((bullet, i) => (
                <li key={i} className="flex gap-3 text-[var(--text-secondary)] text-sm md:text-base leading-relaxed">
                  <span className="flex-shrink-0 text-[var(--brand-green-primary)]">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {listing.champion?.name && (
          <div className="flex items-center gap-3 mt-8 pt-6 border-t border-[var(--border-default)]">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-card-hover)] flex items-center justify-center overflow-hidden flex-shrink-0">
              {listing.champion.avatarUrl ? (
                <img
                  src={listing.champion.avatarUrl}
                  alt={listing.champion.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {listing.champion.name.split(' ').map((n) => n[0]).join('')}
                </span>
              )}
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Recommended by</p>
              <p className="text-sm text-[var(--text-secondary)]">
                <span className="text-[var(--text-primary)] font-medium">{listing.champion.name}</span>
                {listing.champion.title && `, ${listing.champion.title}`}
                {listing.champion.brand && ` at ${listing.champion.brand}`}
              </p>
            </div>
          </div>
        )}

        {listing.partnerUrl && (
          <div className="mt-6 md:mt-8 border border-[var(--border-default)] rounded-xl p-4 md:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
              <div className="flex-1 min-w-0 md:pr-6">
                <h3 className="text-base md:text-lg font-semibold text-[var(--text-primary)] mb-1 md:mb-2">
                  about {listing.name}
                </h3>
                <p className="text-[var(--text-secondary)] text-sm">
                  {listing.tagline}
                </p>
              </div>
              <a
                href={listing.partnerUrl.startsWith('http') ? listing.partnerUrl : `https://${listing.partnerUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-card-hover)] hover:bg-[var(--border-hover)] border border-[var(--border-default)] rounded-lg transition-colors flex-shrink-0"
              >
                visit website
              </a>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
