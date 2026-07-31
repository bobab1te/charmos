import { useEffect, useState } from 'react'

/** Ambient drift only kicks in at `lg`+ — cheap on desktop, skipped on mobile/tablet where
 * compositor headroom is tighter and the shapes are less likely to be the point of focus
 * anyway. Shared by DecorativeShapes and DashboardAtmosphere so there's one matchMedia listener,
 * not one per consumer. */
export function useAllowAmbientMotion() {
  const [allowed, setAllowed] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    setAllowed(query.matches)
    const handler = (e: MediaQueryListEvent) => setAllowed(e.matches)
    query.addEventListener('change', handler)
    return () => query.removeEventListener('change', handler)
  }, [])
  return allowed
}
