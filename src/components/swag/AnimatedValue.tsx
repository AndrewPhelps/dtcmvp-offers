'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const UPPER_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER_CHARS = 'abcdefghijklmnopqrstuvwxyz'
const NUMBER_CHARS = '0123456789'

// Global counter to stagger instances. Each new TextScramble gets a different offset.
let instanceCounter = 0

/**
 * Text scramble/decode effect.
 * Words scramble with letters, numbers scramble with digits.
 * Each instance is staggered so they don't all fire at once.
 */
export function TextScramble({
  text,
  className,
  interval = 10000,
}: {
  text: string
  className?: string
  interval?: number
}) {
  const [display, setDisplay] = useState(text)
  const [isScrambling, setIsScrambling] = useState(false)
  const frameRef = useRef<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const delayRef = useRef<NodeJS.Timeout | null>(null)
  const staggerRef = useRef(0)

  // Assign a stagger offset on first render
  useEffect(() => {
    staggerRef.current = (instanceCounter++) * 2200
  }, [])

  const scramble = useCallback(() => {
    const chars = text.split('')
    const resolved = new Array(chars.length).fill(false)
    let resolvedCount = 0
    const totalDuration = 1200
    const perCharDelay = totalDuration / chars.length
    const startTime = performance.now()

    let lastFrame = 0

    const animate = (now: number) => {
      // Throttle to ~6fps for a slower, more deliberate scramble
      if (now - lastFrame < 160) {
        frameRef.current = requestAnimationFrame(animate)
        return
      }
      lastFrame = now

      const elapsed = now - startTime
      const shouldResolve = Math.floor(elapsed / perCharDelay)
      for (let i = resolvedCount; i <= Math.min(shouldResolve, chars.length - 1); i++) {
        resolved[i] = true
        resolvedCount = i + 1
      }

      const result = chars.map((ch, i) => {
        if (resolved[i]) return ch
        if (ch === ' ' || ch === '·' || ch === '/' || ch === ',' || ch === '.') return ch
        if (/[0-9]/.test(ch)) return NUMBER_CHARS[Math.floor(Math.random() * NUMBER_CHARS.length)]
        if (/[$%xX&]/.test(ch)) return ch
        if (/[A-Z]/.test(ch)) return UPPER_CHARS[Math.floor(Math.random() * UPPER_CHARS.length)]
        return LOWER_CHARS[Math.floor(Math.random() * LOWER_CHARS.length)]
      }).join('')

      setDisplay(result)

      if (resolvedCount < chars.length) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        setIsScrambling(false)
      }
    }

    setIsScrambling(true)
    frameRef.current = requestAnimationFrame(animate)
  }, [text])

  useEffect(() => {
    const stopAfter = 30000 // stop all flickering after 30s
    const mountTime = performance.now()

    delayRef.current = setTimeout(() => {
      scramble()
      intervalRef.current = setInterval(() => {
        if (performance.now() - mountTime > stopAfter) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          return
        }
        scramble()
      }, interval)
    }, staggerRef.current)

    return () => {
      cancelAnimationFrame(frameRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (delayRef.current) clearTimeout(delayRef.current)
    }
  }, [scramble, interval])

  return <span className={`${className} ${isScrambling ? 'text-scramble-sheen' : ''}`} key={isScrambling ? 'scrambling' : 'static'}>{display}</span>
}

/**
 * Animated count-up for dollar values.
 */
export function CountUp({
  value,
  formatter,
  className,
}: {
  value: number
  formatter: (n: number) => string
  className?: string
}) {
  const [display, setDisplay] = useState(formatter(0))
  const prevValueRef = useRef(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const startValue = prevValueRef.current
    const endValue = value
    const duration = 1200
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startValue + (endValue - startValue) * eased
      setDisplay(formatter(current))

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        prevValueRef.current = endValue
      }
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value, formatter])

  return <span className={className}>{display}</span>
}

/**
 * Flicker reveal wrapper (legacy, kept for compatibility).
 */
export function FlickerReveal({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <span className={className}>{children}</span>
}
