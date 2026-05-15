// Canonical select / multi-select vocabularies for the brand Inputs surface.
// INTERESTED_FUNCTIONS + CURRENT_OBJECTIVES are kept verbatim in sync with the
// dtcmvp chrome extension (extension/static/sidepanel.js) so a brand's answers
// travel across surfaces. COMPANY_CATEGORIES reuses the SWAG engine's list.

import { CATEGORIES } from '../swag/swag-types'

export const INTERESTED_FUNCTIONS = [
  'Bundles & Upsells',
  'Product Discovery',
  'Landing Pages',
  'Popups & Lead Capture',
  'Discounts & Promos',
  'Email & SMS',
  'Loyalty & Referrals',
  'Subscriptions',
  'Reviews & UGC',
  'Help Desk & Chat',
  'Returns & Exchanges',
  'Attribution & Ads',
  'Affiliate & Influencer',
  'SEO & Site Speed',
  'Shipping & Fulfillment',
  'Inventory & Ops',
  'Analytics & Dashboards',
  'AI Tools',
  'Themes & Site Builder',
  'Compliance & Localization',
] as const

export const CURRENT_OBJECTIVES = [
  'Profitability',
  'Acquisition',
  'Retention',
  'Conversion',
  'Experience',
  'Reporting',
  'Artificial Intelligence',
  'Fulfillment',
  'Compliance',
  'Developer',
] as const

export const COMPANY_SIZES = [
  '$1-5M',
  '$5-10M',
  '$10-15M',
  '$15-20M',
  '$20-25M',
  '$25-50M',
  '$50-100M',
  '$100M+',
] as const

export const COMPANY_CATEGORIES = CATEGORIES

export type InterestedFunction = (typeof INTERESTED_FUNCTIONS)[number]
export type CurrentObjective = (typeof CURRENT_OBJECTIVES)[number]
export type CompanySize = (typeof COMPANY_SIZES)[number]
