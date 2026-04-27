'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { SwagSpec, BrandProfile, BenefitType, BenefitResult, Department, Category } from '@/lib/swag/swag-types'
import { DEFAULT_BRAND_PROFILE, BENEFIT_TYPE_META, DEPARTMENTS, CATEGORIES, CATEGORY_OVERRIDES } from '@/lib/swag/swag-types'
import CustomDropdown from './CustomDropdown'
import { computeSwag, getRequiredBrandInputs, buildTemplateVars, resolveNarrative } from '@/lib/swag/swag-engine'
import { highlightGreen } from '@/lib/swag/highlight'
import { fmtMoney, fmtMoneyCompact, fmtNumber, fmtMultiple } from '@/lib/swag/format'
import InputField from './InputField'
import InputSection from './InputSection'
import DerivedField from './DerivedField'
import AdminToolbar from './AdminToolbar'
import SwagReport from './SwagReport'
import SwagLoader from './SwagLoader'
import SwagDisclaimer from './SwagDisclaimer'
import AskForIntroModal from './AskForIntroModal'
import ProjectionChart from './ProjectionChart'
import type { ProjectionMetric } from './ProjectionChart'
import { useAuth } from '@/contexts/AuthContext'
import { submitIntroRequest } from '@/lib/api'

// Per-benefit colors: shades within each type so stacked bars are readable
const BENEFIT_PALETTE: Record<BenefitType, string[]> = {
  'cost-saving': ['#70a1ff', '#94baff', '#b6ceff', '#5a8de8'],
  'revenue-generation': ['#7bed9f', '#2ed573', '#1abc6e', '#a8f0c0'],
  'time-saving': ['#ffa502', '#ffba3d', '#ffd070', '#e89100'],
}
const benefitColorCounters: Record<BenefitType, number> = {
  'cost-saving': 0, 'revenue-generation': 0, 'time-saving': 0,
}

function benefitColor(type: BenefitType, index?: number): string {
  if (index !== undefined) {
    return BENEFIT_PALETTE[type][index % BENEFIT_PALETTE[type].length]
  }
  return BENEFIT_TYPE_META[type].color
}

function groupByType(benefits: BenefitResult[]): { type: BenefitType; items: BenefitResult[]; subtotal: number }[] {
  const order: BenefitType[] = ['cost-saving', 'time-saving', 'revenue-generation']
  const groups: Record<BenefitType, BenefitResult[]> = {
    'cost-saving': [],
    'time-saving': [],
    'revenue-generation': [],
  }
  for (const b of benefits) groups[b.type].push(b)
  return order
    .filter((t) => groups[t].length > 0)
    .map((type) => ({
      type,
      items: groups[type],
      subtotal: groups[type].reduce((s, b) => s + b.annualValue, 0),
    }))
}

