import React from 'react'
import type { BrandProfile } from './swag-types'
import { TextScramble } from '@/components/swag/AnimatedValue'

/**
 * Extract sub-words from a department or category for partial matching.
 * "Retention / CRM" → ["Retention", "CRM", "retention"]
 * "Apparel & Fashion" → ["Apparel", "Fashion", "apparel", "fashion"]
 */
function extractSubTokens(value: string): string[] {
  if (value === 'Other') return []
  const tokens: string[] = [value] // full match first
  // Split on separators and add individual words (2+ chars)
  const words = value.split(/[\s\/&,]+/).filter((w) => w.length >= 2)
  for (const w of words) {
    tokens.push(w)
    // Also add lowercase version for matching "retention" in "the retention side"
    if (w !== w.toLowerCase()) tokens.push(w.toLowerCase())
  }
  return [...new Set(tokens)]
}

/**
 * Highlight personalized tokens in green with scramble animation.
 * Catches: brand name, contact name (+ first name), category words,
 * department words, dollar values, and ROI multiples.
 */
export function highlightGreen(text: string, profile: BrandProfile): React.ReactElement {
  const identityTokens: string[] = []

  // Brand name + possessive
  if (profile.brandName && profile.brandName !== 'Your Brand') {
    identityTokens.push(profile.brandName + "'s")
    identityTokens.push(profile.brandName)
  }
  if (profile.brandName === 'Your Brand') {
    identityTokens.push("Your Brand's")
    identityTokens.push('Your Brand')
  }

  // Contact name + first name + possessives
  if (profile.contactName && profile.contactName.length > 0) {
    identityTokens.push(profile.contactName + "'s")
    identityTokens.push(profile.contactName)
    const firstName = profile.contactName.split(' ')[0]
    if (firstName && firstName !== profile.contactName) {
      identityTokens.push(firstName + "'s")
      identityTokens.push(firstName)
    }
  }

  // Category: full match + individual words + lowercase
  identityTokens.push(...extractSubTokens(profile.primaryCategory))

  // Department: full match + individual words + lowercase
  identityTokens.push(...extractSubTokens(profile.department))

  // Dollar amounts and ROI multiples
  const dollarPattern = /\$[\d,.]+[kKmMbB]?(?:\/(?:yr|mo))?/g
  const dollarMatches = text.match(dollarPattern) || []
  for (const m of dollarMatches) identityTokens.push(m)

  const roiPattern = /\d+\.?\d*x\b/g
  const roiMatches = text.match(roiPattern) || []
  for (const m of roiMatches) identityTokens.push(m)

  if (identityTokens.length === 0) return <>{text}</>

  // Deduplicate and sort longest first to avoid partial match collisions
  const sorted = [...new Set(identityTokens)].sort((a, b) => b.length - a.length)
  const escaped = sorted.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`(${escaped.join('|')})`, 'g')
  const parts = text.split(pattern)

  const tokenSet = new Set(identityTokens)

  return (
    <>
      {parts.map((part, i) => {
        if (tokenSet.has(part)) {
          return <TextScramble key={i} text={part} className="text-accent-green" interval={10000} />
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}
