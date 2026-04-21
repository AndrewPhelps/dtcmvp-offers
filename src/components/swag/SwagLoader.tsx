'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { BrandProfile } from '@/lib/swag/swag-types'

const MoleculeLoader = dynamic(() => import('./MoleculeLoader'), { ssr: false })

const SCRAMBLE_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const SCRAMBLE_LOWER = 'abcdefghijklmnopqrstuvwxyz'

type LoaderStep = {
  label: string
  greenTokens: string[]
  status: 'pending' | 'active' | 'done'
  typedText: string
}

/**
 * Typewriter that types out text character by character.
 * Green tokens get scramble-decoded; everything else just types in.
 */
function TypewriterLine({
  text,
  greenTokens,
  speed = 35,
  onDone,
}: {
  text: string
  greenTokens: string[]
  speed?: number
  onDone?: () => void
}) {
  const [displayed, setDisplayed] = useState(0)
  const [scramblePhase, setScramblePhase] = useState(false)
  const [scrambleDisplay, setScrambleDisplay] = useState<Record<number, string>>({})
  const doneRef = useRef(false)

  // Type out characters
  useEffect(() => {
    if (displayed >= text.length) {
      if (!doneRef.current) {
        doneRef.current = true
        // After typing, scramble-decode the green tokens
        setScramblePhase(true)
      }
      return
    }
    const timer = setTimeout(() => setDisplayed((d) => d + 1), speed)
    return () => clearTimeout(timer)
  }, [displayed, text.length, speed])

  // Scramble-decode green tokens after typing is done
  useEffect(() => {
    if (!scramblePhase) return

    // Find positions of green tokens in the text
    const tokenPositions: { start: number; end: number; token: string }[] = []
    for (const token of greenTokens) {
      let idx = text.indexOf(token)
      while (idx !== -1) {
        tokenPositions.push({ start: idx, end: idx + token.length, token })
        idx = text.indexOf(token, idx + 1)
      }
    }

    if (tokenPositions.length === 0) {
      onDone?.()
      return
    }

    const duration = 800
    const startTime = performance.now()
    let frame: number

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)

      const newScramble: Record<number, string> = {}
      for (const pos of tokenPositions) {
        const charsResolved = Math.floor(progress * pos.token.length)
        for (let i = 0; i < pos.token.length; i++) {
          const ch = pos.token[i]
          if (i < charsResolved) {
            // resolved
          } else {
            // scramble
            if (/[A-Z]/.test(ch)) {
              newScramble[pos.start + i] = SCRAMBLE_UPPER[Math.floor(Math.random() * 26)]
            } else if (/[a-z]/.test(ch)) {
              newScramble[pos.start + i] = SCRAMBLE_LOWER[Math.floor(Math.random() * 26)]
            }
          }
        }
      }

      setScrambleDisplay(newScramble)
      if (progress < 1) {
        frame = requestAnimationFrame(animate)
      } else {
        setScrambleDisplay({})
        onDone?.()
      }
    }

    // Small pause before decode starts
    const timer = setTimeout(() => {
      frame = requestAnimationFrame(animate)
    }, 200)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
    }
  }, [scramblePhase, text, greenTokens, onDone])

  // Build the rendered characters
  const visibleText = text.slice(0, displayed)

  // Check if a position is inside a green token
  const isGreen = (idx: number) => {
    for (const token of greenTokens) {
      let pos = text.indexOf(token)
      while (pos !== -1) {
        if (idx >= pos && idx < pos + token.length) return true
        pos = text.indexOf(token, pos + 1)
      }
    }
    return false
  }

  return (
    <span>
      {visibleText.split('').map((ch, i) => {
        const scrambled = scrambleDisplay[i]
        const green = isGreen(i)
        return (
          <span key={i} className={green ? 'text-accent-green' : ''}>
            {scrambled || ch}
          </span>
        )
      })}
      {displayed < text.length && <span className="animate-pulse">|</span>}
    </span>
  )
}

type Props = {
  profile: BrandProfile
  partnerName: string
  onComplete: () => void
}

