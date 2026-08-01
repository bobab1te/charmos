import { useEffect, useState } from 'react'

/**
 * One number for the whole environment: 0 = full daylight, 1 = deep night, everything between is
 * sunset (or dawn). The hero's wash, its colour banks, the glow and the celestial element all read
 * from this single scalar, which is the point — the background and the sun/moon cannot drift out of
 * sync with each other because there is only one value driving both. Same idea as the waitlist's
 * `night` MotionValue, except keyed to the clock instead of scroll position.
 */

/**
 * Local time (fractional hours) → phase. Deliberately asymmetric: dusk is drawn out because sunset
 * is the interesting part of the arc, dawn resolves faster because nobody is watching it.
 */
const RAMP: Array<[number, number]> = [
  [0, 1],
  [4.5, 1],
  [5.75, 0.82],
  [7, 0.3],
  [8.25, 0],
  [16.25, 0],
  [17.5, 0.22],
  [18.75, 0.58],
  [20, 0.86],
  [21.25, 1],
  [24, 1],
]

export function skyPhaseForHours(hours: number): number {
  const h = ((hours % 24) + 24) % 24
  for (let i = 0; i < RAMP.length - 1; i++) {
    const [h0, p0] = RAMP[i]
    const [h1, p1] = RAMP[i + 1]
    if (h >= h0 && h <= h1) {
      const t = h1 === h0 ? 0 : (h - h0) / (h1 - h0)
      return p0 + (p1 - p0) * t
    }
  }
  return 1
}

function phaseNow() {
  const d = new Date()
  return skyPhaseForHours(d.getHours() + d.getMinutes() / 60)
}

/**
 * Starts at 0 and corrects on mount rather than reading the clock during render: the server has no
 * idea what time it is where the visitor is, and a server/client mismatch on inline style values is
 * a real hydration error. The correction is invisible because every consumer of this transitions
 * rather than snapping.
 */
export function useSkyPhase() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    setPhase(phaseNow())
    const id = window.setInterval(() => setPhase(phaseNow()), 5 * 60_000)
    return () => window.clearInterval(id)
  }, [])

  return phase
}

/** The point on the arc where the page itself should flip to the dark palette. */
export const NIGHT_THRESHOLD = 0.55

export function greetingForPhaseHour(hours: number) {
  const h = ((hours % 24) + 24) % 24
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}
