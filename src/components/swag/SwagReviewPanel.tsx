'use client'

import { useMemo, useState } from 'react'
import type { SwagSpec } from '@/lib/swag/swag-types'
import { BENEFIT_TYPE_META, CANONICAL_BENEFIT_LABELS, DEPARTMENTS, CATEGORIES, DEFAULT_BRAND_PROFILE } from '@/lib/swag/swag-types'
import { computeSwag } from '@/lib/swag/swag-engine'
import { lintSwagSpec, summarizeIssues, type ReviewIssue } from '@/lib/swag/review'
import { fmtMoney, fmtMoneyCompact, fmtNumber, fmtPct } from '@/lib/swag/format'

type Props = {
  spec: SwagSpec
}

// The 8-item checklist mirrors the review rubric we established.
const CHECKLIST: { id: string; label: string }[] = [
  { id: 'headline', label: 'Headline actually describes what the partner does' },
  { id: 'canonical-labels', label: 'Benefit labels are all canonical (see reference below)' },
  { id: 'overlap', label: 'Each benefit targets a different audience OR mechanism' },
  { id: 'defaults-reasonable', label: 'SWAG defaults are mid-range of case studies, not partner headlines' },
  { id: 'bycategory', label: 'byCategory tiers match the case-study evidence' },
  { id: 'sources', label: 'Every default has a real source (not just "dtcmvp estimate" with no anchor)' },
  { id: 'notes-confidence', label: 'Notes call out confidence and any caveats honestly' },
  { id: 'sanity', label: 'Sample-brand total passes the smell test for the partner\'s category' },
]

function severityClass(severity: 'red' | 'yellow'): string {
  return severity === 'red'
    ? 'bg-red-500/10 text-red-300 border border-red-500/40'
    : 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/40'
}

function severityDot(severity: 'red' | 'yellow'): string {
  return severity === 'red' ? 'bg-red-400' : 'bg-yellow-400'
}

function formatValue(value: number): string {
  if (value > 0 && value < 1) return fmtPct(value)
  if (value >= 1000) return fmtNumber(value)
  return value.toString()
}

