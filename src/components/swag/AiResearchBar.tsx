'use client'

import type { SwagSpec, BrandProfile } from '@/lib/swag/swag-types'
import type { SwagResults } from '@/lib/swag/swag-types'
import { buildAiUrl, AI_PLATFORMS, AiPlatform } from '@/lib/swag/prompt-builder'

function AiIcon({ platform }: { platform: AiPlatform }) {
  switch (platform) {
    case 'claude':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M16.5 3.5C14.76 2.07 12.38 1.5 10 2.09C6.22 3.01 3.5 6.39 3.5 10.28V10.5C3.5 14.92 7.08 18.5 11.5 18.5H12C16.42 18.5 20 14.92 20 10.5C20 7.67 18.72 5.15 16.73 3.58" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="12" cy="10.5" r="3" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      )
    case 'chatgpt':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    case 'gemini':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      )
  }
}

type Props = {
  spec: SwagSpec
  profile: BrandProfile
  results: SwagResults
}

export default function AiResearchBar({ spec, profile, results }: Props) {
  return (
    <div className="rounded-xl border border-border/50 bg-bg-secondary p-6 print:hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-grotesk font-semibold text-text-primary mb-1">
            Research this with your AI
          </h3>
          <p className="text-xs text-text-muted font-grotesk leading-relaxed max-w-md">
            Open a conversation pre-loaded with your SWAG results. Your AI can search for community reviews, give you a second opinion, and help you prep questions for a call.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {AI_PLATFORMS.map((platform) => (
            <a
              key={platform.id}
              href={buildAiUrl(platform.id, spec, profile, results)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-secondary hover:text-accent-green hover:border-accent-green/40 transition-all text-xs font-grotesk"
            >
              <AiIcon platform={platform.id} />
              {platform.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
