'use client'

import { useState } from 'react'
import type { BrandProfile } from '@/lib/swag-types'
import { fmtMoney, fmtMoneyCompact } from '@/lib/format'
import type { SwagResults } from '@/lib/swag-types'

type Props = {
  partnerName: string
  profile: BrandProfile
  results: SwagResults
  onClose: () => void
  onSubmit: (email: string) => void
}

export default function AskForIntroModal({ partnerName, profile, results, onClose, onSubmit }: Props) {
  const [email, setEmail] = useState(profile.contactEmail || '')
  const [submitted, setSubmitted] = useState(false)
  const r = results.hundred

  const handleSubmit = () => {
    if (!email.includes('@')) return
    setSubmitted(true)
    onSubmit(email)
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[55] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-bg-secondary border border-border rounded-2xl max-w-lg w-full mx-6 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-accent-green flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold font-grotesk text-white">You're all set</h2>
          </div>
          <p className="text-sm text-text-secondary font-grotesk leading-relaxed mb-6">
            The dtcmvp team will reach out to {partnerName} to make sure it's a good fit, then email you at <span className="text-accent-green">{email}</span> to schedule your call.
          </p>
          <button onClick={onClose} className="btn-primary px-6 py-2.5 text-sm w-full">
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-secondary border border-border rounded-2xl max-w-lg w-full mx-6 p-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold font-grotesk text-white mb-1">
            Ask for an intro to {partnerName}
          </h2>
          <p className="text-sm text-text-muted font-grotesk">
            The dtcmvp team will reach out to {partnerName} to make sure it's a good fit, then email you to schedule your call.
          </p>
        </div>

        {/* Confirm your info */}
        <div className="bg-bg-primary/60 rounded-lg p-4 mb-5">
          <p className="text-[10px] uppercase tracking-widest text-text-muted font-grotesk mb-3">
            Confirm your information
          </p>
          <div className="space-y-2 text-sm font-grotesk">
            <div className="flex justify-between">
              <span className="text-text-muted">Name</span>
              <span className="text-text-primary">{profile.contactName || 'Not provided'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Brand</span>
              <span className="text-accent-green">{profile.brandName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Department</span>
              <span className="text-text-primary">{profile.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Category</span>
              <span className="text-text-primary">{profile.primaryCategory}</span>
            </div>
          </div>
        </div>

        {/* SWAG summary */}
        <div className="bg-bg-primary/60 rounded-lg p-4 mb-5">
          <p className="text-[10px] uppercase tracking-widest text-text-muted font-grotesk mb-3">
            Your SWAG for {partnerName}
          </p>
          <div className="space-y-2 text-sm font-grotesk">
            <div className="flex justify-between">
              <span className="text-text-muted">Potential impact</span>
              <span className="text-accent-green font-mono">{fmtMoneyCompact(r.totalAnnualValue)}/yr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Break-even ceiling</span>
              <span className="text-accent-green font-mono">{fmtMoney(r.maxMonthlyPrice)}/mo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Target ROI</span>
              <span className="text-text-primary font-mono">{profile.targetRoiMultiple}x</span>
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="mb-6">
          <label className="block text-xs font-grotesk text-text-secondary mb-1.5">
            Your email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourbrand.com"
            className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary font-grotesk transition-all outline-none focus:border-accent-green"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <p className="text-[10px] text-text-muted font-grotesk mt-1.5">
            We'll only use this to schedule your call. When you're logged in, this will be pre-filled.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border text-text-secondary text-sm font-grotesk hover:bg-bg-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!email.includes('@')}
            className="flex-1 btn-primary px-4 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Ask for an intro
          </button>
        </div>
      </div>
    </div>
  )
}
