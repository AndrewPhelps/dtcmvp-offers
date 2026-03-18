'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { offers } from '@/data/offers';
import { brandProfile, getLoadingMessages } from '@/data/brandProfile';

export type BrandClaimStatus = 'submitted' | 'intro_sent';

export interface BrandClaim {
  offerId: string;
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
  updateClaimNotes: (offerId: string, notes: string) => void;
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

// Initial mock data - some offers already claimed/saved for demo
const initialState: BrandState = {
  savedOfferIds: ['orita-audit', 'finsi-report'], // Demo: a couple saved offers
  hiddenOfferIds: [],
  claims: [
    {
      offerId: 'aix-audit',
      status: 'intro_sent',
      notes: 'Had a great call with the team. Starting audit next week.',
      claimedAt: '2024-03-10T14:30:00Z',
    },
    {
      offerId: 'polar-test',
      status: 'submitted',
      notes: '',
      claimedAt: '2024-03-12T10:15:00Z',
    },
  ],
};

export function BrandProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BrandState>(initialState);

  // Recommendation state
  const [recommendations, setRecommendations] = useState<RecommendationSet[]>([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const loadingMessages = getLoadingMessages(brandProfile);

  // Generate AI-like recommendations based on brand profile
  const generateRecommendations = useCallback(() => {
    const claimedOfferIds = state.claims.map((c) => c.offerId);
    const availableOffers = offers.filter(
      (o) => o.isActive && !state.hiddenOfferIds.includes(o.id) && !claimedOfferIds.includes(o.id)
    );

    // Simple matching based on brand profile - prioritize marketing/analytics for Marketing department
    const priorityCategories = brandProfile.contactDepartment === 'Marketing'
      ? ['analytics-insights', 'email-sms-subscribers', 'advertising-acquisition']
      : ['operations', 'retention-loyalty', 'site-checkout'];

    const prioritizedOffers = [
      ...availableOffers.filter((o) => priorityCategories.includes(o.categoryId)),
      ...availableOffers.filter((o) => !priorityCategories.includes(o.categoryId)),
    ];

    // Pick 2-3 offers
    const count = Math.min(Math.floor(Math.random() * 2) + 2, prioritizedOffers.length);
    return prioritizedOffers.slice(0, count);
  }, [state.hiddenOfferIds, state.claims]);

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

    const messageInterval = setInterval(() => {
      setLoadingMessageIndex((prev) => {
        if (prev >= loadingMessages.length - 1) {
          return prev;
        }
        return prev + 1;
      });
    }, 2000);

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

  const updateClaimNotes = (offerId: string, notes: string) => {
    setState((prev) => ({
      ...prev,
      claims: prev.claims.map((c) =>
        c.offerId === offerId ? { ...c, notes } : c
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
