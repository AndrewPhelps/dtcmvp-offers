'use client'

import { useState, ReactNode } from 'react'

type Props = {
  title: string
  subtitle: string
  accent: 'green' | 'blue' | 'orange'
  children: ReactNode
  defaultOpen?: boolean
}

const accentMap = {
  green: 'bg-accent-green',
  blue: 'bg-accent-blue',
  orange: 'bg-accent-orange',
}

const textMap = {
  green: 'text-accent-green',
  blue: 'text-accent-blue',
  orange: 'text-accent-orange',
}

export default function InputSection({
  title,
  subtitle,
  accent,
  children,
  defaultOpen = true,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-border rounded-xl bg-bg-secondary overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-bg-hover transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-8 rounded-full ${accentMap[accent]}`} />
          <div>
            <h3 className={`text-sm font-grotesk font-semibold ${textMap[accent]} uppercase tracking-wider`}>
              {title}
            </h3>
            <p className="text-xs text-text-muted font-grotesk mt-0.5">{subtitle}</p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="p-4 pt-0 space-y-3">{children}</div>}
    </div>
  )
}
