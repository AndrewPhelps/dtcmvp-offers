/**
 * Deterministic lint for SWAG specs.
 *
 * Runs the checks the /generate-swag skill promises — canonical labels,
 * canonical category/department keys, narrative shape, no em dashes,
 * no AI-speak — so reviewers get a consistent signal before approving.
 *
 * Severity model:
 *   - red    = block-worthy (approve only after fixing)
 *   - yellow = worth a second look but not fatal
 */

import type { SwagSpec, SwagBenefit, SwagResults } from './swag-types'
import {
  CANONICAL_BENEFIT_LABEL_SET,
  ATTRIBUTED_REVENUE_PREFIX,
  CATEGORIES,
  DEPARTMENTS,
} from './swag-types'

export type IssueSeverity = 'red' | 'yellow'

export interface ReviewIssue {
  severity: IssueSeverity
  code: string
  message: string
  // Where in the spec the issue lives, for UI highlighting.
  target?: {
    kind: 'benefit' | 'swagDefault' | 'narrative' | 'sources' | 'notes' | 'meta'
    benefitId?: string
    defaultKey?: string
    field?: string
  }
}

const CATEGORY_SET = new Set<string>(CATEGORIES)
const DEPARTMENT_SET = new Set<string>(DEPARTMENTS)

const AI_SPEAK_WORDS = [
  'leveraging',
  'leverage',
  'utilizing',
  'utilize',
  'comprehensive',
  'seamlessly',
  'seamless',
  'cutting-edge',
  'state-of-the-art',
  'robust',
  'synergy',
  'revolutionary',
  'next-generation',
]

const EM_DASH_RE = /[–—]|--/ // en dash, em dash, or double hyphen

function isCanonicalBenefitLabel(label: string): boolean {
  if (CANONICAL_BENEFIT_LABEL_SET.has(label)) return true
  // Attributed Revenue is templated — it must use the `Attributed Revenue (Channel)` shape.
  if (label.startsWith(ATTRIBUTED_REVENUE_PREFIX)) {
    return /^Attributed Revenue \(.+\)$/.test(label)
  }
  return false
}

function containsEmDashOrDoubleHyphen(text: string): boolean {
  return EM_DASH_RE.test(text)
}

