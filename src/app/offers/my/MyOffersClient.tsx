'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { ArrowRight, Bookmark, CheckCircle, FileText } from 'lucide-react';
import { Card, Button, Modal } from '@/components/common';
import { OfferDrawer } from '@/components/offers';
import { useBrand, BrandClaim } from '@/contexts';
import { getCategory, getTagsByIds } from '@/data';
import { Offer, Partner } from '@/types';
import { getCategoryColorByColorName, tagBadgeStyle } from '@/lib/categoryColors';

type TabType = 'claimed' | 'saved';

interface MyOffersClientProps {
  offers: Offer[];
  partners: Partner[];
}

export default function MyOffersClient({ offers, partners }: MyOffersClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('claimed');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesOfferId, setNotesOfferId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [existingNotes, setExistingNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
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
    setExistingNotes(currentNotes || '');
    setNotesValue(''); // textarea is for the new entry only — server appends
    setNotesError(null);
    setNotesModalOpen(true);
  };

  const closeNotesModal = () => {
    setNotesModalOpen(false);
    setNotesOfferId(null);
    setNotesValue('');
    setExistingNotes('');
    setNotesError(null);
  };

  const saveNotes = async () => {
    if (!notesOfferId || !notesValue.trim()) return;
    setNotesSaving(true);
    setNotesError(null);
    try {
      await updateClaimNotes(notesOfferId, notesValue);
      closeNotesModal();
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : 'Failed to save outcome');
    } finally {
      setNotesSaving(false);
    }
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 relative z-10">
        {/* Two-column layout on desktop, single column on mobile */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          {/* Left sidebar - Tabs */}
          <aside className="w-full md:w-64 md:flex-shrink-0">
            <div className="md:sticky md:top-8">
              {/* Mobile: Horizontal tabs */}
              <div className="md:hidden flex border-b border-[var(--border-default)] mb-4">
                <button
                  onClick={() => setActiveTab('claimed')}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'claimed'
                      ? 'border-[var(--brand-green-primary)] text-[var(--text-primary)]'
                      : 'border-transparent text-[var(--text-secondary)]'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  Claimed ({claimedOffers.length})
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
                  Saved ({savedOffers.length})
                </button>
              </div>

              {/* Desktop: Vertical sidebar */}
              <div className="hidden md:block">
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
            </div>
          </aside>

          {/* Right content */}
          <div className="flex-1 min-w-0">
            {/* Claimed Tab Content */}
            {activeTab === 'claimed' && (
              <div className="flex flex-col gap-3 md:gap-5">
                {claimedOffers.length === 0 ? (
                  <Card className="text-center py-8 md:py-12">
                    <CheckCircle className="w-10 h-10 md:w-12 md:h-12 text-[var(--text-tertiary)] mx-auto mb-3 md:mb-4" />
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
                        <Card variant="interactive" className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 p-5 md:p-10">
                          {/* Partner logo */}
                          <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {partner.logo ? (
                              <Image
                                src={partner.logo}
                                alt={partner.name}
                                width={64}
                                height={64}
                                className="w-full h-full object-contain p-1.5 md:p-2"
                              />
                            ) : (
                              <span className="text-[var(--brand-green-primary)] font-semibold text-lg md:text-xl">
                                {partner.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start md:items-center gap-2 mb-1 md:mb-1.5 flex-wrap">
                              <h3 className="text-base md:text-xl font-semibold text-[var(--text-primary)]">
                                {offer.name} <span className="hidden md:inline font-normal text-[var(--text-secondary)]">from {partner.name}</span>
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
                            <p className="text-sm text-[var(--text-secondary)] mb-2 line-clamp-2 md:line-clamp-none">
                              {offer.shortDescription}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {category && (
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${colors.badge}`}>
                                  {category.name}
                                </span>
                              )}
                              {offerTags.slice(0, 2).map((tag) => (
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
                            className="px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
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
              <div className="flex flex-col gap-3 md:gap-5">
                {savedOffers.length === 0 ? (
                  <Card className="text-center py-8 md:py-12">
                    <Bookmark className="w-10 h-10 md:w-12 md:h-12 text-[var(--text-tertiary)] mx-auto mb-3 md:mb-4" />
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
                        <Card variant="interactive" className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 p-5 md:p-10">
                          {/* Partner logo */}
                          <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {partner.logo ? (
                              <Image
                                src={partner.logo}
                                alt={partner.name}
                                width={64}
                                height={64}
                                className="w-full h-full object-contain p-1.5 md:p-2"
                              />
                            ) : (
                              <span className="text-[var(--brand-green-primary)] font-semibold text-lg md:text-xl">
                                {partner.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base md:text-xl font-semibold text-[var(--text-primary)] mb-1 md:mb-1.5">
                              {offer.name} <span className="hidden md:inline font-normal text-[var(--text-secondary)]">from {partner.name}</span>
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-2 line-clamp-2 md:line-clamp-none">
                              {offer.shortDescription}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {category && (
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${colors.badge}`}>
                                  {category.name}
                                </span>
                              )}
                              {offerTags.slice(0, 2).map((tag) => (
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

                          {/* Arrow - hidden on mobile */}
                          <ArrowRight className="hidden md:block w-5 h-5 text-[var(--text-tertiary)] flex-shrink-0" />
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
              {existingNotes ? 'Add Outcome Update' : 'Add Outcome'}
            </h2>
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-2 md:gap-3 px-4 md:px-8 py-3 md:py-4">
            <button
              onClick={closeNotesModal}
              disabled={notesSaving}
              className="px-3 md:px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <Button onClick={saveNotes} loading={notesSaving} disabled={!notesValue.trim()}>
              Save Outcome
            </Button>
          </div>
        }
        maxWidth="max-w-lg"
      >
        <div className="p-4 md:p-8">
          <p className="text-sm text-[var(--text-secondary)] mb-3 md:mb-4">
            Record the outcome of this offer claim (e.g., call scheduled, partnership started, results achieved). New entries are appended — previous notes are preserved.
          </p>
          {existingNotes && (
            <div className="mb-4">
              <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] mb-1.5">Previous notes</p>
              <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--text-secondary)] bg-[var(--bg-body)] border border-[var(--border-default)] rounded-lg px-3 py-2.5 max-h-40 overflow-y-auto">
                {existingNotes}
              </pre>
            </div>
          )}
          <textarea
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            placeholder={existingNotes ? 'Add a new update…' : 'Add notes about this claim...'}
            rows={5}
            className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-[var(--bg-body)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-green-primary)] resize-none"
            autoFocus
          />
          {notesError && (
            <p className="mt-2 text-xs text-red-400">{notesError}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
