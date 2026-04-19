import type { SwagSpec, BrandProfile, SwagResults, ScenarioResult, BenefitResult, Narrative } from './swag-types'
import { fmtMoney, fmtMoneyCompact, fmtNumber, fmtPct } from './format'

/**
 * Evaluate a formula string with named variables.
 * formulas are trusted (we write them) so Function() is safe here.
 */
function evaluateFormula(formula: string, vars: Record<string, number>): number {
  try {
    const keys = Object.keys(vars)
    const values = Object.values(vars)
    const fn = new Function(...keys, `return ${formula}`)
    const result = fn(...values)
    return Number.isFinite(result) ? result : 0
  } catch {
    return 0
  }
}

/**
 * Build a human-readable formula breakdown string.
 */
function buildBreakdown(
  formula: string,
  vars: Record<string, number>,
  labels: Record<string, string>
): string {
  // Show each variable's value in a readable line
  const parts = Object.entries(vars).map(([key, val]) => {
    const label = labels[key] || key
    const formatted = val < 1 && val > 0
      ? fmtPct(val)
      : val >= 1000
      ? fmtNumber(val)
      : val.toString()
    return `${label}: ${formatted}`
  })
  return parts.join(' · ')
}

/**
 * Compute all SWAG results for a spec + brand profile at multiple accuracy levels.
 */
export function computeSwag(
  spec: SwagSpec,
  profile: BrandProfile
): SwagResults {
  const accuracies = [0.6, 0.8, 1.0]

  const scenarios: ScenarioResult[] = accuracies.map((accuracy) => {
    const benefits: BenefitResult[] = spec.benefits.map((benefit) => {
      // Build the variable map: brand inputs + swag defaults
      const vars: Record<string, number> = {}
      const labels: Record<string, string> = {}

      // Brand inputs
      for (const key of benefit.brandInputs) {
        const profileKey = key as keyof BrandProfile
        const val = profile[profileKey]
        if (typeof val === 'number') {
          vars[key] = val
          labels[key] = key
        }
      }

      // SWAG defaults — resolve byCategory if present
      for (const [key, def] of Object.entries(benefit.swagDefaults)) {
        const categoryValue = def.byCategory?.[profile.primaryCategory]
        vars[key] = categoryValue ?? def.value
        labels[key] = def.label
      }

      const rawValue = evaluateFormula(benefit.formula, vars)
      const annualValue = rawValue * accuracy

      return {
        id: benefit.id,
        label: benefit.label,
        description: benefit.description,
        type: benefit.type,
        annualValue,
        formulaBreakdown: buildBreakdown(benefit.formula, vars, labels),
      }
    })

    const totalAnnualValue = benefits.reduce((sum, b) => sum + b.annualValue, 0)
    const maxAnnualPrice =
      profile.targetRoiMultiple > 0 ? totalAnnualValue / profile.targetRoiMultiple : 0
    const maxMonthlyPrice = maxAnnualPrice / 12

    let actualRoi: number | null = null
    let actualMultiple: number | null = null
    if (spec.pricingMonthly && spec.pricingMonthly > 0) {
      const annualCost = spec.pricingMonthly * 12
      actualMultiple = annualCost > 0 ? totalAnnualValue / annualCost : null
      actualRoi = actualMultiple
    }

    return {
      accuracy,
      benefits,
      totalAnnualValue,
      maxAnnualPrice,
      maxMonthlyPrice,
      actualRoi,
      actualMultiple,
    }
  })

  return {
    scenarios,
    hundred: scenarios[2], // 100% accuracy
  }
}

/**
 * Get the unique brand profile fields needed for a given spec.
 */
export function getRequiredBrandInputs(spec: SwagSpec): string[] {
  const inputs = new Set<string>()
  for (const benefit of spec.benefits) {
    for (const key of benefit.brandInputs) {
      inputs.add(key)
    }
  }
  return Array.from(inputs)
}

/**
 * Build the template variable map for narrative filling.
 */
export function buildTemplateVars(
  spec: SwagSpec,
  profile: BrandProfile,
  results: SwagResults
): Record<string, string> {
  const r = results.hundred
  const vars: Record<string, string> = {
    brandName: profile.brandName || 'Your Brand',
    contactName: profile.contactName || 'your team',
    department: profile.department,
    category: profile.primaryCategory,
    partnerName: spec.partnerName,
    totalValue: fmtMoneyCompact(r.totalAnnualValue),
    totalValueFull: fmtMoney(r.totalAnnualValue),
    maxMonthly: fmtMoney(r.maxMonthlyPrice),
    maxAnnual: fmtMoney(r.maxAnnualPrice),
    targetMultiple: `${profile.targetRoiMultiple}x`,
    benefitCount: `${r.benefits.length}`,
    // Subtotals by type
    costSavingsTotal: fmtMoneyCompact(
      r.benefits.filter((b) => b.type === 'cost-saving').reduce((s, b) => s + b.annualValue, 0)
    ),
    revenueTotal: fmtMoneyCompact(
      r.benefits.filter((b) => b.type === 'revenue-generation').reduce((s, b) => s + b.annualValue, 0)
    ),
    timeSavingsTotal: fmtMoneyCompact(
      r.benefits.filter((b) => b.type === 'time-saving').reduce((s, b) => s + b.annualValue, 0)
    ),
  }
  // Per-benefit values
  for (const b of r.benefits) {
    vars[`benefit_${b.id}`] = fmtMoneyCompact(b.annualValue)
    vars[`benefit_${b.id}_full`] = fmtMoney(b.annualValue)
  }
  return vars
}

/**
 * Fill a template string with variables. {varName} → value.
 */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}

/**
 * Resolve the narrative for a given department and category.
 * Falls back to "Other" if no specific narrative exists.
 */
export function resolveNarrative(
  narrative: Narrative | undefined,
  department: string,
  category: string,
  vars: Record<string, string>
): { headline: string; departmentText: string; categoryText: string } | null {
  if (!narrative) return null

  const headline = fillTemplate(narrative.headline, vars)
  const deptText = narrative.byDepartment[department] || narrative.byDepartment['Other'] || ''
  const catText = narrative.byCategory[category] || narrative.byCategory['Other'] || ''

  return {
    headline: headline,
    departmentText: fillTemplate(deptText, vars),
    categoryText: fillTemplate(catText, vars),
  }
}