export default function SwagLoader({ profile, partnerName, onComplete }: Props) {
  const brandName = profile.brandName || 'Your Brand'
  const contactName = profile.contactName || brandName
  const category = profile.primaryCategory

  const stepDefs = [
    { label: `Pulling in ${brandName}'s store data`, greenTokens: [`${brandName}'s`] },
    { label: `Analyzing ${partnerName} for ${category} brands`, greenTokens: [category] },
    { label: `Building ${contactName}'s personalized SWAG`, greenTokens: [`${contactName}'s`] },
    { label: `Computing value at ${profile.targetRoiMultiple}x target ROI`, greenTokens: [`${profile.targetRoiMultiple}x`] },
    { label: `Preparing your brief`, greenTokens: ['your'] },
  ]

  const [steps, setSteps] = useState<LoaderStep[]>(
    stepDefs.map((s) => ({ ...s, status: 'pending', typedText: '' }))
  )
  const [currentStep, setCurrentStep] = useState(-1)
  const [fadeOut, setFadeOut] = useState(false)
  const [particlesReady, setParticlesReady] = useState(false)

  const handleComplete = useCallback(() => { onComplete() }, [onComplete])

  useEffect(() => {
    if (particlesReady && currentStep === -1) setCurrentStep(0)
  }, [particlesReady, currentStep])

  useEffect(() => {
    if (currentStep < 0) return

    if (currentStep >= steps.length) {
      const t1 = setTimeout(() => setFadeOut(true), 600)
      const t2 = setTimeout(() => handleComplete(), 1000)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }

    // Activate current step
    setSteps((prev) => prev.map((s, i) => i === currentStep ? { ...s, status: 'active' } : s))
  }, [currentStep, steps.length, handleComplete])

  const handleStepDone = useCallback(() => {
    setSteps((prev) => prev.map((s, i) => i === currentStep ? { ...s, status: 'done' } : s))
    // Pause before next step
    setTimeout(() => setCurrentStep((c) => c + 1), 400)
  }, [currentStep])

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: '#0f172a' }}
    >
      <div className="flex flex-col items-center">
        <MoleculeLoader
          width={360}
          height={360}
          onParticlesReady={() => setParticlesReady(true)}
          isCollapsing={fadeOut}
        />

        <div className={`w-[420px] transition-all duration-300 ${
          particlesReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="space-y-4 mb-6">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 transition-all duration-300 ${
                  step.status === 'pending' ? 'opacity-20' : 'opacity-100'
                }`}
              >
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                  {step.status === 'pending' && (
                    <div className="w-5 h-5 rounded-full border-2 border-border" />
                  )}
                  {step.status === 'active' && (
                    <div className="w-5 h-5 rounded-full border-2 border-accent-green border-t-transparent animate-spin" />
                  )}
                  {step.status === 'done' && (
                    <div className="w-5 h-5 rounded-full bg-accent-green flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>

                <span className="text-sm font-grotesk">
                  {step.status === 'active' ? (
                    <TypewriterLine
                      text={step.label}
                      greenTokens={step.greenTokens}
                      speed={30}
                      onDone={handleStepDone}
                    />
                  ) : step.status === 'done' ? (
                    // Show with green tokens highlighted
                    <>
                      {(() => {
                        let result = step.label
                        const parts: { text: string; green: boolean }[] = []
                        let remaining = result
                        for (const token of step.greenTokens) {
                          const idx = remaining.indexOf(token)
                          if (idx >= 0) {
                            if (idx > 0) parts.push({ text: remaining.slice(0, idx), green: false })
                            parts.push({ text: token, green: true })
                            remaining = remaining.slice(idx + token.length)
                          }
                        }
                        if (remaining) parts.push({ text: remaining, green: false })
                        if (parts.length === 0) parts.push({ text: step.label, green: false })
                        return parts.map((p, j) => (
                          <span key={j} className={p.green ? 'text-accent-green' : 'text-accent-green/70'}>
                            {p.text}
                          </span>
                        ))
                      })()}
                    </>
                  ) : (
                    <span className="text-text-muted">{step.label}</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="w-full h-1 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-green rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${(steps.filter((s) => s.status === 'done').length / steps.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
