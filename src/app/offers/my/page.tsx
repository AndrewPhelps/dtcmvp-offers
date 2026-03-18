'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { ArrowRight, Bookmark, CheckCircle, FileText } from 'lucide-react';
import { Card, Button, Modal } from '@/components/common';
import { OfferDrawer } from '@/components/offers';
import { useBrand, BrandClaim } from '@/contexts';
import { offers, partners, getCategory, getTagsByIds } from '@/data';
import { Offer } from '@/types';
import { getCategoryColorByColorName, tagBadgeStyle } from '@/lib/categoryColors';

type TabType = 'claimed' | 'saved';

export default function MyOffersPage() {
  const [activeTab, setActiveTab] = useState<TabType>('claimed');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesOfferId, setNotesOfferId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const { claims, savedOfferIds, updateClaimNotes, unsaveOffer } = useBrand();

  const claimedOffers = useMemo(() => {
    return claims.map((claim) => {
      const offer = offers.find((o) => o.id === claim.offerId);
      return { claim, offer };
    }).filter((item) => item.offer !== undefined) as { claim: BrandClaim; offer: Offer }[];
  }, [claims]);

  const savedOffers = useMemo(() => {
    return savedOfferIds
      .map((id) => offers.find((o) => o.id === id))
      .filter((o): o is Offer => o !== undefined);
  }, [savedOfferIds]);

  const getPartner = (partnerId: string) => {
    return partners.find((p) => p.id === partnerId);
  };

  const handleOfferClick = (offer: Offer) => {
    setSelectedOffer(offer);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const selectedPartner = selectedOffer ? getPartner(selectedOffer.partnerId) : null;

  // Handle notes modal
  const openNotesModal = (offerId: string, currentNotes: string) => {
    setNotesOfferId(offerId);
    setNotesValue(currentNotes);
    setNotesModalOpen(true);
  };

  const closeNotesModal = () => {
    setNotesModalOpen(false);
    setNotesOfferId(null);
    setNotesValue('');
  };

  const saveNotes = () => {
    if (notesOfferId) {
      updateClaimNotes(notesOfferId, notesValue);
    }
    closeNotesModal();
  };

  return (
    <div className="relative">
      {/* Background image - fixed to bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 pointer-events-none z-0 opacity-25"
        style={{ backgroundImage: 'url(/bg-offers.jpg)', backgroundSize: '100% auto', backgroundPosition: 'bottom', backgroundRepeat: 'no-repeat' }}
      >
        <img src="/bg-offers.jpg" alt="" className="w-full invisible" />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Two-column layout */}
        <div className="flex gap-8">
          {/* Left sidebar - Tabs */}
          <aside className="w-64 flex-shrink-0">
            <div className="sticky top-8">
              <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
                My Offers
              </h3>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('claimed')}
                  className={`group w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-between ${
                    activeTab === 'claimed'
                      ? 'bg-[var(--brand-green-primary)]/10 text-[var(--brand-green-primary)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Claimed
                  </span>
                  <span className={`${
                    activeTab === 'claimed'
                      ? 'text-[var(--brand-green-primary)]'
                      : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'
                  }`}>
                    {claimedOffers.length}
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
                    Saved for Later
                  </span>
                  <span className={`${
                    activeTab === 'saved'
                      ? 'text-[var(--brand-green-primary)]'
                      : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'
                  }`}>
                    {savedOffers.length}
                  </span>
                </button>
              </nav>
            </div>
          </aside>

          {/* Right content */}
          <div className="flex-1 min-w-0">
            {/* Claimed Tab Content */}
            {activeTab === 'claimed' && (
              <div className="flex flex-col gap-5">
                {claimedOffers.length === 0 ? (
                  <Card className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
                    <p className="text-[var(--text-secondary)] mb-2">No claimed offers yet</p>
                    <p className="text-sm text-[var(--text-tertiary)]">
                      When you claim an offer, it will appear here
                    </p>
                  </Card>
                ) : (
                  claimedOffers.map(({ claim, offer }) => {
                    const partner = getPartner(offer.partnerId);
                    if (!partner) return null;
                    const category = getCategory(offer.categoryId);
                    const colors = category ? getCategoryColorByColorName(category.color) : getCategoryColorByColorName('blue');
                    const offerTags = getTagsByIds(offer.tagIds);

                    return (
                      <div
                        key={offer.id}
                        onClick={() => handleOfferClick(offer)}
                        className="text-left cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleOfferClick(offer);
                          }
                        }}
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
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                                {offer.name} <span className="font-normal text-[var(--text-secondary)]">from {partner.name}</span>
                              </h3>
                              {claim.status === 'submitted' ? (
                                <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--brand-orange)]/30 bg-[var(--brand-orange)]/10 text-[var(--brand-orange)]">
                                  Claimed
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--brand-green-primary)]/30 bg-[var(--brand-green-primary)]/10 text-[var(--brand-green-primary)]">
                                  Intro Sent
                                </span>
                              )}
                            </div>
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

                          {/* Add/Edit Outcome button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openNotesModal(offer.id, claim.notes);
                            }}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
                          >
                            {claim.notes ? 'Edit Outcome' : 'Add Outcome'}
                          </button>
                        </Card>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Saved Tab Content */}
            {activeTab === 'saved' && (
              <div className="flex flex-col gap-5">
                {savedOffers.length === 0 ? (
                  <Card className="text-center py-12">
                    <Bookmark className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
                    <p className="text-[var(--text-secondary)] mb-2">No saved offers</p>
                    <p className="text-sm text-[var(--text-tertiary)]">
                      Save offers for later to keep track of ones you&apos;re interested in
                    </p>
                  </Card>
                ) : (
                  savedOffers.map((offer) => {
                    const partner = getPartner(offer.partnerId);
                    if (!partner) return null;
                    const category = getCategory(offer.categoryId);
                    const colors = category ? getCategoryColorByColorName(category.color) : getCategoryColorByColorName('blue');
                    const offerTags = getTagsByIds(offer.tagIds);

                    return (
                      <div
                        key={offer.id}
                        onClick={() => handleOfferClick(offer)}
                        className="text-left cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleOfferClick(offer);
                          }
                        }}
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

                          {/* Unsave button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              unsaveOffer(offer.id);
                            }}
                            className="p-2 text-[var(--brand-green-primary)] hover:bg-[var(--brand-green-primary)]/10 rounded-lg transition-colors cursor-pointer"
                            title="Remove from saved"
                          >
                            <Bookmark className="w-5 h-5 fill-current" />
                          </button>

                          {/* Arrow */}
                          <ArrowRight className="w-5 h-5 text-[var(--text-tertiary)] flex-shrink-0" />
                        </Card>
                      </div>
                    );
                  })
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

      {/* Notes Modal */}
      <Modal
        isOpen={notesModalOpen}
        onClose={closeNotesModal}
        header={
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[var(--brand-green-primary)]" />
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {notesValue ? 'Edit Outcome' : 'Add Outcome'}
            </h2>
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-3 px-8 py-4">
            <button
              onClick={closeNotesModal}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <Button onClick={saveNotes}>
              Save Outcome
            </Button>
          </div>
        }
      >
        <div className="p-8">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Record the outcome of this offer claim (e.g., call scheduled, partnership started, results achieved).
          </p>
          <textarea
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            placeholder="Add notes about this claim..."
            rows={6}
            className="w-full px-4 py-3 bg-[var(--bg-body)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-green-primary)] resize-none"
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
}
