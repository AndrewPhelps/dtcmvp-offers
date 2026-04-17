'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { PARTNER_LIST } from '@/lib/partners-registry'
import type { PartnerStatus } from '@/lib/swag-types'

const STATUS_OPTIONS: { value: PartnerStatus; label: string; color: string }[] = [
  { value: 'not-started', label: 'not started', color: '#718096' },
  { value: 'in-progress', label: 'in progress', color: '#ff9f43' },
  { value: 'done', label: 'done', color: '#7bed9f' },
]

function getStatus(slug: string): PartnerStatus {
  if (typeof window === 'undefined') return 'not-started'
  return (localStorage.getItem(`swag-status-${slug}`) as PartnerStatus) || 'not-started'
}

function saveStatus(slug: string, status: PartnerStatus) {
  localStorage.setItem(`swag-status-${slug}`, status)
}

// Custom dropdown — no native <select>, no mac default picklist
function CustomDropdown({
  value,
  options,
  onChange,
  width = 'w-[180px]',
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  width?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find((o) => o.value === value)

  return (
    <div ref={ref} className={`relative ${width}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-white/20 border border-[#0a0e1a]/20 rounded-lg px-3 py-1.5 text-sm text-[#0a0e1a] font-grotesk font-semibold cursor-pointer focus:outline-none focus:border-[#0a0e1a]/40 flex items-center justify-between gap-2"
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <svg
          className={`w-4 h-4 text-[#0a0e1a]/60 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-bg-secondary border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-2 text-sm font-grotesk transition-colors ${
                o.value === value
                  ? 'text-accent-green bg-bg-hover'
                  : 'text-text-primary hover:bg-bg-hover'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminToolbar({ currentSlug, onTriggerLoader }: { currentSlug: string; onTriggerLoader?: () => void }) {
  const router = useRouter()
  const [status, setStatusState] = useState<PartnerStatus>('not-started')
  const [statusOpen, setStatusOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setStatusState(getStatus(currentSlug))
  }, [currentSlug])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0]

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 py-2 flex items-center justify-between" style={{ backgroundColor: '#7bed9f' }}>
      {/* Left: label */}
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-4 rounded-full bg-[#0a0e1a]" />
        <span className="text-xs uppercase tracking-widest text-[#0a0e1a] font-grotesk font-semibold">
          SWAG admin
        </span>
      </div>

      {/* Right: sparkle button + partner dropdown + status dropdown */}
      <div className="flex items-center gap-3">
        {/* AI sparkle trigger */}
        {onTriggerLoader && (
          <button
            onClick={onTriggerLoader}
            className="px-2 py-1.5 rounded-lg hover:bg-[#0a0e1a]/10 transition-colors"
            title="Preview SWAG loading animation"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0e1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
              <path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75L19 13z" />
              <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z" />
            </svg>
          </button>
        )}

        {/* Partner picker */}
        <CustomDropdown
          value={currentSlug}
          options={PARTNER_LIST.map((p) => ({ value: p.slug, label: p.name }))}
          onChange={(slug) => router.push(`/calculators/${slug}`)}
          width="w-[180px]"
        />

        {/* Status dropdown */}
        <div ref={statusRef} className="relative">
          <button
            onClick={() => setStatusOpen(!statusOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-grotesk font-semibold uppercase tracking-wider cursor-pointer transition-colors"
            style={{ borderColor: '#0a0e1a', color: '#0a0e1a', backgroundColor: 'rgba(255,255,255,0.2)' }}
            onMouseEnter={(e) => {
              if (!statusOpen) {
                e.currentTarget.style.backgroundColor = '#0a0e1a'
                e.currentTarget.style.color = '#7bed9f'
              }
            }}
            onMouseLeave={(e) => {
              if (!statusOpen) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'
                e.currentTarget.style.color = '#0a0e1a'
              }
            }}
          >
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#0a0e1a' }} />
            {current.label}
            <svg
              className={`w-3 h-3 transition-transform flex-shrink-0 ${statusOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {statusOpen && (
            <div className="absolute top-full right-0 mt-1 bg-bg-secondary border border-border rounded-lg shadow-lg overflow-hidden z-50 min-w-[140px]">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    saveStatus(currentSlug, opt.value)
                    setStatusState(opt.value)
                    setStatusOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-grotesk font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors ${
                    opt.value === status ? 'bg-bg-hover' : 'hover:bg-bg-hover'
                  }`}
                  style={{ color: opt.color }}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
