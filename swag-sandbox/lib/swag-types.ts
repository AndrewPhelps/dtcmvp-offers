// ─── SWAG Spec: the contract between the skill and the renderer ───

export type SwagDefault = {
  value: number
  label: string
  source: string
}

export type BenefitType = 'cost-saving' | 'revenue-generation' | 'time-saving'

export type SwagBenefit = {
  id: string
  label: string
  description: string
  type: BenefitType
  formula: string
  brandInputs: string[]
  swagDefaults: Record<string, SwagDefault>
}

export const BENEFIT_TYPE_META: Record<BenefitType, { label: string; verb: string; color: string }> = {
  'cost-saving': { label: 'Cost savings', verb: 'saves you', color: '#1e90ff' },
  'revenue-generation': { label: 'Potential lift', verb: 'could add', color: '#7bed9f' },
  'time-saving': { label: 'Time savings', verb: 'frees up', color: '#ff9f43' },
}

export type PricingIntel = {
  summary: string               // one-line: "Starts at $300/mo for 2,000 tickets"
  details: string[]             // what we know from the site
  costDrivers: string[]         // what increases the price
  sourceUrl?: string            // link to pricing page
}

// ─── Narratives: personalized writeups by department + category ───

export type Narrative = {
  headline: string                          // "{partnerName} could add {totalValue}/yr to {brandName}."
  byDepartment: Record<string, string>      // key = department name, value = template string
  byCategory: Record<string, string>        // key = category name, value = template string
}

export type SwagSpec = {
  slug: string
  partnerName: string
  partnerUrl: string
  tagline: string
  tags: string[]
  pricingMonthly: number | null // deprecated for display — use pricingIntel instead
  pricingIntel?: PricingIntel
  narrative?: Narrative
  tier: 0 | 1 | 2
  benefits: SwagBenefit[]
  sources: string[]
  notes: string
  generatedAt: string
}

// ─── Departments (from Airtable title classification formula) ───

export const DEPARTMENTS = [
  'Retention / CRM',
  'Creative / Brand',
  'Influencer / Affiliate',
  'Performance / Paid',
  'SEO / Content',
  'Ecommerce / DTC',
  'Marketing / Growth',
  'Finance / Accounting',
  'CX / Support',
  'Operations / Logistics',
  'Data / Analytics',
  'Sales / B2B',
  'Engineering / Technology',
  'Product / UX',
  'People / HR',
  'PR / Communications',
  'Founder & CEO',
  'Other C-Suite',
  'Other',
] as const

export type Department = typeof DEPARTMENTS[number]

// ─── Categories (from stanger INTERNAL_CATEGORIES) ───

export const CATEGORIES = [
  'Apparel & Fashion',
  'Beauty & Cosmetics',
  'Health & Wellness',
  'Sports & Fitness',
  'Food & Drink',
  'Home & Electronics',
  'Baby & Kids',
  'Pet & Vet',
  'Other',
] as const

export type Category = typeof CATEGORIES[number]

// ─── Category-based SWAG default overrides ───

export const CATEGORY_OVERRIDES: Partial<Record<Category, Partial<Pick<BrandProfile, 'aov' | 'returnRate' | 'avgCostPerItem'>>>> = {
  'Apparel & Fashion': { returnRate: 0.20, avgCostPerItem: 45 },
  'Beauty & Cosmetics': { returnRate: 0.08, avgCostPerItem: 35 },
  'Health & Wellness': { returnRate: 0.05, avgCostPerItem: 40 },
  'Sports & Fitness': { returnRate: 0.15, avgCostPerItem: 55 },
  'Food & Drink': { aov: 65, returnRate: 0.02 },
  'Home & Electronics': { aov: 180, returnRate: 0.10 },
  'Baby & Kids': { returnRate: 0.12 },
  'Pet & Vet': { returnRate: 0.08 },
}

// ─── Brand profile ───

export type BrandProfile = {
  brandName: string
  contactName: string
  department: Department
  primaryCategory: Category
  annualOrders: number
  aov: number
  returnRate: number         // decimal, e.g. 0.15
  avgCostPerItem: number
  emailListSize: number
  smsListSize: number
  monthlyWebTraffic: number
  targetRoiMultiple: number  // e.g. 8 = 8x
}

export const DEFAULT_BRAND_PROFILE: BrandProfile = {
  brandName: 'Vuori',
  contactName: 'Sean Wendt',
  department: 'Retention / CRM',
  primaryCategory: 'Apparel & Fashion',
  annualOrders: 100_000,
  aov: 120,
  returnRate: 0.20,
  avgCostPerItem: 45,
  emailListSize: 50_000,
  smsListSize: 20_000,
  monthlyWebTraffic: 330_000,
  targetRoiMultiple: 8,
}

// ─── Computed results ───

export type BenefitResult = {
  id: string
  label: string
  description: string
  type: BenefitType
  annualValue: number
  formulaBreakdown: string
}

export type ScenarioResult = {
  accuracy: number          // 0.6, 0.8, 1.0
  benefits: BenefitResult[]
  totalAnnualValue: number
  maxAnnualPrice: number
  maxMonthlyPrice: number
  actualRoi: number | null  // only if pricingMonthly is known
  actualMultiple: number | null
}

export type SwagResults = {
  scenarios: ScenarioResult[]
  hundred: ScenarioResult    // convenience ref
}

// ─── Partner registry ───

export type PartnerStatus = 'not-started' | 'in-progress' | 'done'

export type PartnerEntry = {
  slug: string
  name: string
  status: PartnerStatus
}

// Map of NUMERIC brand profile fields → display metadata
export const BRAND_PROFILE_FIELDS: Record<
  keyof Omit<BrandProfile, 'targetRoiMultiple' | 'brandName' | 'contactName' | 'department' | 'primaryCategory'>,
  { label: string; prefix?: string; suffix?: string; step: number; hint?: string }
> = {
  annualOrders: { label: 'Annual order volume', step: 1000 },
  aov: { label: 'Average order value (AOV)', prefix: '$', step: 1 },
  returnRate: { label: 'Return rate', suffix: '%', step: 0.5 },
  avgCostPerItem: { label: 'Avg cost per item', prefix: '$', step: 5 },
  emailListSize: { label: 'Email list size', step: 1000 },
  smsListSize: { label: 'SMS list size', step: 1000 },
  monthlyWebTraffic: { label: 'Monthly web traffic', step: 5000 },
}
