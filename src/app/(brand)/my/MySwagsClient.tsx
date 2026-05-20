'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { ArrowRight, Bookmark, Sparkles, Handshake } from 'lucide-react';
import { Card } from '@/components/common';
import { SwagListingDrawer } from '@/components/swags';
import { useBrand } from '@/contexts';
import { Listing } from '@/types';
import { tagBadgeStyle } from '@/lib/categoryColors';

type TabType = 'created' | 'intro-requested' | 'saved';

interface MySwagsClientProps {
  listings: Listing[];
}

export default function MySwagsClient({ listings }: MySwagsClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('created');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'detail' | 'calculator'>('calculator');

  const { requests, savedOfferIds, unsaveOffer } = useBrand();

  const listingsBySlug = useMemo(
    () => new Map(listings.map((l) => [l.slug, l])),
    [listings],
  );

  const createdRows = useMemo(() => {
    return requests
      .map((req) => ({ req, listing: listingsBySlug.get(req.listingSlug) }))
      .filter((row): row is { req: typeof requests[number]; listing: Listing } => row.listing !== undefined);
  }, [requests, listingsBySlug]);

  const introRequestedRows = useMemo(
    () => createdRows.filter(({ req }) => !!req.introRequestedAt),
    [createdRows],
  );

  const savedListings = useMemo(() => {
    return savedOfferIds
      .map((slug) => listingsBySlug.get(slug))
      .filter((l): l is Listing => l !== undefined);
  }, [savedOfferIds, listingsBySlug]);

  const handleListingClick = (listing: Listing, mode: 'detail' | 'calculator') => {
    setSelectedListing(listing);
    setDrawerMode(mode);
    setDrawerOpen(true);
  };
  const handleDrawerClose = () => setDrawerOpen(false);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
        <img src="/bg-offers.jpg" alt="" className="w-full invisible" />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 relative z-10">
        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          <aside className="w-full md:w-64 md:flex-shrink-0">
            <div className="md:sticky md:top-8">
              {/* Mobile tabs */}
              <div className="md:hidden flex border-b border-[var(--border-default)] mb-4">
                <button
                  onClick={() => setActiveTab('created')}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'created'
                      ? 'border-[var(--brand-green-primary)] text-[var(--text-primary)]'
                      : 'border-transparent text-[var(--text-secondary)]'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  created ({createdRows.length})
                </button>
                <button
                  onClick={() => setActiveTab('intro-requested')}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'intro-requested'
                      ? 'border-[var(--brand-green-primary)] text-[var(--text-primary)]'
                      : 'border-transparent text-[var(--text-secondary)]'
                  }`}
                >
                  <Handshake className="w-4 h-4" />
                  intro ({introRequestedRows.length})
                </button>
                <button
                  onClick={() => setActiveTab('saved')}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'saved'
                      ? 'border-[var(--brand-green-primary)] text-[var(--text-primary)]'
                      : 'border-transparent text-[var(--text-secondary)]'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  saved ({savedListings.length})
                </button>
              </div>

              <div className="hidden md:block">
                <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
                  my partners
                </h3>
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveTab('created')}
                    className={`group w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeTab === 'created'
                        ? 'bg-[var(--brand-green-primary)]/10 text-[var(--brand-green-primary)] font-medium'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      created swags
                    </span>
                    <span
                      className={
                        activeTab === 'created'
                          ? 'text-[var(--brand-green-primary)]'
                          : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'
                      }
                    >
                      {createdRows.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('intro-requested')}
                    className={`group w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeTab === 'intro-requested'
                        ? 'bg-[var(--brand-green-primary)]/10 text-[var(--brand-green-primary)] font-medium'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Handshake className="w-4 h-4" />
                      intro requested
                    </span>
                    <span
                      className={
                        activeTab === 'intro-requested'
                          ? 'text-[var(--brand-green-primary)]'
                          : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'
                      }
                    >
                      {introRequestedRows.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('saved')}
                    className={`group w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      activeTab === 'saved'
                        ? 'bg-[var(--brand-green-primary)]/10 text-[var(--brand-green-primary)] font-medium'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Bookmark className="w-4 h-4" />
                      saved for later
                    </span>
                    <span
                      className={
                        activeTab === 'saved'
                          ? 'text-[var(--brand-green-primary)]'
                          : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'
                      }
                    >
                      {savedListings.length}
                    </span>
                  </button>
                </nav>
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {activeTab === 'created' && (
              <div className="flex flex-col gap-3 md:gap-5">
                {createdRows.length === 0 ? (
                  <Card className="text-center py-8 md:py-12">
                    <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-[var(--text-tertiary)] mx-auto mb-3 md:mb-4" />
                    <p className="text-[var(--text-secondary)] mb-2">no swags generated yet</p>
                    <p className="text-sm text-[var(--text-tertiary)]">
                      when you generate a swag, it will appear here
                    </p>
                  </Card>
                ) : (
                  createdRows.map(({ req, listing }) => (
                    <div
                      key={req.airtableId || req.listingSlug}
                      onClick={() => handleListingClick(listing, 'calculator')}
                      className="text-left cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') handleListingClick(listing, 'calculator');
                      }}
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
                          <div className="flex items-start md:items-center gap-2 mb-1 md:mb-1.5 flex-wrap">
                            <h3 className="text-base md:text-xl font-semibold text-[var(--text-primary)]">
                              {listing.name}
                            </h3>
                            <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--brand-green-primary)]/30 bg-[var(--brand-green-primary)]/10 text-[var(--brand-green-primary)]">
                              generated {formatDate(req.generatedAt)}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--text-secondary)] mb-2 line-clamp-2 md:line-clamp-none">
                            {listing.tagline}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {listing.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className={`text-xs px-2 py-0.5 rounded-full border ${tagBadgeStyle}`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                      </Card>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'intro-requested' && (
              <div className="flex flex-col gap-3 md:gap-5">
                {introRequestedRows.length === 0 ? (
                  <Card className="text-center py-8 md:py-12">
                    <Handshake className="w-10 h-10 md:w-12 md:h-12 text-[var(--text-tertiary)] mx-auto mb-3 md:mb-4" />
                    <p className="text-[var(--text-secondary)] mb-2">no intros requested yet</p>
                    <p className="text-sm text-[var(--text-tertiary)]">
                      generate a swag and click &ldquo;ask for an intro&rdquo; to start a partner conversation
                    </p>
                  </Card>
                ) : (
                  introRequestedRows.map(({ req, listing }) => (
                    <div
                      key={req.airtableId || req.listingSlug}
                      onClick={() => handleListingClick(listing, 'calculator')}
                      className="text-left cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') handleListingClick(listing, 'calculator');
                      }}
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
                          <div className="flex items-start md:items-center gap-2 mb-1 md:mb-1.5 flex-wrap">
                            <h3 className="text-base md:text-xl font-semibold text-[var(--text-primary)]">
                              {listing.name}
                            </h3>
                            <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--brand-green-primary)]/30 bg-[var(--brand-green-primary)]/10 text-[var(--brand-green-primary)] inline-flex items-center gap-1">
                              <Handshake className="w-3 h-3" />
                              intro requested {req.introRequestedAt ? formatDate(req.introRequestedAt) : ''}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--text-secondary)] mb-2 line-clamp-2 md:line-clamp-none">
                            {listing.tagline}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {listing.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className={`text-xs px-2 py-0.5 rounded-full border ${tagBadgeStyle}`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                      </Card>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'saved' && (
              <div className="flex flex-col gap-3 md:gap-5">
                {savedListings.length === 0 ? (
                  <Card className="text-center py-8 md:py-12">
                    <Bookmark className="w-10 h-10 md:w-12 md:h-12 text-[var(--text-tertiary)] mx-auto mb-3 md:mb-4" />
                    <p className="text-[var(--text-secondary)] mb-2">no saved partners</p>
                    <p className="text-sm text-[var(--text-tertiary)]">
                      tap save on a partner to keep track of ones you&apos;re interested in
                    </p>
                  </Card>
                ) : (
                  savedListings.map((listing) => (
                    <div
                      key={listing.slug}
                      onClick={() => handleListingClick(listing, 'detail')}
                      className="text-left cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') handleListingClick(listing, 'detail');
                      }}
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
                            {listing.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className={`text-xs px-2 py-0.5 rounded-full border ${tagBadgeStyle}`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            unsaveOffer(listing.slug);
                          }}
                          className="p-2 text-[var(--brand-green-primary)] hover:bg-[var(--brand-green-primary)]/10 rounded-lg transition-colors cursor-pointer"
                          title="Remove from saved"
                        >
                          <Bookmark className="w-5 h-5 fill-current" />
                        </button>

                        <ArrowRight className="hidden md:block w-5 h-5 text-[var(--text-tertiary)] flex-shrink-0" />
                      </Card>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <SwagListingDrawer
        listing={selectedListing}
        isOpen={drawerOpen}
        onClose={handleDrawerClose}
        initialMode={drawerMode}
      />

    </div>
  );
}
