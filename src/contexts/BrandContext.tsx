'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { brandProfile, getLoadingMessages } from '@/data/brandProfile';
import { Offer } from '@/types';
import { getMyClaims, appendClaimNotes, ClaimRecord } from '@/lib/api';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useAuth } from '@/contexts/AuthContext';

export type BrandClaimStatus = 'submitted' | 'intro_sent';

export interface BrandClaim {
  offerId: string;
  claimId: string;
  status: BrandClaimStatus;
  notes: string;
  claimedAt: string;
}

export interface RecommendationSet {
  id: string;
  date: Date;
  offerIds: string[];
}

interface BrandState {
  savedOfferIds: string[];
  hiddenOfferIds: string[];
  claims: BrandClaim[];
}

interface BrandContextType {
  // State
  savedOfferIds: string[];
  hiddenOfferIds: string[];
  claims: BrandClaim[];

  // Offers available for recommendation (populated by the marketplace page
  // from the API; empty on routes that don't load offers).
  setAvailableOffers: (offers: Offer[]) => void;

  // Actions for saved offers
  saveOffer: (offerId: string) => void;
  unsaveOffer: (offerId: string) => void;
  isOfferSaved: (offerId: string) => boolean;

  // Actions for hidden offers
  hideOffer: (offerId: string) => void;
  isOfferHidden: (offerId: string) => boolean;

  // Actions for claims
  claimOffer: (offerId: string) => void;
  getClaimByOfferId: (offerId: string) => BrandClaim | undefined;
  updateClaimNotes: (offerId: string, notes: string) => Promise<void>;
  markIntroSent: (offerId: string) => void;
  isOfferClaimed: (offerId: string) => boolean;

