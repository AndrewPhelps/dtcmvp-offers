'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { brandProfile, getLoadingMessages } from '@/data/brandProfile';
import { Offer, BrandRequest } from '@/types';
import {
  getMyRequests, createRequest as apiCreateRequest, appendRequestNotes,
} from '@/lib/api';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useAuth } from '@/contexts/AuthContext';

export interface RecommendationSet {
  id: string;
  date: Date;
  /** Listing slugs (the recommendation engine still uses Offer-shaped synthetic objects internally). */
  offerIds: string[];
}

interface BrandState {
  savedOfferIds: string[];
  hiddenOfferIds: string[];
  requests: BrandRequest[];
}

interface BrandContextType {
  savedOfferIds: string[];
  hiddenOfferIds: string[];
  requests: BrandRequest[];

  /** The marketplace page feeds the recommendation engine with offer-shaped Listings. */
  setAvailableOffers: (offers: Offer[]) => void;

  saveOffer: (offerId: string) => void;
  unsaveOffer: (offerId: string) => void;
  isOfferSaved: (offerId: string) => boolean;

  hideOffer: (offerId: string) => void;
  isOfferHidden: (offerId: string) => boolean;

  generateSwag: (input: {
    listingSlug: string;
    listingName: string;
    swagSnapshot?: { totalAnnualValue?: number; maxMonthlyPrice?: number; targetRoiMultiple?: number };
  }) => Promise<BrandRequest>;
  getRequestByListingSlug: (slug: string) => BrandRequest | undefined;
  hasGeneratedForListing: (slug: string) => boolean;
  updateRequestNotes: (airtableId: string, notes: string) => Promise<void>;

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

const initialState: BrandState = {
  savedOfferIds: [],
  hiddenOfferIds: [],
  requests: [],
};

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
    setState((prev) => ({ ...prev, requests: [] }));
    getMyRequests()
      .then((requests) => {
        if (cancelled) return;
        setState((prev) => ({ ...prev, requests }));
      })
      .catch((err) => console.error('[Brand] Failed to load SWAG requests:', err));
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

  // Generate AI-like recommendations from the available pool. Listings don't carry
  // a category field anymore, so the priority-bucket matching from the offers era
  // is gone — for now we just pick from the un-hidden, un-generated pool.
  const generateRecommendations = useCallback(() => {
    const generatedSlugs = state.requests.map((r) => r.listingSlug);
    const pool = availableOffers.filter(
      (o) => o.isActive && !state.hiddenOfferIds.includes(o.id) && !generatedSlugs.includes(o.id),
    );
    const count = Math.min(Math.floor(Math.random() * 2) + 2, pool.length);
    return pool.slice(0, count);
  }, [availableOffers, state.hiddenOfferIds, state.requests]);

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

  // ----- SWAG-era request actions -----

  const generateSwag = async (input: {
    listingSlug: string;
    listingName: string;
    swagSnapshot?: { totalAnnualValue?: number; maxMonthlyPrice?: number; targetRoiMultiple?: number };
  }): Promise<BrandRequest> => {
    // Optimistic local entry so the CTA flips to "View SWAG" while the POST is in-flight.
    const existing = state.requests.find((r) => r.listingSlug === input.listingSlug);
    if (existing) return existing;

    const optimistic: BrandRequest = {
      airtableId: '',
      listingSlug: input.listingSlug,
      listingName: input.listingName,
      status: 'generated',
      generatedAt: new Date().toISOString(),
      swagSnapshot: input.swagSnapshot,
    };
    setState((prev) => ({
      ...prev,
      requests: [optimistic, ...prev.requests],
      // Generating a SWAG implicitly removes the listing from "saved" — graduated.
      savedOfferIds: prev.savedOfferIds.filter((id) => id !== input.listingSlug),
    }));

    try {
      const result = await apiCreateRequest({
        listingSlug: input.listingSlug,
        swagSnapshot: input.swagSnapshot,
      });
      // Replace the optimistic record with the server-authoritative one.
      setState((prev) => ({
        ...prev,
        requests: prev.requests.map((r) =>
          r.listingSlug === input.listingSlug ? result.request : r,
        ),
      }));
      return result.request;
    } catch (err) {
      console.error('[Brand] generateSwag failed:', err);
      // Roll back the optimistic entry so the CTA reverts to "Generate SWAG".
      setState((prev) => ({
        ...prev,
        requests: prev.requests.filter((r) => r.listingSlug !== input.listingSlug || r.airtableId !== ''),
      }));
      throw err;
    }
  };

  const getRequestByListingSlug = (slug: string) => {
    return state.requests.find((r) => r.listingSlug === slug);
  };

  const hasGeneratedForListing = (slug: string) => {
    return state.requests.some((r) => r.listingSlug === slug);
  };

  const updateRequestNotes = async (airtableId: string, notes: string) => {
    const result = await appendRequestNotes(airtableId, notes);
    setState((prev) => ({
      ...prev,
      requests: prev.requests.map((r) =>
        r.airtableId === airtableId ? { ...r, notes: result.notes } : r,
      ),
    }));
  };

  const value: BrandContextType = {
    savedOfferIds: state.savedOfferIds,
    hiddenOfferIds: state.hiddenOfferIds,
    requests: state.requests,
    setAvailableOffers,
    saveOffer,
    unsaveOffer,
    isOfferSaved,
    hideOffer,
    isOfferHidden,
    generateSwag,
    getRequestByListingSlug,
    hasGeneratedForListing,
    updateRequestNotes,
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
