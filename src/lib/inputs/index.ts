// Canonical brand-input question bank. Single source of truth for the Inputs
// surface (per the 1a decision). The public marketing site ports this module
// the same way it ports the SWAG engine.

import type { BrandProfile } from '../swag/swag-types'
import { DEFAULT_BRAND_PROFILE, DEPARTMENTS } from '../swag/swag-types'
import { INTERESTED_FUNCTIONS, CURRENT_OBJECTIVES, COMPANY_SIZES, COMPANY_CATEGORIES } from './enums'

export * from './enums'
export * from './buckets'
export * from './relevance'

export type QuestionType = 'number' | 'select' | 'multiselect' | 'text'
export type QuestionSection = 'company' | 'store' | 'audience' | 'goals'

export type Question = {
  /** Stable ID. Matches a BrandProfile key so the stored JSON needs no remapping. */
  id: keyof BrandProfile
  label: string
  type: QuestionType
  section: QuestionSection
  options?: readonly string[] // select / multiselect
  bucketKey?: string // number questions → BUCKETS[bucketKey]
  prefix?: string
  suffix?: string
  step?: number
  hint?: string
}

export const QUESTION_BANK: Question[] = [
  // company
  { id: 'companyWebsite', label: 'Company website', type: 'text', section: 'company', hint: 'e.g. acme.com' },
  { id: 'companySize', label: 'Annual revenue', type: 'select', section: 'company', options: COMPANY_SIZES },
  { id: 'primaryCategory', label: 'Brand category', type: 'select', section: 'company', options: COMPANY_CATEGORIES },
  { id: 'department', label: 'Your department', type: 'select', section: 'company', options: DEPARTMENTS },
  // store economics
  { id: 'annualOrders', label: 'Annual order volume', type: 'number', section: 'store', step: 1000, bucketKey: 'annualOrders' },
  { id: 'aov', label: 'Average order value', type: 'number', section: 'store', prefix: '$', step: 1, bucketKey: 'aov' },
  { id: 'avgCostPerItem', label: 'Avg cost per item', type: 'number', section: 'store', prefix: '$', step: 5, bucketKey: 'avgCostPerItem' },
  { id: 'returnRate', label: 'Return rate', type: 'number', section: 'store', suffix: '%', step: 0.5, bucketKey: 'returnRate' },
  { id: 'monthlyWebTraffic', label: 'Monthly web traffic', type: 'number', section: 'store', step: 5000, bucketKey: 'monthlyWebTraffic' },
  // audience
  { id: 'emailListSize', label: 'Email list size', type: 'number', section: 'audience', step: 1000, bucketKey: 'emailListSize' },
  { id: 'smsListSize', label: 'SMS list size', type: 'number', section: 'audience', step: 1000, bucketKey: 'smsListSize' },
  // goals
  { id: 'currentObjectives', label: 'Current objectives', type: 'multiselect', section: 'goals', options: CURRENT_OBJECTIVES },
  { id: 'interestedFunctions', label: 'Solutions you want', type: 'multiselect', section: 'goals', options: INTERESTED_FUNCTIONS },
  { id: 'targetRoiMultiple', label: 'Target ROI multiple', type: 'number', section: 'goals', suffix: 'x', step: 1 },
]

export const SECTION_LABELS: Record<QuestionSection, string> = {
  company: 'Company',
  store: 'Store economics',
  audience: 'Audience',
  goals: 'Goals',
}

function isEmpty(v: unknown): boolean {
  if (v == null) return true
  if (typeof v === 'string') return v.trim() === ''
  if (typeof v === 'number') return Number.isNaN(v)
  if (Array.isArray(v)) return v.length === 0
  return false
}

/**
 * Merge brand-input layers, highest priority first. Each field is taken from
 * the first layer that supplies a non-empty value; DEFAULT_BRAND_PROFILE is the
 * final backstop, so the result is always a complete BrandProfile.
 * Typical call: cascade(savedInputs, sqliteEnriched, storeleadsLive)
 */
export function cascade(...layers: Array<Partial<BrandProfile> | null | undefined>): BrandProfile {
  const out: BrandProfile = { ...DEFAULT_BRAND_PROFILE }
  for (const key of Object.keys(out) as (keyof BrandProfile)[]) {
    for (const layer of layers) {
      const v = layer?.[key]
      if (!isEmpty(v)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(out as any)[key] = v
        break
      }
    }
  }
  return out
}
