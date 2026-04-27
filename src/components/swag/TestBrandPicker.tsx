'use client'

import { useEffect, useRef, useState } from 'react'
import { searchTestBrands, type TestBrandMatch } from '@/lib/api'

type Props = {
  selected: TestBrandMatch | null
  onSelect: (m: TestBrandMatch | null) => void
}

export default function TestBrandPicker({ selected, onSelect }: Props) {
  const [q, setQ] = useState('')
  const [matches, setMatches] = useState<TestBrandMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (q.trim().length < 2) {
      setMatches([])
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const r = await searchTestBrands(q)
        setMatches(r)
      } catch (err) {
        console.error('[test-brand search] failed', err)
        setMatches([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (selected) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2.5 mb-4 flex items-center justify-between text-sm font-grotesk">
        <div className="text-amber-200">
          <span className="text-amber-400/70 text-xs uppercase tracking-widest mr-2">Admin · testing as</span>
          <span className="font-semibold">{selected.companyName || 'Brand'}</span>
          <span className="text-amber-200/70"> · {selected.name || selected.email}</span>
        </div>
        <button
          onClick={() => {
            onSelect(null)
            setQ('')
          }}
          className="text-xs text-amber-200/80 hover:text-amber-100 underline underline-offset-2"
        >
          Clear
        </button>
      </div>
    )
  }

  return (
    <div ref={wrapRef} className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2.5 mb-4 relative">
      <div className="flex items-center gap-3 text-sm font-grotesk">
        <span className="text-amber-400/80 text-xs uppercase tracking-widest whitespace-nowrap">Admin · test as</span>
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search brand contact by email…"
          className="flex-1 bg-transparent border-none outline-none text-amber-100 placeholder-amber-300/40 text-sm"
        />
        {loading && <span className="text-xs text-amber-300/60">searching…</span>}
      </div>
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1 max-h-72 overflow-y-auto rounded-lg border border-amber-500/30 bg-bg-secondary shadow-xl z-20">
          {matches.length === 0 && !loading && (
            <div className="px-4 py-3 text-xs text-text-muted">No matching brand contacts.</div>
          )}
          {matches.map((m) => (
            <button
              key={m.contactAirtableId}
              onClick={() => {
                onSelect(m)
                setOpen(false)
                setQ('')
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-amber-500/10 border-b border-border last:border-b-0 transition-colors"
            >
              <div className="text-sm text-text-primary font-grotesk">
                <span className="font-semibold">{m.name || '(no name)'}</span>
                <span className="text-text-muted"> · {m.email}</span>
              </div>
              <div className="text-xs text-text-muted font-grotesk mt-0.5">
                {m.companyName || '(no company)'}
                {m.primaryCategoryBucket && <span className="text-accent-green/70"> · {m.primaryCategoryBucket}</span>}
                {m.title && <span> · {m.title}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
