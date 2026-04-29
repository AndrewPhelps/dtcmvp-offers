'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { TestBrandMatch } from '@/lib/api'

const STORAGE_KEY = 'dtcmvp.impersonation.testBrand'

type ImpersonationContextValue = {
  testBrand: TestBrandMatch | null
  setTestBrand: (m: TestBrandMatch | null) => void
}

const ImpersonationContext = createContext<ImpersonationContextValue | null>(null)

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [testBrand, setTestBrandState] = useState<TestBrandMatch | null>(null)

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setTestBrandState(JSON.parse(raw))
    } catch {
      /* ignore corrupt storage */
    }
  }, [])

  const setTestBrand = (m: TestBrandMatch | null) => {
    setTestBrandState(m)
    try {
      if (m) localStorage.setItem(STORAGE_KEY, JSON.stringify(m))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore quota errors */
    }
  }

  return (
    <ImpersonationContext.Provider value={{ testBrand, setTestBrand }}>
      {children}
    </ImpersonationContext.Provider>
  )
}

// No-op fallback so consumers (e.g. SwagCalculator reused in /admin/swags)
// don't crash when rendered outside an ImpersonationProvider. In those
// contexts there's no impersonation UI and no banner; the hook just
// returns a stable null state.
const NULL_CONTEXT: ImpersonationContextValue = {
  testBrand: null,
  setTestBrand: () => {},
}

export function useImpersonation(): ImpersonationContextValue {
  return useContext(ImpersonationContext) ?? NULL_CONTEXT
}

/**
 * Read the impersonated contact id directly from localStorage.
 * Used by authFetch (which can't use React hooks) to inject the
 * X-Impersonate-Contact-Id header on every API call.
 */
export function getImpersonatedContactId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TestBrandMatch
    return parsed?.contactAirtableId || null
  } catch {
    return null
  }
}

export function clearImpersonation() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
