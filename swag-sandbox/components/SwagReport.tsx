'use client'

import { useCallback } from 'react'
import type { SwagSpec, BrandProfile, BenefitType } from '@/lib/swag-types'
import { BENEFIT_TYPE_META } from '@/lib/swag-types'
import type { SwagResults } from '@/lib/swag-types'
import { fmtMoney, fmtMoneyCompact, fmtMultiple } from '@/lib/format'
import { buildTemplateVars, resolveNarrative } from '@/lib/swag-engine'
import AiResearchBar from './AiResearchBar'
import { highlightGreen } from '@/lib/highlight'
import { CountUp, TextScramble } from './AnimatedValue'

function benefitColor(type: BenefitType): string {
  return BENEFIT_TYPE_META[type].color
}

type Props = {
  spec: SwagSpec
  profile: BrandProfile
  results: SwagResults
  customPrice: number | null
  onAskForIntro?: () => void
}

export default function SwagReport({ spec, profile, results, customPrice, onAskForIntro }: Props) {
  const r = results.hundred
  const vars = buildTemplateVars(spec, profile, results)
  const narrative = resolveNarrative(spec.narrative, profile.department, profile.primaryCategory, vars)
  const hp = (text: string) => highlightGreen(text, profile)
  const fmtMoneyCallback = useCallback((n: number) => fmtMoney(n), [])
  const fmtCompactCallback = useCallback((n: number) => fmtMoneyCompact(n), [])

  return (
    <div className="max-w-3xl mx-auto print:max-w-none">
      {/* Brief header with dtcmvp branding */}
      <div className="mb-10 pb-6 border-b border-border print:border-black/10">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2 h-6 rounded-full bg-accent-green" />
          <span className="text-xs uppercase tracking-widest text-accent-green font-grotesk font-semibold">
            dtcmvp SWAG brief
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold font-grotesk mb-3 print:text-black">
          {narrative ? hp(narrative.headline) : (
            <>{spec.partnerName} for <TextScramble text={profile.brandName} className="text-accent-green" interval={10000} /></>
          )}
        </h1>
        <p className="text-sm text-text-muted font-grotesk">
          Prepared by dtcmvp for <TextScramble text={profile.brandName} className="text-accent-green" interval={10000} />
          {profile.contactName ? <> (<TextScramble text={profile.contactName} className="text-accent-green" interval={10000} />)</> : ''}
          {profile.department !== 'Other' ? <> · <TextScramble text={profile.department} className="text-accent-green" interval={10000} /></> : ''}
          {profile.primaryCategory !== 'Other' ? <> · <TextScramble text={profile.primaryCategory} className="text-accent-green" interval={10000} /></> : ''}
        </p>
      </div>

      {/* Break-even ceiling (comes first) */}
      <div className="mb-8 p-6 rounded-xl border-2 border-accent-green/30 bg-accent-green/5 print:border-green-200 print:bg-green-50">
        <div className="text-xs uppercase tracking-widest text-accent-green font-grotesk font-semibold mb-2 print:text-green-700">
          <TextScramble text={profile.brandName} className="text-accent-green" interval={10000} />&apos;s break-even ceiling
        </div>
        <p className="text-sm text-text-secondary font-grotesk mb-2">
          Based on <CountUp value={r.totalAnnualValue} formatter={fmtCompactCallback} className="font-mono text-accent-green" /> in potential annual impact, {profile.brandName} could spend up to this much and still see a {profile.targetRoiMultiple}x return:
        </p>
        <div className="text-4xl font-bold font-mono text-accent-green print:text-green-700">
          <CountUp value={r.maxMonthlyPrice} formatter={fmtMoneyCallback} className="" />/mo
        </div>
        <p className="text-xs text-text-muted font-grotesk mt-1">
          The further below this ceiling your actual cost lands, the stronger your ROI.
        </p>
        {customPrice && customPrice > 0 && (
          <div className="mt-4 pt-4 border-t border-accent-green/20">
            <p className="text-sm text-text-secondary font-grotesk">
              At your quoted price of {fmtMoney(customPrice)}/mo, your ROI would be{' '}
              <span className={`font-mono font-bold ${
                r.totalAnnualValue / (customPrice * 12) >= profile.targetRoiMultiple
                  ? 'text-accent-green'
                  : 'text-accent-orange'
              }`}>
                {fmtMultiple(r.totalAnnualValue / (customPrice * 12))}
              </span>
              {r.totalAnnualValue / (customPrice * 12) >= profile.targetRoiMultiple
                ? ', hits your target.'
                : `, below your ${profile.targetRoiMultiple}x target.`}
            </p>
          </div>
        )}
      </div>

      {/* Category narrative (comes before department) */}
      {narrative && narrative.categoryText && (
        <div className="mb-6">
          <div className="flex gap-3 items-start">
            <div className="w-1 min-h-[24px] rounded-full bg-accent-orange flex-shrink-0 mt-1" />
            <p className="text-base text-text-secondary font-grotesk leading-relaxed">
              {hp(narrative.categoryText)}
            </p>
          </div>
        </div>
      )}

      {/* Department narrative */}
      {narrative && narrative.departmentText && (
        <div className="mb-8">
          <div className="flex gap-3 items-start">
            <div className="w-1 min-h-[24px] rounded-full bg-accent-blue flex-shrink-0 mt-1" />
            <p className="text-base text-text-secondary font-grotesk leading-relaxed">
              {hp(narrative.departmentText)}
            </p>
          </div>
        </div>
      )}

      {/* Value breakdown by type */}
      <div className="mb-8">
        <h2 className="text-sm uppercase tracking-widest text-text-muted font-grotesk font-semibold mb-4">
          Value breakdown
        </h2>
        <div className="space-y-4">
          {r.benefits.map((benefit) => (
            <div key={benefit.id} className="flex items-start gap-4 p-4 rounded-lg bg-bg-secondary print:bg-gray-50 print:border print:border-gray-200">
              <div
                className="w-1 min-h-[40px] rounded-full flex-shrink-0 mt-1"
                style={{ background: benefitColor(benefit.type) }}
              />
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-4 mb-1">
                  <h3 className="text-sm font-grotesk font-semibold text-text-primary print:text-black">
                    {benefit.label}
                  </h3>
                  <span className="text-lg font-mono font-bold text-text-primary tabular-nums print:text-black">
                    <CountUp value={benefit.annualValue} formatter={fmtMoneyCallback} className="" />/yr
                  </span>
                </div>
                <p className="text-xs text-text-secondary font-grotesk leading-relaxed">
                  {benefit.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="text-[10px] uppercase tracking-wider font-grotesk font-semibold px-2 py-0.5 rounded"
                    style={{
                      color: benefitColor(benefit.type),
                      backgroundColor: benefitColor(benefit.type) + '15',
                    }}
                  >
                    {BENEFIT_TYPE_META[benefit.type].label}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-4 flex items-baseline justify-between p-4 rounded-lg bg-accent-green/5 border border-accent-green/20 print:bg-green-50 print:border-green-200">
          <span className="text-sm uppercase tracking-widest text-accent-green font-grotesk font-semibold print:text-green-700">
            Total potential impact
          </span>
          <span className="text-2xl font-mono font-bold text-accent-green tabular-nums print:text-green-700">
            <CountUp value={r.totalAnnualValue} formatter={fmtMoneyCallback} className="" />/yr
          </span>
        </div>
      </div>

      {/* Pricing intel (if available) */}
      {spec.pricingIntel && (
        <div className="mb-8">
          <h2 className="text-sm uppercase tracking-widest text-text-muted font-grotesk font-semibold mb-3">
            Pricing intel ({spec.partnerName})
          </h2>
          <div className="p-4 rounded-lg bg-bg-primary/40 border border-border/50 print:bg-gray-50 print:border-gray-200">
            <p className="text-sm text-text-secondary font-grotesk mb-3">{spec.pricingIntel.summary}</p>
            <div className="grid grid-cols-2 gap-4 text-xs text-text-muted font-mono">
              <div>
                {spec.pricingIntel.details.map((d, i) => (
                  <p key={i}>· {d}</p>
                ))}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-muted font-grotesk mb-1">Cost drivers</p>
                {spec.pricingIntel.costDrivers.map((d, i) => (
                  <p key={i}>· {d}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ask for intro CTA */}
      {onAskForIntro && (
        <div className="mb-8 p-6 rounded-xl border-2 border-accent-green/30 bg-accent-green/5 text-center">
          <h3 className="text-lg font-grotesk font-semibold text-text-primary mb-2">
            Ready to explore {spec.partnerName}?
          </h3>
          <p className="text-sm text-text-secondary font-grotesk mb-4 max-w-md mx-auto">
            dtcmvp will check with {spec.partnerName} to make sure it's a good fit, then connect you directly.
          </p>
          <button onClick={onAskForIntro} className="btn-primary px-8 py-3 text-sm">
            Ask for an intro
          </button>
        </div>
      )}

      {/* AI Research */}
      <div className="mb-8">
        <AiResearchBar spec={spec} profile={profile} results={results} />
      </div>

      {/* Sources */}
      <div className="mb-8">
        <h2 className="text-sm uppercase tracking-widest text-text-muted font-grotesk font-semibold mb-3">
          Sources and methodology
        </h2>
        <div className="text-xs text-text-muted font-grotesk leading-relaxed space-y-1">
          {spec.sources.map((s, i) => (
            <p key={i}>· {s}</p>
          ))}
          {spec.notes && <p className="pt-2">· {spec.notes}</p>}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-6 border-t border-border print:border-black/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-accent-green print:bg-green-500" />
            <span className="text-xs text-text-muted font-grotesk">
              dtcmvp SWAG Directory · {spec.generatedAt}
            </span>
          </div>
          <span className="text-xs text-text-muted font-grotesk">
            Tier {spec.tier} analysis · all SWAGs are editable estimates
          </span>
        </div>
      </div>
    </div>
  )
}