export default function SwagReviewPanel({ spec }: Props) {
  // Use the canonical sample brand so derivation numbers are consistent
  // with the skill's sanity-check convention (250k orders, $120 AOV).
  const profile = useMemo(() => ({ ...DEFAULT_BRAND_PROFILE }), [])
  const results = useMemo(() => computeSwag(spec, profile), [spec, profile])
  const issues = useMemo(() => lintSwagSpec(spec, results), [spec, results])
  const summary = useMemo(() => summarizeIssues(issues), [issues])
  const r = results.hundred
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [showReference, setShowReference] = useState(false)

  // Index issues by benefit for inline display
  const issuesByBenefit = useMemo(() => {
    const map = new Map<string, ReviewIssue[]>()
    for (const issue of issues) {
      const id = issue.target?.benefitId
      if (id) {
        const list = map.get(id) ?? []
        list.push(issue)
        map.set(id, list)
      }
    }
    return map
  }, [issues])

  const narrativeIssues = issues.filter((i) => i.target?.kind === 'narrative')
  const globalIssues = issues.filter(
    (i) => !i.target?.benefitId && i.target?.kind !== 'narrative',
  )

  const toggleCheck = (id: string) =>
    setCheckedItems((s) => ({ ...s, [id]: !s[id] }))

  return (
    <div className="border border-[var(--border-default)] rounded-xl bg-[var(--bg-card)] mb-6">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-[var(--border-default)]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg md:text-xl font-semibold">Review panel</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Derivation, canonical-label lints, and a reviewer checklist. Scroll below for the live calculator.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${summary.red > 0 ? severityClass('red') : 'bg-[var(--bg-card-hover)] text-[var(--text-secondary)] border border-[var(--border-default)]'}`}>
              {summary.red} red
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${summary.yellow > 0 ? severityClass('yellow') : 'bg-[var(--bg-card-hover)] text-[var(--text-secondary)] border border-[var(--border-default)]'}`}>
              {summary.yellow} yellow
            </span>
          </div>
        </div>
      </div>

      {/* Lint issues */}
      {(globalIssues.length > 0 || narrativeIssues.length > 0) && (
        <div className="p-4 md:p-6 border-b border-[var(--border-default)]">
          <h3 className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold mb-3">
            Lint issues (global)
          </h3>
          <ul className="space-y-2">
            {[...globalIssues, ...narrativeIssues].map((issue, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${severityDot(issue.severity)}`} />
                <div>
                  <span className="text-[var(--text-primary)]">{issue.message}</span>
                  <span className="ml-2 text-[10px] font-mono text-[var(--text-tertiary)]">{issue.code}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Derivation per benefit */}
      <div className="p-4 md:p-6 border-b border-[var(--border-default)]">
        <h3 className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold mb-4">
          Derivation ({spec.benefits.length} benefit{spec.benefits.length === 1 ? '' : 's'})
        </h3>
        <div className="space-y-6">
          {spec.benefits.map((benefit) => {
            const result = r.benefits.find((x) => x.id === benefit.id)
            const benefitIssues = issuesByBenefit.get(benefit.id) ?? []
            const typeMeta = BENEFIT_TYPE_META[benefit.type]
            return (
              <div key={benefit.id} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-body)]/40 p-4">
                <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-5 rounded" style={{ background: typeMeta.color }} />
                    <h4 className="text-base font-semibold text-[var(--text-primary)]">{benefit.label}</h4>
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ color: typeMeta.color, backgroundColor: typeMeta.color + '15' }}>
                      {typeMeta.label}
                    </span>
                  </div>
                  {result && (
                    <span className="text-base font-mono font-semibold tabular-nums">
                      {fmtMoney(result.annualValue)}/yr
                    </span>
                  )}
                </div>

                <p className="text-sm text-[var(--text-secondary)] mb-3">{benefit.description}</p>

                <div className="mb-3">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold mb-1">Formula</div>
                  <code className="block text-xs font-mono bg-[var(--bg-card)] border border-[var(--border-default)] rounded px-3 py-2 text-[var(--text-primary)] break-all">
                    {benefit.formula}
                  </code>
                  {result?.formulaBreakdown && (
                    <div className="mt-2 text-[11px] font-mono text-[var(--text-secondary)] leading-relaxed">
                      {result.formulaBreakdown}
                    </div>
                  )}
                </div>

                {/* Brand inputs */}
                {benefit.brandInputs.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold mb-1">
                      Brand inputs (from profile)
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {benefit.brandInputs.map((k) => (
                        <span key={k} className="inline-block mr-3 font-mono">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* SWAG defaults */}
                <div className="mb-3">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold mb-1">
                    SWAG defaults
                  </div>
                  <div className="space-y-2">
                    {Object.entries(benefit.swagDefaults).map(([key, def]) => {
                      const resolved = def.byCategory?.[profile.primaryCategory] ?? def.value
                      const categoryOverride = def.byCategory?.[profile.primaryCategory] !== undefined
                      return (
                        <div key={key} className="text-xs border border-[var(--border-default)] rounded px-3 py-2 bg-[var(--bg-card)]">
                          <div className="flex items-baseline justify-between gap-2 flex-wrap">
                            <div className="font-mono text-[var(--text-primary)]">
                              {key} = {formatValue(resolved)}
                              {categoryOverride && (
                                <span className="ml-2 text-[10px] text-[var(--brand-green-primary)] font-sans">
                                  (adjusted for {profile.primaryCategory})
                                </span>
                              )}
                            </div>
                            <div className="text-[var(--text-secondary)] font-sans">{def.label}</div>
                          </div>
                          <div className="mt-1 text-[var(--text-tertiary)] font-sans leading-relaxed">
                            {def.source || <span className="text-red-400">NO SOURCE</span>}
                          </div>
                          {def.byCategory && (
                            <div className="mt-2 text-[10px] font-mono text-[var(--text-tertiary)]">
                              byCategory: {Object.entries(def.byCategory).map(([c, v]) => `${c}=${formatValue(v)}`).join(' · ')}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Benefit-specific lint issues */}
                {benefitIssues.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-default)]">
                    <ul className="space-y-1">
                      {benefitIssues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${severityDot(issue.severity)}`} />
                          <span className="text-[var(--text-secondary)]">{issue.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Total */}
        <div className="mt-4 flex items-baseline justify-between px-3 py-2 rounded-lg border border-[var(--brand-green-primary)]/30 bg-[var(--brand-green-primary)]/5">
          <span className="text-xs uppercase tracking-widest text-[var(--brand-green-primary)] font-semibold">
            Sample-brand total ({fmtNumber(profile.annualOrders)} orders · {fmtMoney(profile.aov)} AOV · {profile.primaryCategory})
          </span>
          <span className="text-lg font-mono font-bold text-[var(--brand-green-primary)] tabular-nums">
            {fmtMoneyCompact(r.totalAnnualValue)}/yr
          </span>
        </div>
      </div>

      {/* Sources + notes */}
      <div className="p-4 md:p-6 border-b border-[var(--border-default)]">
        <h3 className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold mb-3">
          Sources & notes
        </h3>
        {spec.sources.length > 0 ? (
          <ul className="text-xs text-[var(--text-secondary)] space-y-1 mb-3">
            {spec.sources.map((s, i) => <li key={i}>· {s}</li>)}
          </ul>
        ) : (
          <p className="text-xs text-yellow-300">No sources listed.</p>
        )}
        {spec.notes && (
          <div className="text-xs text-[var(--text-primary)] pt-3 border-t border-[var(--border-default)] leading-relaxed">
            <span className="text-[var(--text-tertiary)] font-semibold">Notes: </span>{spec.notes}
          </div>
        )}
      </div>

      {/* Checklist */}
      <div className="p-4 md:p-6 border-b border-[var(--border-default)]">
        <h3 className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold mb-3">
          Reviewer checklist
        </h3>
        <ul className="space-y-2">
          {CHECKLIST.map((item) => (
            <li key={item.id} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={Boolean(checkedItems[item.id])}
                onChange={() => toggleCheck(item.id)}
                className="mt-1 w-4 h-4 cursor-pointer accent-[var(--brand-green-primary)]"
                id={`chk-${item.id}`}
              />
              <label htmlFor={`chk-${item.id}`} className="text-sm text-[var(--text-primary)] cursor-pointer select-none">
                {item.label}
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[10px] text-[var(--text-tertiary)]">
          Checks reset on modal close — intended as a working memory while you review, not persisted state.
        </p>
      </div>

      {/* Canonical reference (collapsed by default) */}
      <div className="p-4 md:p-6">
        <button
          onClick={() => setShowReference((s) => !s)}
          className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold hover:text-[var(--text-primary)] transition-colors"
        >
          <span>{showReference ? '▾' : '▸'}</span>
          Canonical reference (labels, categories, departments)
        </button>
        {showReference && (
          <div className="mt-3 space-y-4 text-xs">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold mb-1">
                Benefit labels (revenue-generation)
              </div>
              <div className="font-mono text-[var(--text-secondary)]">
                {CANONICAL_BENEFIT_LABELS['revenue-generation'].join(' · ')}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold mb-1">
                Benefit labels (cost-saving)
              </div>
              <div className="font-mono text-[var(--text-secondary)]">
                {CANONICAL_BENEFIT_LABELS['cost-saving'].join(' · ')}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold mb-1">
                Benefit labels (time-saving)
              </div>
              <div className="font-mono text-[var(--text-secondary)]">
                {CANONICAL_BENEFIT_LABELS['time-saving'].join(' · ')}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold mb-1">
                Categories
              </div>
              <div className="font-mono text-[var(--text-secondary)]">
                {CATEGORIES.join(' · ')}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold mb-1">
                Departments
              </div>
              <div className="font-mono text-[var(--text-secondary)]">
                {DEPARTMENTS.join(' · ')}
              </div>
            </div>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Attributed Revenue must include a channel in parens, e.g. "Attributed Revenue (SMS)" — lint will flag the bare form.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
