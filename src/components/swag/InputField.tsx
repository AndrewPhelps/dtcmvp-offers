'use client'

type Props = {
  label: string
  value: number
  onChange: (v: number) => void
  prefix?: string
  suffix?: string
  step?: number
  decimals?: number
  hint?: string
  accentColor?: 'green' | 'blue' | 'orange'
}

export default function InputField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  decimals = 0,
  hint,
  accentColor = 'green',
}: Props) {
  const focusBorder =
    accentColor === 'green'
      ? 'focus:border-accent-green focus:shadow-[0_0_0_2px_rgba(123,237,159,0.1)]'
      : accentColor === 'blue'
      ? 'focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(30,144,255,0.1)]'
      : 'focus:border-accent-orange focus:shadow-[0_0_0_2px_rgba(255,159,67,0.1)]'

  return (
    <div>
      <label className="block text-xs font-grotesk text-text-secondary mb-1.5">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-mono text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => {
            const n = parseFloat(e.target.value)
            onChange(Number.isFinite(n) ? n : 0)
          }}
          className={`w-full bg-bg-input border border-border rounded-lg py-2 text-text-primary font-mono text-sm transition-all outline-none no-spinner ${focusBorder} ${
            prefix ? 'pl-7' : 'pl-3'
          } ${suffix ? 'pr-10' : 'pr-3'}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted font-mono text-xs pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-[10px] text-text-muted mt-1 font-grotesk">{hint}</p>}
    </div>
  )
}