export default function SwagCalculator({ spec }: { spec: SwagSpec }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<BrandProfile>(DEFAULT_BRAND_PROFILE)

  useEffect(() => {
    if (user?.email) {
      setProfile((s) => (s.contactEmail ? s : { ...s, contactEmail: user.email }))
    }
  }, [user?.email])

  const [swagOverrides, setSwagOverrides] = useState<Record<string, number>>({})
  const [customPrice, setCustomPrice] = useState<number | null>(null)
  const [view, setView] = useState<'swag' | 'brief' | 'inputs'>('swag')
  const [showLoader, setShowLoader] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [showIntroModal, setShowIntroModal] = useState(false)
  const [projectionOpen, setProjectionOpen] = useState(true)
  const [hoveredBar, setHoveredBar] = useState<string | null>(null)
  const tabRowRef = useRef<HTMLDivElement>(null)
  const inlineBtnRef = useRef<HTMLButtonElement>(null)
  const [ctaFixed, setCtaFixed] = useState(false)
  const [ctaRight, setCtaRight] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      if (tabRowRef.current) {
        const rect = tabRowRef.current.getBoundingClientRect()
        setCtaFixed(rect.bottom < 50)
      }
    }
    const handleResize = () => {
      if (inlineBtnRef.current) {
        const rect = inlineBtnRef.current.getBoundingClientRect()
        setCtaRight(window.innerWidth - rect.right)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)
    handleScroll()
    handleResize()
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [])
  const [swagScaleOpen, setSwagScaleOpen] = useState(true)
  const [breakdownOpen, setBreakdownOpen] = useState(true)

  const results = useMemo(() => {
    // Build a modified spec with any SWAG overrides applied.
    // User override wins over byCategory — we strip byCategory when overriding.
    const modSpec: SwagSpec = {
      ...spec,
      benefits: spec.benefits.map((b) => ({
        ...b,
        swagDefaults: Object.fromEntries(
          Object.entries(b.swagDefaults).map(([k, v]) => [
            k,
            swagOverrides[`${b.id}.${k}`] !== undefined
              ? { ...v, value: swagOverrides[`${b.id}.${k}`], byCategory: undefined }
              : v,
          ])
        ),
      })),
    }
    return computeSwag(modSpec, profile)
  }, [spec, profile, swagOverrides])

  const r = results.hundred
  const requiredInputs = useMemo(() => getRequiredBrandInputs(spec), [spec])

  // Projection chart metrics: compute monthly baseline and total lift %
  const projectionMetrics = useMemo((): ProjectionMetric[] => {
    const baseMonthlyRevenue = (profile.annualOrders * profile.aov) / 12
    if (baseMonthlyRevenue <= 0 || r.totalAnnualValue <= 0) return []
    const totalAnnualRevenue = profile.annualOrders * profile.aov
    const liftPct = r.totalAnnualValue / totalAnnualRevenue
    return [{
      label: 'Monthly revenue',
      baseMonthly: baseMonthlyRevenue,
      liftPct,
      liftLabel: `with ${spec.partnerName}`,
    }]
  }, [profile.annualOrders, profile.aov, r.totalAnnualValue, spec.partnerName])

  const templateVars = useMemo(
    () => buildTemplateVars(spec, profile, results),
    [spec, profile, results]
  )
  const narrative = useMemo(
    () => resolveNarrative(spec.narrative, profile.department, profile.primaryCategory, templateVars),
    [spec.narrative, profile.department, profile.primaryCategory, templateVars]
  )

  const updateProfile = <K extends keyof BrandProfile>(key: K) => (v: number) =>
    setProfile((s) => ({ ...s, [key]: v }))

  const updatePctProfile = <K extends keyof BrandProfile>(key: K) => (v: number) =>
    setProfile((s) => ({ ...s, [key]: v / 100 }))

  const updateSwag = (benefitId: string, key: string) => (v: number) =>
    setSwagOverrides((s) => ({ ...s, [`${benefitId}.${key}`]: v }))

  // Chart data
  const chartData = results.scenarios.map((s) => {
    const row: Record<string, string | number> = {
      name: `${Math.round(s.accuracy * 100)}% confidence`,
    }
    s.benefits.forEach((b) => {
      row[b.label] = Math.round(b.annualValue)
    })
    return row
  })

  return (
    <>
      {process.env.NODE_ENV === 'development' && (
        <AdminToolbar
          currentSlug={spec.slug}
          onTriggerLoader={() => setShowLoader(true)}
        />
      )}
      {showLoader && (
        <SwagLoader
          profile={profile}
          partnerName={spec.partnerName}
          onComplete={() => {
            setShowLoader(false)
            const skip = typeof window !== 'undefined' && localStorage.getItem('swag-skip-disclaimer') === 'true'
            if (!skip) setShowDisclaimer(true)
          }}
        />
      )}
      {showDisclaimer && (
        <SwagDisclaimer
          partnerName={spec.partnerName}
          onAccept={() => setShowDisclaimer(false)}
        />
      )}
      {showIntroModal && (
        <AskForIntroModal
          partnerName={spec.partnerName}
          profile={profile}
          results={results}
          onClose={() => setShowIntroModal(false)}
          onSubmit={(email) => {
            const r = results.hundred
            console.log('[intro] submitting', {
              partnerSlug: spec.slug,
              partnerName: spec.partnerName,
              email,
              brandName: profile.brandName,
            })
            submitIntroRequest({
              partnerSlug: spec.slug,
              partnerName: spec.partnerName,
              email,
              brandProfile: {
                brandName: profile.brandName,
                contactName: profile.contactName,
                department: profile.department,
                primaryCategory: profile.primaryCategory,
                targetRoiMultiple: profile.targetRoiMultiple,
              },
              swagSummary: {
                totalAnnualValue: r.totalAnnualValue,
                maxMonthlyPrice: r.maxMonthlyPrice,
              },
            })
              .then(() => console.log('[intro] submitted ok'))
              .catch((err) => console.error('[intro] submit failed', err))
          }}
        />
      )}

      <main className="min-h-screen px-6 pt-20 pb-10 max-w-[1400px] mx-auto">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            <span className="text-xs uppercase tracking-widest text-text-muted font-grotesk">
              {spec.partnerName} · dtcmvp SWAG · tier {spec.tier}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-grotesk mb-2 text-balance">
            {narrative ? (
              <>{highlightGreen(narrative.headline, profile)}</>
            ) : (
              <>Here&apos;s what {spec.partnerName} is worth to{' '}
              <span className="text-accent-green">{profile.brandName}</span>.</>
            )}
          </h1>
          <p className="text-lg text-text-secondary font-grotesk max-w-2xl mb-4">
            {spec.tagline}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-x-2 gap-y-1 flex-wrap text-xs text-text-muted font-mono">
              <span className="whitespace-nowrap">{fmtNumber(profile.annualOrders)} orders/yr</span>
              <span className="text-border">·</span>
              <span className="whitespace-nowrap">{fmtMoney(profile.aov)} AOV</span>
              <span className="text-border">·</span>
              <span className="whitespace-nowrap">{fmtNumber(profile.monthlyWebTraffic)} visits/mo</span>
              <span className="text-border">·</span>
              <span className="whitespace-nowrap">{profile.targetRoiMultiple}x target</span>
              {profile.primaryCategory !== 'Other' && (
                <>
                  <span className="text-border">·</span>
                  <span className="whitespace-nowrap">{profile.primaryCategory}</span>
                </>
              )}
            </div>
            <button
              onClick={() => setView('inputs')}
              aria-label="Edit brand profile"
              className="text-text-muted hover:text-text-primary hover:underline inline-flex items-center gap-1 text-xs font-grotesk"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
              </svg>
              <span>Edit</span>
            </button>
          </div>
        </header>

        {/* Tab toggle + CTA — stack on mobile so the CTA gets its own full-width row */}
        <div ref={tabRowRef} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div className="flex gap-1 p-1 bg-bg-secondary rounded-lg w-fit">
            {(['swag', 'brief', 'inputs'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setView(tab)}
                className={`px-4 py-2 rounded-md text-xs font-grotesk font-semibold uppercase tracking-wider transition-all ${
                  view === tab
                    ? 'bg-accent-green text-[#0f172a]'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {tab === 'swag' ? 'SWAG' : tab === 'brief' ? 'Brief' : 'Input'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowIntroModal(true)}
            ref={inlineBtnRef}
            className="group btn-primary px-5 py-2 text-sm flex items-center justify-center gap-2 whitespace-nowrap w-full md:w-auto print:hidden"
          >
            Ask for an intro
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="arrow-nudge">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Fixed CTA - appears when tab row scrolls off screen */}
        {ctaFixed && (
          <button
            onClick={() => setShowIntroModal(true)}
            className="group sticky top-0 z-40 btn-primary px-5 py-2 text-sm flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-accent-green/20 print:hidden ml-auto"
          >
            Ask for an intro
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="arrow-nudge">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {view === 'brief' ? (
          <SwagReport spec={spec} profile={profile} results={results} customPrice={customPrice} onAskForIntro={() => setShowIntroModal(true)} />
        ) : view === 'inputs' ? (
          /* Inputs tab: full-width version of the sidebar */
          <div className="max-w-xl mx-auto">
            <InputSection
              title="Brand Profile"
              subtitle="Your store's metrics, reusable across every SWAG"
              accent="green"
              defaultOpen={true}
            >
              <div>
                <label className="block text-xs font-grotesk text-text-secondary mb-1.5">Brand name</label>
                <input
                  type="text"
                  value={profile.brandName}
                  onChange={(e) => setProfile((s) => ({ ...s, brandName: e.target.value }))}
                  placeholder="Your Brand"
                  className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-grotesk transition-all outline-none focus:border-accent-green"
                />
              </div>
              <div>
                <label className="block text-xs font-grotesk text-text-secondary mb-1.5">Contact name</label>
                <input
                  type="text"
                  value={profile.contactName}
                  onChange={(e) => setProfile((s) => ({ ...s, contactName: e.target.value }))}
                  placeholder="Your name"
                  className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-grotesk transition-all outline-none focus:border-accent-green"
                />
              </div>
              <div>
                <label className="block text-xs font-grotesk text-text-secondary mb-1.5">Contact email</label>
                <input
                  type="email"
                  value={profile.contactEmail}
                  onChange={(e) => setProfile((s) => ({ ...s, contactEmail: e.target.value }))}
                  placeholder="you@yourbrand.com"
                  className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-grotesk transition-all outline-none focus:border-accent-green"
                />
              </div>
              <CustomDropdown
                label="Department"
                value={profile.department}
                options={DEPARTMENTS}
                onChange={(v) => setProfile((s) => ({ ...s, department: v as Department }))}
              />
              <CustomDropdown
                label="Category"
                value={profile.primaryCategory}
                options={CATEGORIES}
                onChange={(v) => {
                  const cat = v as Category
                  const overrides = CATEGORY_OVERRIDES[cat] || {}
                  setProfile((s) => ({ ...s, primaryCategory: cat, ...overrides }))
                }}
                hint={CATEGORY_OVERRIDES[profile.primaryCategory as Category] ? `adjusted defaults for ${profile.primaryCategory}` : undefined}
              />
              <div className="pt-1 border-t border-border" />
              <InputField label="Annual order volume" value={profile.annualOrders} onChange={updateProfile('annualOrders')} step={1000} />
              <InputField label="Average order value (AOV)" value={profile.aov} onChange={updateProfile('aov')} prefix="$" step={1} />
              <InputField label="Monthly web traffic" value={profile.monthlyWebTraffic} onChange={updateProfile('monthlyWebTraffic')} step={5000} />
              <InputField label="Return rate" value={profile.returnRate * 100} onChange={updatePctProfile('returnRate')} suffix="%" step={0.5} decimals={2} />
              <InputField label="Avg cost per item" value={profile.avgCostPerItem} onChange={updateProfile('avgCostPerItem')} prefix="$" step={5} />
              <InputField label="Email list size" value={profile.emailListSize} onChange={updateProfile('emailListSize')} step={1000} />
              <InputField label="SMS list size" value={profile.smsListSize} onChange={updateProfile('smsListSize')} step={1000} />
              <div className="pt-1 border-t border-border" />
              <InputField label="Target ROI multiple" value={profile.targetRoiMultiple} onChange={updateProfile('targetRoiMultiple')} suffix="x" step={1} hint="'I want Nx return on my tools'" />
            </InputSection>

            {/* SWAG Defaults */}
            {spec.benefits.map((benefit) => (
              <div key={benefit.id} className="mt-4">
                <InputSection
                  title={benefit.label}
                  subtitle="dtcmvp SWAGs, override if you know yours"
                  accent="blue"
                  defaultOpen={false}
                >
                  {Object.entries(benefit.swagDefaults).map(([key, def]) => {
                    const overrideKey = `${benefit.id}.${key}`
                    const categoryValue = def.byCategory?.[profile.primaryCategory]
                    const effectiveDefault = categoryValue ?? def.value
                    const currentVal = swagOverrides[overrideKey] ?? effectiveDefault
                    const isPercent = currentVal <= 1 && def.label.toLowerCase().includes('%')
                    const hint = categoryValue !== undefined
                      ? `adjusted for ${profile.primaryCategory} · ${def.source}`
                      : def.source
                    return (
                      <InputField
                        key={key}
                        label={def.label}
                        value={isPercent ? currentVal * 100 : currentVal}
                        onChange={(v) => { updateSwag(benefit.id, key)(isPercent ? v / 100 : v) }}
                        suffix={isPercent ? '%' : undefined}
                        prefix={!isPercent && currentVal >= 1 ? '$' : undefined}
                        step={isPercent ? 1 : 0.5}
                        accentColor="blue"
                        hint={hint}
                      />
                    )
                  })}
                </InputSection>
              </div>
            ))}
          </div>
        ) : (

        <div className="max-w-3xl mx-auto">
          {/* ─── OUTPUTS ─────────────────────── */}
          {false && <aside className="space-y-4 hidden">
            {/* Brand Profile */}
            <InputSection
              title="Brand Profile"
              subtitle="Your store's metrics, reusable across every SWAG"
              accent="green"
            >
              {/* Identity fields */}
              <div>
                <label className="block text-xs font-grotesk text-text-secondary mb-1.5">Brand name</label>
                <input
                  type="text"
                  value={profile.brandName}
                  onChange={(e) => setProfile((s) => ({ ...s, brandName: e.target.value }))}
                  placeholder="Your Brand"
                  className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-grotesk transition-all outline-none focus:border-accent-green"
                />
              </div>
              <div>
                <label className="block text-xs font-grotesk text-text-secondary mb-1.5">Contact name</label>
                <input
                  type="text"
                  value={profile.contactName}
                  onChange={(e) => setProfile((s) => ({ ...s, contactName: e.target.value }))}
                  placeholder="Your name"
                  className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-grotesk transition-all outline-none focus:border-accent-green"
                />
              </div>
              <CustomDropdown
                label="Department"
                value={profile.department}
                options={DEPARTMENTS}
                onChange={(v) => setProfile((s) => ({ ...s, department: v as Department }))}
              />
              <CustomDropdown
                label="Category"
                value={profile.primaryCategory}
                options={CATEGORIES}
                onChange={(v) => {
                  const cat = v as Category
                  const overrides = CATEGORY_OVERRIDES[cat] || {}
                  setProfile((s) => ({
                    ...s,
                    primaryCategory: cat,
                    ...overrides,
                  }))
                }}
                hint={CATEGORY_OVERRIDES[profile.primaryCategory as Category] ? `adjusted defaults for ${profile.primaryCategory}` : undefined}
              />

              {/* Divider before numeric inputs */}
              <div className="pt-1 border-t border-border" />

              {requiredInputs.includes('annualOrders') && (
                <InputField
                  label="Annual order volume"
                  value={profile.annualOrders}
                  onChange={updateProfile('annualOrders')}
                  step={1000}
                />
              )}
              {requiredInputs.includes('aov') && (
                <InputField
                  label="Average order value (AOV)"
                  value={profile.aov}
                  onChange={updateProfile('aov')}
                  prefix="$"
                  step={1}
                />
              )}
              {requiredInputs.includes('monthlyWebTraffic') && (
                <InputField
                  label="Monthly web traffic"
                  value={profile.monthlyWebTraffic}
                  onChange={updateProfile('monthlyWebTraffic')}
                  step={5000}
                />
              )}
              {requiredInputs.includes('returnRate') && (
                <>
                  <InputField
                    label="Return rate"
                    value={profile.returnRate * 100}
                    onChange={updatePctProfile('returnRate')}
                    suffix="%"
                    step={0.5}
                    decimals={2}
                  />
                  <DerivedField
                    label="Annual return volume"
                    value={fmtNumber(Math.round(profile.annualOrders * profile.returnRate))}
                    hint="orders × return rate"
                  />
                </>
              )}
              {requiredInputs.includes('avgCostPerItem') && (
                <InputField
                  label="Avg cost per item"
                  value={profile.avgCostPerItem}
                  onChange={updateProfile('avgCostPerItem')}
                  prefix="$"
                  step={5}
                />
              )}
              {requiredInputs.includes('emailListSize') && (
                <InputField
                  label="Email list size"
                  value={profile.emailListSize}
                  onChange={updateProfile('emailListSize')}
                  step={1000}
                />
              )}
              {requiredInputs.includes('smsListSize') && (
                <InputField
                  label="SMS list size"
                  value={profile.smsListSize}
                  onChange={updateProfile('smsListSize')}
                  step={1000}
                />
              )}

              {/* Target ROI — always shown */}
              <div className="pt-2 border-t border-border">
                <InputField
                  label="Target ROI multiple"
                  value={profile.targetRoiMultiple}
                  onChange={updateProfile('targetRoiMultiple')}
                  suffix="x"
                  step={1}
                  hint="'I want Nx return on my tools'"
                />
              </div>
            </InputSection>

            {/* SWAG Defaults — one section per benefit */}
            {spec.benefits.map((benefit, bi) => (
              <InputSection
                key={benefit.id}
                title={benefit.label}
                subtitle="dtcmvp SWAGs — override if you know yours"
                accent="blue"
                defaultOpen={false}
              >
                {Object.entries(benefit.swagDefaults).map(([key, def]) => {
                  const overrideKey = `${benefit.id}.${key}`
                  const currentVal = swagOverrides[overrideKey] ?? def.value
                  const isPercent = currentVal <= 1 && def.label.toLowerCase().includes('%')

                  return (
                    <div key={key}>
                      <InputField
                        label={def.label}
                        value={isPercent ? currentVal * 100 : currentVal}
                        onChange={(v) => {
                          const actual = isPercent ? v / 100 : v
                          updateSwag(benefit.id, key)(actual)
                        }}
                        suffix={isPercent ? '%' : undefined}
                        prefix={!isPercent && currentVal >= 1 ? '$' : undefined}
                        step={isPercent ? 1 : 0.5}
                        accentColor="blue"
                        hint={def.source}
                      />
                    </div>
                  )
                })}
              </InputSection>
            ))}
          </aside>}

          <section className="space-y-6 min-w-0">
            {/* ── Hero: Target ROI flip (THE headline) ── */}
            <div className="metric-card relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-[0.08] pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 30% 20%, #7bed9f 0%, transparent 60%)',
                }}
              />
              <div className="relative">
                <div className="text-xs uppercase tracking-widest text-accent-green font-grotesk mb-2 font-semibold">
                  Your break-even ceiling
                </div>
                <p className="text-sm text-text-secondary font-grotesk mb-3 max-w-sm">
                  Based on {fmtMoneyCompact(r.totalAnnualValue)} in potential annual impact at a <span className="text-accent-green font-mono font-semibold">{profile.targetRoiMultiple}x</span> target:
                </p>
                <div className="flex items-baseline gap-3 flex-wrap mb-1">
                  <span className="text-5xl md:text-6xl font-bold font-mono text-accent-green tabular-nums">
                    {fmtMoney(r.maxMonthlyPrice)}/mo
                  </span>
                </div>
                <p className="text-xs text-text-muted font-grotesk mb-1">
                  The further below this ceiling your actual cost lands, the stronger your ROI.
                </p>
                {/* Impact breakdown by type */}
                <div className="flex flex-wrap gap-3 mb-4">
                  {groupByType(r.benefits).map((g) => (
                    <div
                      key={g.type}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                      style={{ borderColor: BENEFIT_TYPE_META[g.type].color + '40' }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ background: BENEFIT_TYPE_META[g.type].color }} />
                      <span className="text-xs font-grotesk" style={{ color: BENEFIT_TYPE_META[g.type].color }}>
                        {BENEFIT_TYPE_META[g.type].label}
                      </span>
                      <span className="text-sm font-mono font-semibold" style={{ color: BENEFIT_TYPE_META[g.type].color }}>
                        {fmtMoneyCompact(g.subtotal)}/yr
                      </span>
                    </div>
                  ))}
                </div>

                {/* "If I paid $X" interactive field */}
                <div className="bg-bg-primary/50 rounded-lg p-4 border border-border">
                  <label className="block text-xs font-grotesk text-text-secondary mb-2">
                    If I paid...
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-mono text-sm pointer-events-none">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="enter your quote"
                        value={customPrice ?? ''}
                        onChange={(e) => {
                          const n = parseFloat(e.target.value)
                          setCustomPrice(Number.isFinite(n) && n > 0 ? n : null)
                        }}
                        className="bg-bg-input border border-border rounded-lg py-2 pl-7 pr-12 text-text-primary font-mono text-sm w-full max-w-[320px] transition-all outline-none focus:border-accent-green no-spinner"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted font-mono text-xs pointer-events-none">/mo</span>
                    </div>
                    {customPrice && customPrice > 0 && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-text-secondary font-grotesk">my ROI would be</span>
                        <span
                          className={`text-2xl font-bold font-mono tabular-nums ${
                            r.totalAnnualValue / (customPrice * 12) >= profile.targetRoiMultiple
                              ? 'text-accent-green'
                              : r.totalAnnualValue / (customPrice * 12) >= profile.targetRoiMultiple * 0.5
                              ? 'text-accent-orange'
                              : 'text-red-400'
                          }`}
                        >
                          {fmtMultiple(r.totalAnnualValue / (customPrice * 12))}
                        </span>
                        <span className="text-xs text-text-muted font-grotesk">
                          {r.totalAnnualValue / (customPrice * 12) >= profile.targetRoiMultiple
                            ? '✓ hits your target'
                            : `below your ${profile.targetRoiMultiple}x target`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Pricing intel card (collapsible, grey/muted) ── */}
            {spec.pricingIntel && <PricingIntelCard intel={spec.pricingIntel} partnerName={spec.partnerName} />}

            {/* Benefit cards — grouped by type */}
            {groupByType(r.benefits).map((group) => (
              <div key={group.type}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: BENEFIT_TYPE_META[group.type].color }} />
                  <span
                    className="text-xs uppercase tracking-widest font-grotesk font-semibold"
                    style={{ color: BENEFIT_TYPE_META[group.type].color }}
                  >
                    {BENEFIT_TYPE_META[group.type].label}
                  </span>
                  <span className="text-xs font-mono text-text-muted">
                    {BENEFIT_TYPE_META[group.type].verb} {fmtMoneyCompact(group.subtotal)}/yr
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {group.items.map((benefit, bi) => (
                    <div
                      key={benefit.id}
                      className="metric-card"
                      style={{ borderTop: `3px solid ${benefitColor(benefit.type, bi)}` }}
                    >
                      <h4 className="text-xs uppercase tracking-widest text-text-muted font-grotesk mb-3">
                        {benefit.label}
                      </h4>
                      <div className="text-3xl font-bold font-mono text-text-primary tabular-nums mb-2">
                        {fmtMoney(benefit.annualValue)}
                        <span className="text-sm text-text-muted font-grotesk font-normal ml-1">/yr</span>
                      </div>
                      <p className="text-xs text-text-secondary font-grotesk leading-relaxed mb-2">
                        {benefit.description}
                      </p>
                      <p className="text-[10px] font-mono text-text-muted leading-relaxed">
                        {benefit.formulaBreakdown}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Projection chart */}
            {projectionMetrics.length > 0 && (
              <div className="card mb-6">
                <button
                  onClick={() => setProjectionOpen(!projectionOpen)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="text-sm font-grotesk font-semibold text-text-primary uppercase tracking-wider">
                    Projected impact over 12 months
                  </h3>
                  <svg
                    className={`w-5 h-5 text-text-muted transition-transform flex-shrink-0 ${projectionOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {projectionOpen && (
                  <div className="mt-4">
                    <ProjectionChart
                      metrics={projectionMetrics}
                      category={profile.primaryCategory}
                      partnerName={spec.partnerName}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Confidence comparison chart */}
            <div className="card">
              <button
                onClick={() => setSwagScaleOpen(!swagScaleOpen)}
                className="w-full flex items-center justify-between mb-4 text-left"
              >
                <h3 className="text-sm font-grotesk font-semibold text-text-primary uppercase tracking-wider">
                  The SWAG scale
                </h3>
                <svg
                  className={`w-5 h-5 text-text-muted transition-transform flex-shrink-0 ${swagScaleOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {swagScaleOpen && (<>
                <div className="mb-4">
                  <p className="text-xs text-text-secondary font-grotesk mt-1 leading-relaxed">
                    Every number above is an educated guess, that&apos;s why we call them SWAGs. The scale below shows three scenarios: conservative (60%), moderate (80%), and our best estimate (100%). You can also fine-tune any individual SWAG in the left panel.
                  </p>
                  <p className="text-xs text-text-muted font-grotesk mt-2">
                    Even at 60% confidence, total impact is{' '}
                    <span className="font-mono text-accent-green">{fmtMoneyCompact(results.scenarios[0].totalAnnualValue)}</span>
                    {' '}, your ceiling would be{' '}
                    <span className="font-mono text-accent-green">{fmtMoney(results.scenarios[0].maxMonthlyPrice)}/mo</span>
                    {' '}at {profile.targetRoiMultiple}x.
                  </p>
                </div>
                <div className="h-[280px] -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'var(--font-space-grotesk)' }}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'var(--font-space-mono)' }}
                        tickFormatter={(v) => fmtMoneyCompact(v)}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#1a2436',
                          border: '1px solid #334155',
                          borderRadius: 6,
                          fontFamily: 'var(--font-space-mono)',
                          fontSize: 11,
                          padding: '6px 10px',
                        }}
                        formatter={(v) => fmtMoneyCompact(Number(v))}
                        cursor={{ fill: '#1e293b', opacity: 0.5 }}
                        animationDuration={0}
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length || !hoveredBar) return null
                          const item = payload.find((p) => String(p.dataKey) === hoveredBar)
                          if (!item) return null
                          return (
                            <div style={{
                              background: '#1a2436',
                              border: '1px solid #334155',
                              borderRadius: 6,
                              fontFamily: 'var(--font-space-mono)',
                              fontSize: 11,
                              padding: '6px 10px',
                            }}>
                              <p style={{ color: '#94a3b8', marginBottom: 2 }}>{label}</p>
                              <p style={{ color: String(item.color), fontWeight: 600 }}>
                                {fmtMoneyCompact(Number(item.value))}
                                <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 6, fontSize: 10 }}>
                                  {String(item.name)}
                                </span>
                              </p>
                            </div>
                          )
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 12 }}
                        iconType="circle"
                      />
                      {(() => {
                        const typeIdx: Record<string, number> = {}
                        return spec.benefits.map((b, i) => {
                          const idx = typeIdx[b.type] ?? 0
                          typeIdx[b.type] = idx + 1
                          return (
                            <Bar
                              key={b.id}
                              dataKey={b.label}
                              stackId="a"
                              fill={benefitColor(b.type, idx)}
                              radius={i === spec.benefits.length - 1 ? [6, 6, 0, 0] : undefined}
                              onMouseEnter={() => setHoveredBar(b.label)}
                              onMouseLeave={() => setHoveredBar(null)}
                            />
                          )
                        })
                      })()}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>)}
            </div>

            {/* Breakdown table */}
            <div className="card">
              <button
                onClick={() => setBreakdownOpen(!breakdownOpen)}
                className="w-full flex items-center justify-between mb-4 text-left"
              >
                <h3 className="text-sm font-grotesk font-semibold text-text-primary uppercase tracking-wider">
                  Full breakdown
                </h3>
                <svg
                  className={`w-5 h-5 text-text-muted transition-transform flex-shrink-0 ${breakdownOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {breakdownOpen && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-text-secondary uppercase tracking-wider font-grotesk">
                        Benefit
                      </th>
                      {results.scenarios.map((s) => (
                        <th
                          key={s.accuracy}
                          className={`text-right py-3 px-3 text-xs font-semibold uppercase tracking-wider font-grotesk ${
                            s.accuracy === 1 ? 'text-accent-green' : 'text-text-secondary'
                          }`}
                        >
                          {Math.round(s.accuracy * 100)}% confidence
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono tabular-nums">
                    {groupByType(r.benefits).map((group) => (
                      <React.Fragment key={group.type}>
                        {/* Type header row */}
                        <tr>
                          <td colSpan={4} className="pt-4 pb-1 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: BENEFIT_TYPE_META[group.type].color }} />
                              <span
                                className="text-[10px] uppercase tracking-widest font-grotesk font-semibold"
                                style={{ color: BENEFIT_TYPE_META[group.type].color }}
                              >
                                {BENEFIT_TYPE_META[group.type].label}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {/* Benefit rows */}
                        {group.items.map((b) => (
                          <tr key={b.id} className="hover:bg-bg-hover/50 transition-colors">
                            <td className="py-3 px-3 pl-7">
                              <span className="font-grotesk text-text-primary">{b.label}</span>
                            </td>
                            {results.scenarios.map((s) => {
                              const bResult = s.benefits.find((x) => x.id === b.id)
                              return (
                                <td
                                  key={s.accuracy}
                                  className={`py-3 px-3 text-right ${
                                    s.accuracy === 1 ? 'text-text-primary font-semibold' : 'text-text-secondary'
                                  }`}
                                >
                                  {fmtMoney(bResult?.annualValue ?? 0)}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                        {/* Subtotal row if more than 1 benefit in this type */}
                        {group.items.length > 1 && (
                          <tr>
                            <td className="py-2 px-3 pl-7 text-xs font-grotesk text-text-muted">
                              subtotal
                            </td>
                            {results.scenarios.map((s) => {
                              const sub = s.benefits
                                .filter((x) => x.type === group.type)
                                .reduce((sum, x) => sum + x.annualValue, 0)
                              return (
                                <td key={s.accuracy} className="py-2 px-3 text-right text-text-muted text-xs">
                                  {fmtMoney(sub)}
                                </td>
                              )
                            })}
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {/* Total impact row */}
                    <tr className="bg-bg-primary/50 border-t-2 border-border">
                      <td className="py-3 px-3 text-xs text-accent-green font-grotesk uppercase tracking-wider font-semibold">
                        Total impact
                      </td>
                      {results.scenarios.map((s) => (
                        <td
                          key={s.accuracy}
                          className={`py-3 px-3 text-right font-semibold ${
                            s.accuracy === 1 ? 'text-accent-green text-base' : 'text-text-primary'
                          }`}
                        >
                          {fmtMoney(s.totalAnnualValue)}
                        </td>
                      ))}
                    </tr>
                    {/* Max price row */}
                    <tr>
                      <td className="py-3 px-3 text-xs text-text-muted font-grotesk uppercase tracking-wider">
                        Ceiling at {profile.targetRoiMultiple}x
                      </td>
                      {results.scenarios.map((s) => (
                        <td key={s.accuracy} className="py-3 px-3 text-right text-text-secondary">
                          {fmtMoney(s.maxMonthlyPrice)}/mo
                        </td>
                      ))}
                    </tr>
                    {/* Custom price ROI row if brand entered a quote */}
                    {customPrice && customPrice > 0 && (
                      <tr>
                        <td className="py-3 px-3 text-xs text-text-muted font-grotesk uppercase tracking-wider">
                          ROI at {fmtMoney(customPrice)}/mo
                        </td>
                        {results.scenarios.map((s) => {
                          const mult = s.totalAnnualValue / (customPrice * 12)
                          return (
                            <td key={s.accuracy} className={`py-3 px-3 text-right ${
                              mult >= profile.targetRoiMultiple ? 'text-accent-green' : 'text-accent-orange'
                            }`}>
                              {fmtMultiple(mult)}
                            </td>
                          )
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              )}
            </div>

            {/* Sources */}
            <div className="text-xs text-text-muted font-grotesk leading-relaxed space-y-1.5">
              <p>
                <span className="text-text-secondary font-semibold">Sources</span>
              </p>
              {spec.sources.map((s, i) => (
                <p key={i}>· {s}</p>
              ))}
              {spec.notes && (
                <>
                  <p className="pt-2">
                    <span className="text-text-secondary font-semibold">Notes</span>
                  </p>
                  <p>· {spec.notes}</p>
                </>
              )}
            </div>
          </section>
        </div>

        )}
      </main>
    </>
  )
}

// ─── Pricing intel (collapsible) ──────────────────────────

function PricingIntelCard({
  intel,
  partnerName,
}: {
  intel: NonNullable<SwagSpec['pricingIntel']>
  partnerName: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-border/50 bg-bg-primary/40 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-bg-hover/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <span className="text-xs uppercase tracking-widest text-text-muted font-grotesk font-semibold">
            Pricing intel · {partnerName}
          </span>
          <span className="text-xs text-text-muted font-grotesk ml-2">
            {intel.summary}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-text-muted transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-grotesk mb-2">
                What we found on their site
              </p>
              <ul className="space-y-1">
                {intel.details.map((d, i) => (
                  <li key={i} className="text-xs text-text-muted font-mono">· {d}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-grotesk mb-2">
                What drives the price up
              </p>
              <ul className="space-y-1">
                {intel.costDrivers.map((d, i) => (
                  <li key={i} className="text-xs text-text-muted font-mono">· {d}</li>
                ))}
              </ul>
            </div>
          </div>
          {intel.sourceUrl && (
            <p className="text-[10px] text-text-muted font-grotesk mt-3">
              Your actual quote may differ.{' '}
              <a
                href={intel.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-blue hover:underline"
              >
                See their pricing page →
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
