'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Search, Sparkles, ArrowRight, Trash2 } from 'lucide-react';
import { Card, MoleculeLoader } from '@/components/common';
import { OfferDrawer } from '@/components/offers';
import { QuestionnaireModal } from '@/components/questionnaire';
import { offers, partners, categories, getCategory, getTagsByIds } from '@/data';
import { Offer } from '@/types';
import { getCategoryColorByColorName, tagBadgeStyle } from '@/lib/categoryColors';
import { useBrand } from '@/contexts';

// Typewriter effect component
function TypewriterText({ text, speed = 25 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return (
    <span>
      {displayedText}
      {currentIndex < text.length && <span className="animate-pulse">|</span>}
    </span>
  );
}

export default function OffersPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false);
  const {
    hiddenOfferIds,
    claims,
    recommendations,
    selectedRecommendation,
    isAnalyzing,
    loadingMessageIndex,
    loadingMessages,
    generateRecommendationsImmediate,
    selectRecommendation,
    clearRecommendationView,
    removeRecommendation,
  } = useBrand();

  // Track animation phases for loading experience
  const [showLoadingText, setShowLoadingText] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [loaderKey, setLoaderKey] = useState(0);
  const prevIsAnalyzingRef = useRef(isAnalyzing);

  // Reset text visibility when analyzing starts
  useEffect(() => {
    if (isAnalyzing && !prevIsAnalyzingRef.current) {
      // Starting analysis - increment key to remount loader
      setShowLoadingText(false);
      setIsCollapsing(false);
      setShowLoader(true);
      setLoaderKey(k => k + 1);
    } else if (!isAnalyzing && prevIsAnalyzingRef.current) {
      // Ending analysis - trigger collapse animation
      setIsCollapsing(true);
    }
    prevIsAnalyzingRef.current = isAnalyzing;
  }, [isAnalyzing]);

  // Handle collapse completion
  const handleCollapseComplete = useCallback(() => {
    setShowLoader(false);
    setIsCollapsing(false);
    setShowLoadingText(false);
  }, []);

  // Get claimed offer IDs for filtering
  const claimedOfferIds = useMemo(() => claims.map((c) => c.offerId), [claims]);

  // Get recommended offer IDs for selected recommendation
  const selectedRecommendationOfferIds = useMemo(() => {
    if (!selectedRecommendation) return null;
    const rec = recommendations.find(r => r.id === selectedRecommendation);
    return rec ? rec.offerIds : null;
  }, [selectedRecommendation, recommendations]);

  const filteredOffers = useMemo(() => {
    // If viewing recommendations, filter to those specific offers
    if (selectedRecommendationOfferIds) {
      return offers.filter((offer) =>
        selectedRecommendationOfferIds.includes(offer.id) &&
        offer.isActive &&
        !hiddenOfferIds.includes(offer.id) &&
        !claimedOfferIds.includes(offer.id)
      );
    }

    return offers.filter((offer) => {
      if (!offer.isActive) return false;

      // Filter out hidden offers
      if (hiddenOfferIds.includes(offer.id)) return false;

      // Filter out claimed offers
      if (claimedOfferIds.includes(offer.id)) return false;

      if (selectedCategoryId !== 'all' && offer.categoryId !== selectedCategoryId) {
        return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const partner = partners.find((p) => p.id === offer.partnerId);
        const partnerName = partner?.name.toLowerCase() || '';
        const offerTags = getTagsByIds(offer.tagIds);
        return (
          offer.name.toLowerCase().includes(query) ||
          offer.shortDescription.toLowerCase().includes(query) ||
          offerTags.some((tag) => tag.name.toLowerCase().includes(query)) ||
          partnerName.includes(query)
        );
      }

      return true;
    });
  }, [selectedCategoryId, searchQuery, selectedRecommendationOfferIds, hiddenOfferIds, claimedOfferIds]);

  const getPartner = (partnerId: string) => {
    return partners.find((p) => p.id === partnerId);
  };

  const getCategoryCount = (categoryId: string) => {
    return offers.filter((o) => o.isActive && o.categoryId === categoryId && !hiddenOfferIds.includes(o.id) && !claimedOfferIds.includes(o.id)).length;
  };

  const getTotalActiveOffersCount = () => {
    return offers.filter((o) => o.isActive && !hiddenOfferIds.includes(o.id) && !claimedOfferIds.includes(o.id)).length;
  };

  const handleOfferClick = (offer: Offer) => {
    setSelectedOffer(offer);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  const handleQuestionnaireComplete = () => {
    // Generate recommendations immediately when questionnaire is completed (no AI simulation)
    generateRecommendationsImmediate();
    setSelectedCategoryId('all');
    setQuestionnaireOpen(false);
  };

  const handleSelectRecommendation = (recId: string) => {
    selectRecommendation(recId);
    setSelectedCategoryId('all');
  };

  const handleClearRecommendationView = () => {
    clearRecommendationView();
  };

  const handleRemoveRecommendation = (recId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeRecommendation(recId);
  };

  const formatRecommendationDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const selectedPartner = selectedOffer ? getPartner(selectedOffer.partnerId) : null;

  return (
    <div className="relative">
      {/* Background image - fixed to bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 pointer-events-none z-0 opacity-25"
        style={{ backgroundImage: 'url(/bg-offers.jpg)', backgroundSize: '100% auto', backgroundPosition: 'bottom', backgroundRepeat: 'no-repeat' }}
      >
        {/* Gradient overlay at top to blend with page background */}
        <div
          className="absolute top-0 left-0 right-0 h-[120px]"
          style={{ background: 'linear-gradient(to bottom, var(--bg-body) 0%, transparent 100%)' }}
        />
        <img src="/bg-offers.jpg" alt="" className="w-full invisible" />
      </div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Two-column layout */}
        <div className="flex gap-8">
          {/* Left sidebar - Categories */}
          <aside className="w-64 flex-shrink-0">
            <div className="sticky top-8">
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                  <input
                    type="text"
                    placeholder="Search offers..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      clearRecommendationView(); // Clear recommendation view when searching
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-green-primary)] transition-colors"
                  />
                </div>
              </div>

              {/* Recommended Offers section */}
              {recommendations.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
                    Recommended Offers
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
                            {formatRecommendationDate(rec.date)}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className={`${
                              isSelected
                                ? 'text-[var(--brand-green-primary)]'
                                : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'
                            }`}>
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

              {/* Categories */}
              <div>
                <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
                  Categories
                </h3>
                <nav className="space-y-1">
                  <button
                    onClick={() => {
                      setSelectedCategoryId('all');
                      clearRecommendationView();
                    }}
                    className={`group w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                      selectedCategoryId === 'all' && !selectedRecommendation
                        ? 'bg-[var(--brand-green-primary)]/10 text-[var(--brand-green-primary)] font-medium'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    All Offers
                    <span className={`float-right ${
                      selectedCategoryId === 'all' && !selectedRecommendation
                        ? 'text-[var(--brand-green-primary)]'
                        : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'
                    }`}>
                      {getTotalActiveOffersCount()}
                    </span>
                  </button>
                  {categories.map((category) => {
                    const colors = getCategoryColorByColorName(category.color);
                    const isSelected = selectedCategoryId === category.id && !selectedRecommendation;
                    return (
                      <button
                        key={category.id}
                        onClick={() => {
                          setSelectedCategoryId(category.id);
                          clearRecommendationView();
                        }}
                        className={`group w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                          isSelected
                            ? `${colors.bg} ${colors.text} font-medium`
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {category.name}
                        <span className={`float-right transition-colors ${
                          isSelected
                            ? colors.text
                            : `text-[var(--text-tertiary)] group-hover:${colors.text}`
                        }`}>
                          {getCategoryCount(category.id)}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </aside>

          {/* Right content - Offer list */}
          <div className="flex-1 min-w-0">
            {/* AI Analysis Loading State */}
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
                    Finding Offers For You
                  </p>
                  <p className="text-base text-[var(--text-secondary)] h-6 text-center">
                    {showLoadingText && !isCollapsing && (
                      <TypewriterText text={loadingMessages[loadingMessageIndex]} speed={20} />
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Show context header based on current view */}
            {!isAnalyzing && !showLoader && selectedRecommendation ? (
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border-default)]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[var(--brand-green-primary)]" />
                  <span className="text-[var(--text-primary)] font-medium">
                    Recommended for you
                  </span>
                  <span className="text-[var(--text-tertiary)]">·</span>
                  <span className="text-sm text-[var(--text-tertiary)]">
                    {filteredOffers.length} offers
                  </span>
                </div>
                <button
                  onClick={handleClearRecommendationView}
                  className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
                >
                  View all offers
                </button>
              </div>
            ) : !isAnalyzing && !showLoader && (
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border-default)]">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-primary)] font-medium">
                    {selectedCategoryId === 'all' ? 'All Offers' : getCategory(selectedCategoryId)?.name || 'All Offers'}
                  </span>
                  <span className="text-[var(--text-tertiary)]">·</span>
                  <span className="text-sm text-[var(--text-tertiary)]">
                    {filteredOffers.length} offers
                  </span>
                </div>
                {selectedCategoryId !== 'all' && (
                  <button
                    onClick={() => setSelectedCategoryId('all')}
                    className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
                  >
                    View all offers
                  </button>
                )}
              </div>
            )}

            {/* Offer cards - full width list */}
            {!isAnalyzing && !showLoader && (
            <div className="flex flex-col gap-5">
              {filteredOffers.map((offer) => {
                const partner = getPartner(offer.partnerId);
                if (!partner) return null;
                const category = getCategory(offer.categoryId);
                const colors = category ? getCategoryColorByColorName(category.color) : getCategoryColorByColorName('blue');
                const offerTags = getTagsByIds(offer.tagIds);

                return (
                  <button
                    key={offer.id}
                    onClick={() => handleOfferClick(offer)}
                    className="text-left cursor-pointer"
                  >
                    <Card variant="interactive" className="flex items-center gap-8 p-10">
                      {/* Partner logo */}
                      <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {partner.logo ? (
                          <Image
                            src={`/logos/${partner.logo}`}
                            alt={partner.name}
                            width={64}
                            height={64}
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <span className="text-[var(--brand-green-primary)] font-semibold text-xl">
                            {partner.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-1.5">
                          {offer.name} <span className="font-normal text-[var(--text-secondary)]">from {partner.name}</span>
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-2">
                          {offer.shortDescription}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {category && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${colors.badge}`}>
                              {category.name}
                            </span>
                          )}
                          {offerTags.map((tag) => (
                            <span key={tag.id} className={`text-xs px-2 py-0.5 rounded-full border ${tagBadgeStyle}`}>
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Arrow */}
                      <ArrowRight className="w-5 h-5 text-[var(--text-tertiary)] flex-shrink-0" />
                    </Card>
                  </button>
                );
              })}

              {filteredOffers.length === 0 && (
                <Card className="text-center py-12">
                  <p className="text-[var(--text-secondary)]">
                    No offers found matching your criteria
                  </p>
                </Card>
              )}

              {/* Refine recommendations CTA - shown when viewing recommendations */}
              {selectedRecommendation && (
                <div className="mt-8 text-center">
                  <p className="text-[var(--text-primary)] mb-2">
                    Not seeing what you need?
                  </p>
                  <button
                    onClick={() => setQuestionnaireOpen(true)}
                    className="text-[var(--brand-green-primary)] hover:text-[var(--brand-green-secondary)] font-medium transition-colors cursor-pointer"
                  >
                    Refine your recommendations →
                  </button>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      </main>

      {/* Offer Drawer */}
      <OfferDrawer
        offer={selectedOffer}
        partner={selectedPartner ?? null}
        isOpen={drawerOpen}
        onClose={handleDrawerClose}
      />

      {/* Questionnaire Modal */}
      <QuestionnaireModal
        isOpen={questionnaireOpen}
        onClose={() => setQuestionnaireOpen(false)}
        onComplete={() => handleQuestionnaireComplete()}
      />
    </div>
  );
}
