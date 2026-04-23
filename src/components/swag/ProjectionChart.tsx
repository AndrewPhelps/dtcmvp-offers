'use client'

import { useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { fmtMoneyCompact, fmtMoney } from '@/lib/swag/format'

const SEASONAL: Record<string, number[]> = {
  'Apparel & Fashion': [0.70, 0.75, 0.85, 0.90, 0.95, 0.90, 0.85, 0.90, 1.00, 1.10, 1.40, 1.60],
  'Beauty & Cosmetics': [0.80, 0.80, 0.85, 0.90, 0.95, 0.95, 0.90, 0.85, 0.95, 1.05, 1.35, 1.55],
  'Health & Wellness': [1.15, 1.10, 1.00, 0.95, 0.90, 0.85, 0.85, 0.90, 1.00, 1.00, 1.10, 1.20],
  'Food & Drink': [0.85, 0.85, 0.90, 0.95, 1.00, 1.05, 1.05, 1.00, 0.95, 1.00, 1.15, 1.25],
  'Other': [0.85, 0.85, 0.90, 0.95, 0.95, 0.95, 0.90, 0.90, 1.00, 1.05, 1.25, 1.40],
}

export type ProjectionMetric = {
  label: string
  baseMonthly: number
  liftPct: number
  liftLabel: string
}

type Props = {
  metrics: ProjectionMetric[]
  category: string
  partnerName: string
}

export default function ProjectionChart({ metrics, category, partnerName }: Props) {
  const [mode, setMode] = useState<'monthly' | 'cumulative'>('monthly')
  const seasonal = SEASONAL[category] || SEASONAL['Other']
  const metric = metrics[0]

  const data = useMemo(() => {
    if (!metric) return []

    const months = ['Setup', 'Mo 2', 'Mo 3', 'Mo 4', 'Mo 5', 'Mo 6', 'Mo 7', 'Mo 8', 'Mo 9', 'Mo 10', 'Mo 11', 'Mo 12']
    let cumWithout = 0
    let cumWith = 0

    return months.map((label, i) => {
      const factor = seasonal[i]
      const monthlyWithout = Math.round(metric.baseMonthly * factor)

      // Month 0 (setup): no lift yet, lines converge
      const rampUp = i === 0 ? 0 : Math.min(1, i / 2) // 0% month 0, 50% month 1, 100% month 2+
      const monthlyWith = Math.round(monthlyWithout * (1 + metric.liftPct * rampUp))

      cumWithout += monthlyWithout
      cumWith += monthlyWith

      return {
        label,
        without: mode === 'cumulative' ? cumWithout : monthlyWithout,
        withPartner: mode === 'cumulative' ? cumWith : monthlyWith,
      }
    })
  }, [metric, seasonal, mode])

  if (!metric || data.length === 0) return null

  // Totals from monthly data (always full year)
  const monthlyData = (() => {
    let tw = 0, tp = 0
    for (let i = 0; i < 12; i++) {
      const f = seasonal[i]
      const mw = metric.baseMonthly * f
      const ramp = i === 0 ? 0 : Math.min(1, i / 2)
      tw += mw
      tp += mw * (1 + metric.liftPct * ramp)
    }
    return { totalWithout: Math.round(tw), totalWith: Math.round(tp), totalLift: Math.round(tp - tw) }
  })()

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4 mb-4">
        <div className="min-w-0">
          <p className="text-xs text-text-secondary font-grotesk leading-relaxed">
            Based on {fmtMoneyCompact(metric.baseMonthly * 12)}/yr current revenue (your orders x AOV) with seasonal patterns for {category !== 'Other' ? category : 'your category'}.
          </p>
          <div className="flex gap-x-4 gap-y-1 flex-wrap mt-2">
            <div className="text-xs font-mono text-text-muted whitespace-nowrap">
              Current: <span className="text-text-secondary">{fmtMoneyCompact(monthlyData.totalWithout)}/yr</span>
            </div>
            <div className="text-xs font-mono text-text-muted whitespace-nowrap">
              With {partnerName}: <span className="text-accent-green">{fmtMoneyCompact(monthlyData.totalWith)}/yr</span>
            </div>
            <div className="text-xs font-mono text-text-muted whitespace-nowrap">
              Lift: <span className="text-accent-green">+{fmtMoneyCompact(monthlyData.totalLift)}/yr</span>
            </div>
          </div>
        </div>

        {/* Toggle — self-start on mobile so it doesn't stretch full-width */}
        <div className="flex gap-1 p-1 bg-bg-primary rounded-lg self-start md:flex-shrink-0">
          <button
            onClick={() => setMode('monthly')}
            className={`px-3 py-1 rounded-md text-[10px] font-grotesk font-semibold uppercase tracking-wider transition-all ${
              mode === 'monthly' ? 'bg-accent-green text-[#0f172a]' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setMode('cumulative')}
            className={`px-3 py-1 rounded-md text-[10px] font-grotesk font-semibold uppercase tracking-wider transition-all ${
              mode === 'cumulative' ? 'bg-accent-green text-[#0f172a]' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Cumulative
          </button>
        </div>
      </div>

      <div className="h-[300px] -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="liftGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7bed9f" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#7bed9f" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="baseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#64748b" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#64748b" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'var(--font-space-grotesk)' }}
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
                padding: '8px 12px',
              }}
              formatter={(v, name) => [
                fmtMoney(Number(v)),
                String(name) === 'withPartner' ? `With ${partnerName}` : 'Current',
              ]}
              animationDuration={0}
              cursor={{ stroke: '#7bed9f', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Legend
              wrapperStyle={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 12 }}
              formatter={(value) => String(value) === 'withPartner' ? `With ${partnerName}` : 'Current'}
            />
            <Area
              type="monotone"
              dataKey="without"
              stroke="#64748b"
              strokeWidth={2}
              fill="url(#baseGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#64748b' }}
              animationDuration={400}
            />
            <Area
              type="monotone"
              dataKey="withPartner"
              stroke="#7bed9f"
              strokeWidth={2}
              fill="url(#liftGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#7bed9f' }}
              animationDuration={400}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