  // Recommendations
  recommendations: RecommendationSet[];
  selectedRecommendation: string | null;
  isAnalyzing: boolean;
  loadingMessageIndex: number;
  loadingMessages: string[];
  startAnalysis: () => void;
  generateRecommendationsImmediate: () => void;
  selectRecommendation: (recId: string) => void;
  clearRecommendationView: () => void;
  removeRecommendation: (recId: string) => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

// No demo claims/saves by default — real claims come from the POST /api/offers/claims flow.
const initialState: BrandState = {
  savedOfferIds: [],
  hiddenOfferIds: [],
  claims: [],
};

function apiClaimToBrandClaim(c: ClaimRecord): BrandClaim {
  return {
    offerId: c.offer_slug,
    claimId: c.claim_id,
    status: c.status === 'pending' ? 'submitted' : 'intro_sent',
    notes: c.notes ?? '',
    claimedAt: c.claimed_at,
  };
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BrandState>(initialState);
  const { user } = useAuth();
  const { testBrand } = useImpersonation();
  // Re-key the fetch by the effective identity (real user OR impersonated brand)
  // so toggling impersonation refetches and never shows stale claims.
  const effectiveIdentityKey = testBrand?.contactAirtableId || user?.email || null;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    // Clear immediately so a stale list never flashes during the refetch.
    setState((prev) => ({ ...prev, claims: [] }));
    getMyClaims()
      .then((claims) => {
        if (cancelled) return;
        setState((prev) => ({ ...prev, claims: claims.map(apiClaimToBrandClaim) }));
      })
      .catch((err) => console.error('[Brand] Failed to load claims:', err));
    return () => {
      cancelled = true;
    };
  }, [user, effectiveIdentityKey]);

  // Offers available to the recommendation engine. Populated by the marketplace
  // page on mount from the API. Empty array on other routes — safe, since
  // recommendations only fire from the marketplace.
  const [availableOffers, setAvailableOffers] = useState<Offer[]>([]);

  // Recommendation state
  const [recommendations, setRecommendations] = useState<RecommendationSet[]>([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const loadingMessages = getLoadingMessages(brandProfile);

  // Generate AI-like recommendations based on brand profile
  const generateRecommendations = useCallback(() => {
    const claimedOfferIds = state.claims.map((c) => c.offerId);
    const pool = availableOffers.filter(
      (o) => o.isActive && !state.hiddenOfferIds.includes(o.id) && !claimedOfferIds.includes(o.id)
    );

    // Simple matching based on brand profile - prioritize marketing/analytics for Marketing department
    const priorityCategories = brandProfile.contactDepartment === 'Marketing'
      ? ['analytics-insights', 'email-sms-subscribers', 'advertising-acquisition']
      : ['operations', 'retention-loyalty', 'site-checkout'];

    const prioritizedOffers = [
      ...pool.filter((o) => priorityCategories.includes(o.categoryId)),
      ...pool.filter((o) => !priorityCategories.includes(o.categoryId)),
    ];

    // Pick 2-3 offers
    const count = Math.min(Math.floor(Math.random() * 2) + 2, prioritizedOffers.length);
    return prioritizedOffers.slice(0, count);
  }, [availableOffers, state.hiddenOfferIds, state.claims]);

  // Start analysis (with AI simulation)
  const startAnalysis = useCallback(() => {
    setIsAnalyzing(true);
    setLoadingMessageIndex(0);
  }, []);

  // Generate recommendations immediately (no AI simulation)
  const generateRecommendationsImmediate = useCallback(() => {
    const recommendedOffers = generateRecommendations();
    const newRecommendation: RecommendationSet = {
      id: Date.now().toString(),
      date: new Date(),
      offerIds: recommendedOffers.map((o) => o.id),
    };
    setRecommendations((prev) => [newRecommendation, ...prev]);
    setSelectedRecommendation(newRecommendation.id);
  }, [generateRecommendations]);

  // Cycle through loading messages and complete analysis
  useEffect(() => {
    if (!isAnalyzing) return;

    // Delay the start of message cycling to account for intro animation (~750ms)
    // This ensures the first message gets full display time after text appears
    const introAnimationDelay = 750;
    let messageInterval: NodeJS.Timeout;

    const startInterval = setTimeout(() => {
      messageInterval = setInterval(() => {
        setLoadingMessageIndex((prev) => {
          if (prev >= loadingMessages.length - 1) {
            return prev;
          }
          return prev + 1;
        });
      }, 2000);
    }, introAnimationDelay);

    const completeTimeout = setTimeout(() => {
      const recommendedOffers = generateRecommendations();
      const newRecommendation: RecommendationSet = {
        id: Date.now().toString(),
        date: new Date(),
        offerIds: recommendedOffers.map((o) => o.id),
      };
      setRecommendations((prev) => [newRecommendation, ...prev]);
      setSelectedRecommendation(newRecommendation.id);
      setIsAnalyzing(false);
      setLoadingMessageIndex(0);
    }, 8000);

    return () => {
      clearTimeout(startInterval);
      clearInterval(messageInterval);
      clearTimeout(completeTimeout);
    };
  }, [isAnalyzing, loadingMessages.length, generateRecommendations]);

  const selectRecommendation = useCallback((recId: string) => {
    setSelectedRecommendation(recId);
  }, []);

  const clearRecommendationView = useCallback(() => {
    setSelectedRecommendation(null);
  }, []);

  const removeRecommendation = useCallback((recId: string) => {
    setRecommendations((prev) => prev.filter((r) => r.id !== recId));
    if (selectedRecommendation === recId) {
      setSelectedRecommendation(null);
    }
  }, [selectedRecommendation]);

  // Saved offers actions
  const saveOffer = (offerId: string) => {
    setState((prev) => ({
      ...prev,
      savedOfferIds: prev.savedOfferIds.includes(offerId)
        ? prev.savedOfferIds
        : [...prev.savedOfferIds, offerId],
    }));
  };

  const unsaveOffer = (offerId: string) => {
    setState((prev) => ({
      ...prev,
      savedOfferIds: prev.savedOfferIds.filter((id) => id !== offerId),
    }));
  };

  const isOfferSaved = (offerId: string) => {
    return state.savedOfferIds.includes(offerId);
  };

  // Hidden offers actions
  const hideOffer = (offerId: string) => {
    setState((prev) => ({
      ...prev,
      hiddenOfferIds: prev.hiddenOfferIds.includes(offerId)
        ? prev.hiddenOfferIds
        : [...prev.hiddenOfferIds, offerId],
      // Also remove from saved if it was saved
      savedOfferIds: prev.savedOfferIds.filter((id) => id !== offerId),
    }));
  };

  const isOfferHidden = (offerId: string) => {
    return state.hiddenOfferIds.includes(offerId);
  };

  // Claims actions
  const claimOffer = (offerId: string) => {
    if (state.claims.some((c) => c.offerId === offerId)) {
      return; // Already claimed
    }
    setState((prev) => ({
      ...prev,
      claims: [
        ...prev.claims,
        {
          offerId,
          claimId: '', // populated on next server refetch
          status: 'submitted',
          notes: '',
          claimedAt: new Date().toISOString(),
        },
      ],
      // Remove from saved if it was saved
      savedOfferIds: prev.savedOfferIds.filter((id) => id !== offerId),
    }));
  };

  const getClaimByOfferId = (offerId: string) => {
    return state.claims.find((c) => c.offerId === offerId);
  };

  // Append a new outcome note to a claim. Persists server-side; previous
  // Notes content is preserved (server concatenates).
  const updateClaimNotes = async (offerId: string, notes: string) => {
    const claim = state.claims.find((c) => c.offerId === offerId);
    if (!claim?.claimId) {
      console.warn('[Brand] updateClaimNotes: no claimId for', offerId);
      return;
    }
    const result = await appendClaimNotes(claim.claimId, notes);
    setState((prev) => ({
      ...prev,
      claims: prev.claims.map((c) =>
        c.offerId === offerId ? { ...c, notes: result.notes } : c,
      ),
    }));
  };

  const markIntroSent = (offerId: string) => {
    setState((prev) => ({
      ...prev,
      claims: prev.claims.map((c) =>
        c.offerId === offerId ? { ...c, status: 'intro_sent' as BrandClaimStatus } : c
      ),
    }));
  };

  const isOfferClaimed = (offerId: string) => {
    return state.claims.some((c) => c.offerId === offerId);
  };

  const value: BrandContextType = {
    savedOfferIds: state.savedOfferIds,
    hiddenOfferIds: state.hiddenOfferIds,
    claims: state.claims,
    setAvailableOffers,
    saveOffer,
    unsaveOffer,
    isOfferSaved,
    hideOffer,
    isOfferHidden,
    claimOffer,
    getClaimByOfferId,
    updateClaimNotes,
    markIntroSent,
    isOfferClaimed,
    // Recommendations
    recommendations,
    selectedRecommendation,
    isAnalyzing,
    loadingMessageIndex,
    loadingMessages,
    startAnalysis,
    generateRecommendationsImmediate,
    selectRecommendation,
    clearRecommendationView,
    removeRecommendation,
  };

  return (
    <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}
