import { useReducedMotion } from 'motion/react'
import { useAllowAmbientMotion } from '#/lib/use-ambient-motion'

/**
 * The dashboard's own, much-more-subtle atmosphere layer — see the .charm-atmosphere rules in
 * styles.css for exact numbers. Deliberately a separate component from the global .charm-mesh
 * (which is `position: fixed` and mounted once in __root.tsx for every route) rather than a
 * variant of it, since this needs to be scoped to the dashboard route's own content box only.
 *
 * Renders nothing under reduced-motion or below the desktop breakpoint — same convention
 * DecorativeShapes uses — since a static, barely-visible blob adds no value if it can't drift.
 */
export function DashboardAtmosphere() {
  const prefersReducedMotion = useReducedMotion()
  const allowAmbientMotion = useAllowAmbientMotion()

  if (prefersReducedMotion || !allowAmbientMotion) return null

  return (
    <div className="charm-atmosphere" aria-hidden="true">
      <div className="charm-atmosphere-blob charm-atmosphere-blob-1" />
      <div className="charm-atmosphere-blob charm-atmosphere-blob-2" />
      <div className="charm-atmosphere-blob charm-atmosphere-blob-3" />
    </div>
  )
}