function containsAiSpeak(text: string): string[] {
  const lower = text.toLowerCase()
  return AI_SPEAK_WORDS.filter((w) => {
    // Word-boundary match so "robust" doesn't match "robustly" (it does, but avoid matching inside other words like "corrobust")
    const re = new RegExp(`\\b${w.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i')
    return re.test(lower)
  })
}

function lintBenefit(b: SwagBenefit, issues: ReviewIssue[]): void {
  // 1. Label must be canonical
  if (!isCanonicalBenefitLabel(b.label)) {
    issues.push({
      severity: 'red',
      code: 'benefit.label.nonCanonical',
      message: `Benefit "${b.label}" is not a canonical label. ` +
        (b.label.startsWith(ATTRIBUTED_REVENUE_PREFIX)
          ? 'Attributed Revenue must include a channel in parens, e.g. "Attributed Revenue (SMS)".'
          : 'Use a label from the canonical vocabulary or ask to add one.'),
      target: { kind: 'benefit', benefitId: b.id, field: 'label' },
    })
  }

  // 2. swagDefaults must each carry a source
  for (const [key, def] of Object.entries(b.swagDefaults)) {
    if (!def.source || !def.source.trim()) {
      issues.push({
        severity: 'red',
        code: 'swagDefault.source.missing',
        message: `Benefit "${b.label}": default "${key}" has no source.`,
        target: { kind: 'swagDefault', benefitId: b.id, defaultKey: key },
      })
    }

    // 3. byCategory keys must be canonical
    if (def.byCategory) {
      for (const cat of Object.keys(def.byCategory)) {
        if (!CATEGORY_SET.has(cat)) {
          issues.push({
            severity: 'red',
            code: 'swagDefault.byCategory.nonCanonical',
            message: `Benefit "${b.label}": byCategory key "${cat}" is not a canonical category. ` +
              `Use one of: ${CATEGORIES.join(', ')}.`,
            target: { kind: 'swagDefault', benefitId: b.id, defaultKey: key },
          })
        }
      }
    }
  }

  // 4. Description quality checks (yellow)
  if (b.description) {
    if (containsEmDashOrDoubleHyphen(b.description)) {
      issues.push({
        severity: 'yellow',
        code: 'benefit.description.emDash',
        message: `Benefit "${b.label}" description contains an em dash or double-hyphen (skill forbids).`,
        target: { kind: 'benefit', benefitId: b.id, field: 'description' },
      })
    }
    const aiWords = containsAiSpeak(b.description)
    if (aiWords.length > 0) {
      issues.push({
        severity: 'yellow',
        code: 'benefit.description.aiSpeak',
        message: `Benefit "${b.label}" description contains AI-speak: ${aiWords.join(', ')}.`,
        target: { kind: 'benefit', benefitId: b.id, field: 'description' },
      })
    }
  }
}

function lintNarrative(spec: SwagSpec, issues: ReviewIssue[]): void {
  if (!spec.narrative) {
    issues.push({
      severity: 'red',
      code: 'narrative.missing',
      message: 'Narrative block is missing. Every spec must have a headline + byDepartment + byCategory.',
      target: { kind: 'narrative' },
    })
    return
  }

  if (!spec.narrative.headline || !spec.narrative.headline.trim()) {
    issues.push({
      severity: 'red',
      code: 'narrative.headline.missing',
      message: 'Narrative headline is empty.',
      target: { kind: 'narrative', field: 'headline' },
    })
  } else if (containsEmDashOrDoubleHyphen(spec.narrative.headline)) {
    issues.push({
      severity: 'yellow',
      code: 'narrative.headline.emDash',
      message: 'Headline contains an em dash or double-hyphen (skill forbids).',
      target: { kind: 'narrative', field: 'headline' },
    })
  }

  // byDepartment: must have "Other" fallback and all keys canonical
  const dept = spec.narrative.byDepartment ?? {}
  if (!dept['Other']) {
    issues.push({
      severity: 'red',
      code: 'narrative.byDepartment.otherMissing',
      message: 'narrative.byDepartment is missing the required "Other" fallback.',
      target: { kind: 'narrative', field: 'byDepartment' },
    })
  }
  for (const key of Object.keys(dept)) {
    if (!DEPARTMENT_SET.has(key)) {
      issues.push({
        severity: 'red',
        code: 'narrative.byDepartment.nonCanonical',
        message: `narrative.byDepartment key "${key}" is not a canonical department.`,
        target: { kind: 'narrative', field: 'byDepartment' },
      })
    }
  }

  // byCategory: must have "Other" fallback and all keys canonical
  const cat = spec.narrative.byCategory ?? {}
  if (!cat['Other']) {
    issues.push({
      severity: 'red',
      code: 'narrative.byCategory.otherMissing',
      message: 'narrative.byCategory is missing the required "Other" fallback.',
      target: { kind: 'narrative', field: 'byCategory' },
    })
  }
  for (const key of Object.keys(cat)) {
    if (!CATEGORY_SET.has(key)) {
      issues.push({
        severity: 'red',
        code: 'narrative.byCategory.nonCanonical',
        message: `narrative.byCategory key "${key}" is not a canonical category.`,
        target: { kind: 'narrative', field: 'byCategory' },
      })
    }
  }

  // AI-speak in paragraph copy (yellow)
  for (const [key, text] of Object.entries(dept)) {
    const words = containsAiSpeak(text)
    if (words.length > 0) {
      issues.push({
        severity: 'yellow',
        code: 'narrative.byDepartment.aiSpeak',
        message: `byDepartment["${key}"] contains AI-speak: ${words.join(', ')}.`,
        target: { kind: 'narrative', field: 'byDepartment' },
      })
    }
    if (containsEmDashOrDoubleHyphen(text)) {
      issues.push({
        severity: 'yellow',
        code: 'narrative.byDepartment.emDash',
        message: `byDepartment["${key}"] contains an em dash or double-hyphen.`,
        target: { kind: 'narrative', field: 'byDepartment' },
      })
    }
  }
  for (const [key, text] of Object.entries(cat)) {
    const words = containsAiSpeak(text)
    if (words.length > 0) {
      issues.push({
        severity: 'yellow',
        code: 'narrative.byCategory.aiSpeak',
        message: `byCategory["${key}"] contains AI-speak: ${words.join(', ')}.`,
        target: { kind: 'narrative', field: 'byCategory' },
      })
    }
    if (containsEmDashOrDoubleHyphen(text)) {
      issues.push({
        severity: 'yellow',
        code: 'narrative.byCategory.emDash',
        message: `byCategory["${key}"] contains an em dash or double-hyphen.`,
        target: { kind: 'narrative', field: 'byCategory' },
      })
    }
  }
}

function lintDuplicateLabels(spec: SwagSpec, issues: ReviewIssue[]): void {
  const seen = new Map<string, string>()
  for (const b of spec.benefits) {
    const prior = seen.get(b.label)
    if (prior) {
      issues.push({
        severity: 'red',
        code: 'benefits.duplicateLabel',
        message: `Two benefits share the label "${b.label}" (ids: ${prior}, ${b.id}). ` +
          'Likely overlap — collapse or rename.',
        target: { kind: 'benefit', benefitId: b.id },
      })
    } else {
      seen.set(b.label, b.id)
    }
  }
}

function lintNotesAndSources(spec: SwagSpec, issues: ReviewIssue[]): void {
  if (spec.notes) {
    if (containsEmDashOrDoubleHyphen(spec.notes)) {
      issues.push({
        severity: 'yellow',
        code: 'notes.emDash',
        message: 'Notes contain an em dash or double-hyphen.',
        target: { kind: 'notes' },
      })
    }
    const words = containsAiSpeak(spec.notes)
    if (words.length > 0) {
      issues.push({
        severity: 'yellow',
        code: 'notes.aiSpeak',
        message: `Notes contain AI-speak: ${words.join(', ')}.`,
        target: { kind: 'notes' },
      })
    }
  }

  if (!spec.sources || spec.sources.length === 0) {
    issues.push({
      severity: 'yellow',
      code: 'sources.empty',
      message: 'No sources listed. Every SWAG should cite at least the partner URL.',
      target: { kind: 'sources' },
    })
  }
}

function lintSampleMagnitude(results: SwagResults | null, issues: ReviewIssue[]): void {
  if (!results) return
  const total = results.hundred?.totalAnnualValue
  if (typeof total === 'number' && total > 1_000_000) {
    issues.push({
      severity: 'yellow',
      code: 'total.aboveHeuristic',
      message:
        `Sample-brand total is $${Math.round(total).toLocaleString()} ` +
        '(above the $1M skill heuristic). Make sure the spec\'s notes justify this.',
      target: { kind: 'meta' },
    })
  }
}

export function lintSwagSpec(spec: SwagSpec, results: SwagResults | null = null): ReviewIssue[] {
  const issues: ReviewIssue[] = []
  for (const b of spec.benefits) lintBenefit(b, issues)
  lintDuplicateLabels(spec, issues)
  lintNarrative(spec, issues)
  lintNotesAndSources(spec, issues)
  lintSampleMagnitude(results, issues)
  return issues
}

export function summarizeIssues(issues: ReviewIssue[]): { red: number; yellow: number } {
  return {
    red: issues.filter((i) => i.severity === 'red').length,
    yellow: issues.filter((i) => i.severity === 'yellow').length,
  }
}
