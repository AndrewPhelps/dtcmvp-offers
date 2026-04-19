'use client'

import { useState } from 'react'

type Props = {
  partnerName: string
  onAccept: () => void
}

export default function SwagDisclaimer({ partnerName, onAccept }: Props) {
  const [skipNext, setSkipNext] = useState(false)

  const handleAccept = () => {
    if (skipNext) {
      localStorage.setItem('swag-skip-disclaimer', 'true')
    }
    onAccept()
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-bg-secondary border border-border rounded-2xl max-w-lg w-full mx-6 p-8">
        {/* Dictionary entry */}
        <div className="mb-6">
          <div className="flex items-baseline gap-3 mb-1">
            <h2 className="text-5xl font-bold font-grotesk text-white">SWAG</h2>
            <span className="text-sm text-text-muted font-mono">/sw{'\u00E6'}ɡ/</span>
          </div>
          <p className="text-xs text-text-muted font-grotesk italic mb-4">noun</p>

          <div className="pl-5 border-l-2 border-accent-green/40">
            <p className="text-lg font-grotesk leading-snug" style={{ color: '#cbd5e0' }}>
              <span className="text-white font-bold">S</span>cientific{' '}
              <span className="text-white font-bold">W</span>ild{' '}
              <span className="text-white font-bold">A</span>ss{' '}
              <span className="text-white font-bold">G</span>uess
            </p>
            <p className="text-sm text-text-muted font-grotesk mt-3 leading-relaxed">
              An informed estimate. Better than a guess. Better than a random case study. Worse than a real audit.
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-bg-primary/60 rounded-lg p-5 mb-6">
          <p className="text-sm text-text-secondary font-grotesk leading-relaxed">
            I understand these are estimates derived from my inputs and what is publicly available for {partnerName}. All values are editable and intended to help evaluate this tool, not to guarantee outcomes.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          {/* Skip checkbox */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <div
              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                skipNext
                  ? 'bg-accent-green border-accent-green'
                  : 'border-border group-hover:border-accent-green/50'
              }`}
              onClick={() => setSkipNext(!skipNext)}
            >
              {skipNext && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span
              className="text-xs text-text-muted font-grotesk"
              onClick={() => setSkipNext(!skipNext)}
            >
              skip this message next time
            </span>
          </label>

          {/* Accept button */}
          <button
            onClick={handleAccept}
            className="btn-primary px-6 py-2.5 text-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
