import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * A tiny reusable signal for the handful of "personality" moments in the app — deliberately not
 * a generic event bus. One trigger type today (a deal reaching Completed); the union can grow
 * later (e.g. a campaign wrap-up) without new plumbing, but nothing else is wired up yet.
 *
 * Mounted globally (see __root.tsx) rather than scoped to the dashboard, since the trigger fires
 * from the deal pipeline board and is consumed by the dashboard hero's mascot — the signal needs
 * to survive navigating between the two.
 */
export type CharmMomentType = 'deal-completed'

/** How long the moment stays "active" for anything reading it (e.g. the mascot's mood) before
 * reverting to its normal state. */
const MOMENT_DECAY_MS = 6000

interface CharmMomentContextValue {
  activeMoment: CharmMomentType | null
  fireMoment: (type: CharmMomentType) => void
}

const CharmMomentContext = createContext<CharmMomentContextValue | null>(null)

export function CharmMomentProvider({ children }: { children: ReactNode }) {
  const [activeMoment, setActiveMoment] = useState<CharmMomentType | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fireMoment = useCallback((type: CharmMomentType) => {
    if (timer.current) clearTimeout(timer.current)
    setActiveMoment(type)
    timer.current = setTimeout(() => {
      timer.current = null
      setActiveMoment(null)
    }, MOMENT_DECAY_MS)
  }, [])

  return <CharmMomentContext.Provider value={{ activeMoment, fireMoment }}>{children}</CharmMomentContext.Provider>
}

export function useCharmMoment() {
  const ctx = useContext(CharmMomentContext)
  if (!ctx) throw new Error('useCharmMoment must be used within a CharmMomentProvider')
  return ctx
}
