'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Search, Sparkles, ArrowRight, Trash2 } from 'lucide-react';
import { Card, MoleculeLoader } from '@/components/common';
import { SwagListingDrawer } from '@/components/swags';
import { Listing, Offer } from '@/types';
import { tagBadgeStyle } from '@/lib/categoryColors';
import { useBrand } from '@/contexts';

interface SwagsMarketplaceClientProps {
  listings: Listing[];
  /** When set (deep-link route /swags/[slug]), open the drawer on this listing on mount. */
  initialListingSlug?: string;
}

// Adapter: the recommendation engine in BrandContext takes the slim Offer shape.
// Future cleanup: have the engine take Listing[] directly.
function listingToOffer(listing: Listing): Offer {
  return { id: listing.slug, isActive: listing.isActive };
}

function TypewriterText({ text, speed = 25 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);
  useEffect(() => {
    if (currentIndex < text.length) {
      const t = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, speed);
      return () => clearTimeout(t);
    }
  }, [currentIndex, text, speed]);
  return (
    <span>
      {displayedText}
      {currentIndex < text.length && <span className="animate-pulse">|</span>}
    </span>
  );
}

export default function SwagsMarketplaceClient({ listings, initialListingSlug }: SwagsMarketplaceClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(() => {
    if (!initialListingSlug) return null;
    return listings.find((l) => l.slug === initialListingSlug) ?? null;
  });
  const [drawerOpen, setDrawerOpen] = useState(!!initialListingSlug);

  const {
    setAvailableOffers,
    hiddenOfferIds,
    requests,
    recommendations,
    selectedRecommendation,
    isAnalyzing,
    loadingMessageIndex,
    loadingMessages,
    selectRecommendation,
    clearRecommendationView,
    removeRecommendation,
  } = useBrand();

  // Feed the recommendation engine with offer-shaped listings.
  useEffect(() => {
    setAvailableOffers(listings.map(listingToOffer));
  }, [listings, setAvailableOffers]);

  // Loading animation phases (Find SWAGs For Me)
  const [showLoadingText, setShowLoadingText] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [loaderKey, setLoaderKey] = useState(0);
  const prevAnalyzingRef = useRef(isAnalyzing);

  useEffect(() => {
    if (isAnalyzing && !prevAnalyzingRef.current) {
      setShowLoadingText(false);
      setIsCollapsing(false);
      setShowLoader(true);
      setLoaderKey((k) => k + 1);
    } else if (!isAnalyzing && prevAnalyzingRef.current) {
      setIsCollapsing(true);
    }
    prevAnalyzingRef.current = isAnalyzing;
  }, [isAnalyzing]);

  const handleCollapseComplete = useCallback(() => {
    setShowLoader(false);
    setIsCollapsing(false);
    setShowLoadingText(false);
  }, []);

  const generatedSlugs = useMemo(() => requests.map((r) => r.listingSlug), [requests]);

  const selectedRecommendationSlugs = useMemo(() => {
    if (!selectedRecommendation) return null;
    const rec = recommendations.find((r) => r.id === selectedRecommendation);
    return rec ? rec.offerIds : null;
  }, [selectedRecommendation, recommendations]);

  const filteredListings = useMemo(() => {
    if (selectedRecommendationSlugs) {
      return listings.filter(
        (l) =>
          selectedRecommendationSlugs.includes(l.slug) &&
          l.isActive &&
          !hiddenOfferIds.includes(l.slug) &&
          !generatedSlugs.includes(l.slug),
      );
    }
    return listings
      .filter((l) => {
        if (!l.isActive) return false;
        if (hiddenOfferIds.includes(l.slug)) return false;
        if (generatedSlugs.includes(l.slug)) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            l.name.toLowerCase().includes(q) ||
            l.tagline.toLowerCase().includes(q) ||
            l.shortDescription.toLowerCase().includes(q) ||
            l.tags.some((t) => t.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => (b.tier ?? 0) - (a.tier ?? 0));
  }, [listings, hiddenOfferIds, generatedSlugs, searchQuery, selectedRecommendationSlugs]);

  const handleListingClick = (listing: Listing) => {
    setSelectedListing(listing);
    setDrawerOpen(true);
  };
  const handleDrawerClose = () => setDrawerOpen(false);
  const handleSelectRecommendation = (recId: string) => selectRecommendation(recId);
  const handleRemoveRecommendation = (recId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeRecommendation(recId);
  };

  const formatRecDate = (date: Date) => {
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <div className="relative">
      <div
        className="fixed bottom-0 left-0 right-0 pointer-events-none z-0 opacity-25"
        style={{
          backgroundImage: 'url(/bg-offers.jpg)',
          backgroundSize: '100% auto',
          backgroundPosition: 'bottom',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-[120px]"
          style={{ background: 'linear-gradient(to bottom, var(--bg-body) 0%, transparent 100%)' }}
        />
        <img src="/bg-offers.jpg" alt="" className="w-full invisible" />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 relative z-10">
        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          <aside className="w-full md:w-64 md:flex-shrink-0">
            <div className="md:sticky md:top-8 space-y-4 md:space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  placeholder="search swags..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    clearRecommendationView();
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-green-primary)] transition-colors"
                />
              </div>

              {recommendations.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
                    recommended for you
                  </h3>
                  <nav className="space-y-1">
                    {recommendations.map((rec) => {
                      const isSelected = selectedRecommendation === rec.id;
                      return (
                        <div
                          key={rec.id}
                          onClick={() => handleSelectRecommendation(rec.id)}
                          className={`group w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--brand-green-primary)]/10 text-[var(--brand-green-primary)] font-medium'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5" />
                            {formatRecDate(rec.date)}
                          </span>
                          <span className="flex items-center gap-2">
                            <span
                              className={
                                isSelected
                                  ? 'text-[var(--brand-green-primary)]'
                                  : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'
                              }
                            >
                              {rec.offerIds.length}
                            </span>
                            <button
                              onClick={(e) => handleRemoveRecommendation(rec.id, e)}
                              className="p-0.5 rounded hover:bg-[var(--bg-card)] transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3 text-[var(--text-tertiary)] hover:text-[var(--brand-red)] transition-colors" />
                            </button>
                          </span>
                        </div>
                      );
                    })}
                  </nav>
                </div>
              )}
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {(isAnalyzing || showLoader) && (
              <div className="flex flex-col items-center justify-center pt-6 pb-12">
                <MoleculeLoader
                  key={loaderKey}
                  width={200}
                  height={200}
                  onParticlesReady={() => setShowLoadingText(true)}
                  isCollapsing={isCollapsing}
                  onCollapseComplete={handleCollapseComplete}
                />
                <div
                  className={`transition-all duration-300 ease-out ${
                    showLoadingText && !isCollapsing
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-4'
                  }`}
                >
                  <p className="text-lg text-[var(--text-primary)] font-medium mb-3 -mt-2 text-center">
                    finding swags for you
                  </p>
                  <p className="text-base text-[var(--text-secondary)] h-6 text-center">
                    {showLoadingText && !isCollapsing && (
                      <TypewriterText text={loadingMessages[loadingMessageIndex]} speed={20} />
                    )}
                  </p>
                </div>
              </div>
            )}

            {!isAnalyzing && !showLoader && (
              <>
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border-default)]">
                  <div className="flex items-center gap-2">
                    {selectedRecommendation ? (
                      <>
                        <Sparkles className="w-5 h-5 text-[var(--brand-green-primary)]" />
                        <span className="text-[var(--text-primary)] font-medium">
                          recommended for you
                        </span>
                      </>
                    ) : (
                      <span className="text-[var(--text-primary)] font-medium">all swags</span>
                    )}
                    <span className="text-[var(--text-tertiary)]">·</span>
                    <span className="text-sm text-[var(--text-tertiary)]">
                      {filteredListings.length} swag{filteredListings.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {selectedRecommendation && (
                    <button
                      onClick={clearRecommendationView}
                      className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
                    >
                      view all swags
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-3 md:gap-5">
                  {filteredListings.map((listing) => (
                    <button
                      key={listing.slug}
                      onClick={() => handleListingClick(listing)}
                      className="text-left cursor-pointer"
                    >
                      <Card
                        variant="interactive"
                        className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 p-5 md:p-10"
                      >
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {listing.logoUrl ? (
                            <Image
                              src={listing.logoUrl}
                              alt={listing.name}
                              width={64}
                              height={64}
                              className="w-full h-full object-contain p-1.5 md:p-2"
                            />
                          ) : (
                            <span className="text-[var(--brand-green-primary)] font-semibold text-lg md:text-xl">
                              {listing.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-xl font-semibold text-[var(--text-primary)] mb-1 md:mb-1.5">
                            {listing.name}
                          </h3>
                          <p className="text-sm text-[var(--text-secondary)] mb-2 line-clamp-2 md:line-clamp-none">
                            {listing.tagline}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {listing.tags.slice(0, 4).map((tag) => (
                              <span
                                key={tag}
                                className={`text-xs px-2 py-0.5 rounded-full border ${tagBadgeStyle}`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        <ArrowRight className="hidden md:block w-5 h-5 text-[var(--text-tertiary)] flex-shrink-0" />
                      </Card>
                    </button>
                  ))}

                  {filteredListings.length === 0 && (
                    <Card className="text-center py-12">
                      <p className="text-[var(--text-secondary)]">
                        no swags found matching your criteria
                      </p>
                    </Card>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <SwagListingDrawer
        listing={selectedListing}
        isOpen={drawerOpen}
        onClose={handleDrawerClose}
      />
    </div>
  );
}
