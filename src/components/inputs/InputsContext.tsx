'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { BrandProfile } from '@/lib/swag/swag-types';
import { DEFAULT_BRAND_PROFILE } from '@/lib/swag/swag-types';
import { cascade } from '@/lib/inputs';
import { getInputsPrefill, saveMyInputs, type BrandInputs } from '@/lib/api';

interface InputsContextType {
  /** The brand's working profile — saved Inputs over enrichment over defaults. */
  inputs: BrandProfile;
  setField: <K extends keyof BrandProfile>(key: K, value: BrandProfile[K]) => void;
  save: () => Promise<void>;
  loading: boolean;
  saving: boolean;
  /** True when the in-memory profile differs from what's persisted. */
  dirty: boolean;
  lastSavedAt: string | null;
  /** Whether the brand has ever saved Inputs (vs. only seeing prefill/defaults). */
  hasSaved: boolean;
}

const InputsContext = createContext<InputsContextType | undefined>(undefined);

export function InputsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [inputs, setInputs] = useState<BrandProfile>(DEFAULT_BRAND_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { saved, prefill } = await getInputsPrefill();
        if (cancelled) return;
        setInputs(cascade(saved, prefill));
        setHasSaved(!!saved && Object.keys(saved).length > 0);
      } catch (err) {
        console.error('[Inputs] prefill load failed', err);
        if (!cancelled) setInputs(cascade());
      } finally {
        if (!cancelled) {
          setDirty(false);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const setField = useCallback(
    <K extends keyof BrandProfile>(key: K, value: BrandProfile[K]) => {
      setInputs((prev) => ({ ...prev, [key]: value }));
      setDirty(true);
    },
    [],
  );

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await saveMyInputs(inputs as BrandInputs);
      setDirty(false);
      setHasSaved(true);
      setLastSavedAt(new Date().toISOString());
    } finally {
      setSaving(false);
    }
  }, [inputs]);

  return (
    <InputsContext.Provider
      value={{ inputs, setField, save, loading, saving, dirty, lastSavedAt, hasSaved }}
    >
      {children}
    </InputsContext.Provider>
  );
}

export function useInputs() {
  const ctx = useContext(InputsContext);
  if (!ctx) throw new Error('useInputs must be used within an InputsProvider');
  return ctx;
}
