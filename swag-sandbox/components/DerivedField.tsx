type Props = {
  label: string
  value: string
  hint?: string
}

export default function DerivedField({ label, value, hint }: Props) {
  return (
    <div>
      <label className="block text-xs font-grotesk text-text-muted mb-1.5 flex items-center gap-1.5">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        {label}
      </label>
      <div className="w-full bg-bg-primary/50 border border-dashed border-border rounded-lg px-3 py-2 font-mono text-sm text-text-secondary">
        {value}
      </div>
      {hint && <p className="text-[10px] text-text-muted mt-1 font-grotesk">{hint}</p>}
    </div>
  )
}
