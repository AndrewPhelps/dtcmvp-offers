// ─── SWAG Spec: the contract between the skill and the renderer ───

export type SwagDefault = {
  value: number                             // fallback (blended mid-range across all case studies)
  label: string
  source: string
  byCategory?: Record<string, number>       // optional category-specific values (Apparel & Fashion, Beauty & Cosmetics, etc.). Engine resolves to byCategory[profile.primaryCategory] when present, falls back to value.
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
  'cost-saving': { label: 'Cost savings', verb: 'saves you', color: '#70a1ff' },
  'revenue-generation': { label: 'Potential lift', verb: 'could add', color: '#7bed9f' },
  'time-saving': { label: 'Time savings', verb: 'frees up', color: '#ffa502' },
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

// ─── Canonical benefit labels (from /generate-swag skill) ───
// Every benefit's `label` must be one of these. Reviewers flag deviations
// and the admin Review panel lints specs against this list.

export const CANONICAL_BENEFIT_LABELS = {
  'revenue-generation': [
    'CVR Lift',
    'AOV Lift',
    'Repeat Rate Lift',
    'LTV Lift',
    'Cart Recovery',
    'Upsell Revenue',
    'Subscription Revenue',
    'Attributed Revenue (Channel)', // channel required in parens — see ATTRIBUTED_REVENUE_PREFIX check
    'Winback Revenue',
    'Retention Revenue',
    'List Growth Revenue',
    'Ad Revenue',
    'Organic Revenue',
    'Flow Optimization',
  ],
  'cost-saving': [
    'Ticket Deflection',
    'Return Prevention',
    'ROAS Improvement',
    'Fee Avoidance',
    'Shipping Optimization',
    'Tool Consolidation',
  ],
  'time-saving': [
    'Workflow Automation',
  ],
} as const

// Flat set of non-parameterized labels for quick exact-match checks.
// `Attributed Revenue (...)` is handled by prefix check instead of exact match.
export const CANONICAL_BENEFIT_LABEL_SET: ReadonlySet<string> = new Set([
  ...CANONICAL_BENEFIT_LABELS['revenue-generation'].filter((l) => l !== 'Attributed Revenue (Channel)'),
  ...CANONICAL_BENEFIT_LABELS['cost-saving'],
  ...CANONICAL_BENEFIT_LABELS['time-saving'],
])

export const ATTRIBUTED_REVENUE_PREFIX = 'Attributed Revenue'

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
  contactEmail: string
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
  brandName: 'Sunday Swagger',
  contactName: 'Kyle Moloo',
  contactEmail: '',
  department: 'Marketing / Growth',
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
  keyof Omit<BrandProfile, 'targetRoiMultiple' | 'brandName' | 'contactName' | 'contactEmail' | 'department' | 'primaryCategory'>,
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
