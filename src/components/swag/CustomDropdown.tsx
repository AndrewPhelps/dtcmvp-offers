'use client'

import { useState, useEffect, useRef } from 'react'

type Props = {
  label: string
  value: string
  options: readonly string[]
  onChange: (v: string) => void
  accentColor?: 'green' | 'blue' | 'orange'
  hint?: string
}

export default function CustomDropdown({
  label,
  value,
  options,
  onChange,
  accentColor = 'green',
  hint,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const focusBorder =
    accentColor === 'green'
      ? 'border-accent-green'
      : accentColor === 'blue'
      ? 'border-accent-blue'
      : 'border-accent-orange'

  return (
    <div>
      <label className="block text-xs font-grotesk text-text-secondary mb-1.5">
        {label}
      </label>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className={`w-full bg-bg-input border rounded-lg px-3 py-2 text-sm text-text-primary font-grotesk cursor-pointer text-left flex items-center justify-between gap-2 transition-all outline-none ${
            open ? focusBorder : 'border-border'
          }`}
        >
          <span className="truncate">{value}</span>
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
          <div className="absolute top-full left-0 right-0 mt-1 bg-bg-secondary border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-30">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt)
                  setOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-sm font-grotesk transition-colors ${
                  opt === value
                    ? 'text-accent-green bg-bg-hover'
                    : 'text-text-primary hover:bg-bg-hover'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
      {hint && <p className="text-[10px] text-text-muted mt-1 font-grotesk">{hint}</p>}
    </div>
  )
}
