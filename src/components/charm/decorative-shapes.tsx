// Scattered glowing sparkles used behind page content for the CharmOS ombre background.
// Purely decorative — non-interactive. Clouds/flowers/big accent diamonds were dropped in
// favor of just sparkles (stars + fine dust) when the background moved to a plain ombre —
// see charmos-background-revamp-mockup. CloudShape/FlowerShape stay exported since
// login-decor.tsx still uses them for the sign-up page's own decoration.
import { motion, useReducedMotion } from 'motion/react'
import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useAllowAmbientMotion } from '#/lib/use-ambient-motion'

/** Each authenticated page gets its own fixed (not randomized) arrangement — see PAGE_CONFIGS. */
export type PageKey = 'dashboard' | 'pipeline' | 'scrapbook' | 'finances' | 'settings' | 'analytics' | 'default'

/** A small-to-medium-small 4-point star that pulses opacity/scale and glows with a soft white
 * aura (a layered drop-shadow). Hand-placed per page rather than generated, so they can be
 * "spaced out well" deliberately instead of relying on a formula to avoid clumping. */
interface GlimmerStar {
  top?: string
  left?: string
  right?: string
  bottom?: string
  size: number
  delay: number
  duration: number
}

interface PageConfig {
  stars: Array<GlimmerStar>
  /**
   * Pairs of star indices to join with a faint line. Dark mode only — the stroke token resolves
   * to transparent in light, where a pale line has nothing to sit against and just reads as a
   * smudge. Kept to two or three per page: a constellation is suggestive because it is partial,
   * and joining everything would turn the backdrop into a mesh.
   */
  constellations?: Array<[number, number]>
  /** Tiny plain pulsing dots — cheap ambient texture, count only (positions still generated, unlike the stars above). */
  dotCount: number
  animate: boolean
}

const PAGE_CONFIGS: Record<PageKey, PageConfig> = {
  dashboard: {
    stars: [
      { top: '10%', left: '12%', size: 20, delay: 0, duration: 3 },
      { top: '12%', right: '12%', size: 18, delay: 0.5, duration: 2.8 },
      { top: '50%', left: '6%', size: 18, delay: 1.1, duration: 3.4 },
      { top: '48%', right: '6%', size: 22, delay: 1.6, duration: 3.1 },
      { bottom: '10%', left: '16%', size: 20, delay: 2.2, duration: 2.6 },
      { bottom: '8%', right: '14%', size: 20, delay: 1.9, duration: 2.9 },
      { top: '30%', left: '3%', size: 16, delay: 0.3, duration: 3.2 },
      { top: '32%', right: '3%', size: 18, delay: 1.3, duration: 2.7 },
      { bottom: '38%', left: '8%', size: 20, delay: 2.5, duration: 3 },
      { bottom: '36%', right: '9%', size: 16, delay: 0.8, duration: 3.4 },
      { top: '4%', left: '40%', size: 14, delay: 0.4, duration: 3 },
      { top: '68%', left: '3%', size: 16, delay: 1.7, duration: 3.3 },
      { top: '66%', right: '3%', size: 18, delay: 0.6, duration: 2.9 },
      { bottom: '4%', left: '46%', size: 14, delay: 2.1, duration: 3.1 },
    ],
    constellations: [[0, 6], [3, 7]],
    dotCount: 18,
    animate: true,
  },
  pipeline: {
    stars: [
      { top: '20%', left: '10%', size: 22, delay: 0, duration: 3 },
      { top: '10%', right: '14%', size: 18, delay: 0.7, duration: 3.3 },
      { top: '65%', left: '5%', size: 26, delay: 1.4, duration: 2.7 },
      { top: '55%', right: '6%', size: 20, delay: 2, duration: 3.5 },
      { top: '85%', left: '14%', size: 30, delay: 0.4, duration: 3 },
      { top: '28%', right: '10%', size: 24, delay: 1.8, duration: 2.9 },
      { top: '92%', left: '18%', size: 18, delay: 2.5, duration: 3.2 },
      { top: '75%', right: '4%', size: 16, delay: 0.2, duration: 3.1 },
      { bottom: '18%', left: '4%', size: 20, delay: 1.1, duration: 2.9 },
      { top: '4%', left: '4%', size: 16, delay: 0.9, duration: 3 },
      { top: '42%', left: '18%', size: 14, delay: 1.5, duration: 3.4 },
      { bottom: '6%', right: '18%', size: 18, delay: 0.3, duration: 2.8 },
      { top: '18%', right: '3%', size: 14, delay: 2.2, duration: 3.2 },
    ],
    constellations: [[0, 1]],
    dotCount: 14,
    animate: true,
  },
  scrapbook: {
    stars: [
      { top: '18%', left: '12%', size: 24, delay: 0, duration: 2.9 },
      { top: '8%', right: '18%', size: 20, delay: 0.6, duration: 3.4 },
      { top: '44%', left: '6%', size: 30, delay: 1.3, duration: 2.7 },
      { top: '38%', right: '8%', size: 18, delay: 1.9, duration: 3.1 },
      { top: '78%', left: '14%', size: 26, delay: 0.9, duration: 3.6 },
      { bottom: '6%', right: '16%', size: 22, delay: 2.3, duration: 3 },
      { top: '68%', left: '12%', size: 28, delay: 1.6, duration: 2.8 },
      { bottom: '30%', left: '4%', size: 18, delay: 0.3, duration: 3 },
      { top: '58%', right: '4%', size: 20, delay: 1.5, duration: 3.3 },
      { top: '4%', left: '40%', size: 16, delay: 0.5, duration: 3.1 },
      { bottom: '4%', left: '20%', size: 16, delay: 1.2, duration: 2.9 },
      { top: '26%', right: '20%', size: 14, delay: 2, duration: 3.2 },
      { bottom: '46%', right: '5%', size: 18, delay: 0.8, duration: 3 },
    ],
    constellations: [[0, 1]],
    dotCount: 14,
    animate: true,
  },
  // The one view where number-accuracy is the point — fewest, dimmest sparkles and no motion.
  finances: {
    stars: [
      { top: '50%', left: '10%', size: 16, delay: 0, duration: 3 },
      { top: '70%', right: '12%', size: 16, delay: 0.5, duration: 3 },
      { top: '14%', right: '14%', size: 14, delay: 1, duration: 3 },
      { top: '8%', left: '8%', size: 14, delay: 0.3, duration: 3 },
      { bottom: '10%', left: '30%', size: 14, delay: 0.8, duration: 3 },
    ],
    constellations: [[0, 1]],
    dotCount: 5,
    animate: false,
  },
  settings: {
    stars: [
      { top: '16%', left: '12%', size: 20, delay: 0, duration: 3.2 },
      { top: '20%', right: '12%', size: 24, delay: 0.7, duration: 2.9 },
      { top: '60%', left: '8%', size: 18, delay: 1.4, duration: 3.4 },
      { top: '72%', right: '10%', size: 26, delay: 2, duration: 3 },
      { bottom: '8%', left: '16%', size: 20, delay: 0.9, duration: 3.3 },
      { top: '38%', left: '4%', size: 18, delay: 0.4, duration: 3.1 },
      { bottom: '46%', right: '4%', size: 20, delay: 1.2, duration: 2.8 },
      { top: '4%', left: '40%', size: 14, delay: 0.6, duration: 3 },
      { bottom: '4%', right: '30%', size: 16, delay: 1.6, duration: 3.2 },
      { top: '46%', right: '20%', size: 14, delay: 2.1, duration: 2.9 },
    ],
    constellations: [[0, 1]],
    dotCount: 11,
    animate: true,
  },
  analytics: {
    stars: [
      { top: '24%', left: '12%', size: 22, delay: 0, duration: 3 },
      { top: '8%', right: '12%', size: 18, delay: 0.6, duration: 3.4 },
      { top: '54%', left: '4%', size: 28, delay: 1.3, duration: 2.8 },
      { top: '44%', right: '6%', size: 20, delay: 1.9, duration: 3.1 },
      { bottom: '10%', left: '16%', size: 24, delay: 0.9, duration: 3.5 },
      { top: '66%', left: '4%', size: 18, delay: 0.5, duration: 3 },
      { bottom: '28%', right: '4%', size: 20, delay: 1.4, duration: 3.2 },
      { top: '4%', left: '36%', size: 14, delay: 0.3, duration: 3 },
      { bottom: '4%', right: '32%', size: 16, delay: 1.7, duration: 2.9 },
      { top: '34%', right: '22%', size: 14, delay: 2.2, duration: 3.3 },
    ],
    constellations: [[0, 1]],
    dotCount: 11,
    animate: true,
  },
  default: {
    stars: [
      { top: '18%', left: '12%', size: 20, delay: 0, duration: 3 },
      { top: '70%', right: '14%', size: 24, delay: 0.8, duration: 3.2 },
      { top: '40%', left: '6%', size: 18, delay: 1.5, duration: 2.9 },
      { bottom: '40%', left: '4%', size: 18, delay: 0.3, duration: 3 },
      { top: '54%', right: '4%', size: 20, delay: 1.1, duration: 2.9 },
      { top: '6%', left: '42%', size: 14, delay: 0.6, duration: 3.1 },
      { bottom: '8%', right: '30%', size: 16, delay: 1.8, duration: 2.8 },
    ],
    dotCount: 10,
    animate: true,
  },
}

/** Deterministic (not Math.random) so server and client render the same layout — avoids a
 * hydration mismatch. Biased toward the four edges (via `edge`/`inset`) rather than spread
 * uniformly across the page, so the "sparkle" texture reads as a border rather than dots
 * scattered over the content area. */
function generateDots(
  count: number,
): Array<{ left: string; top: string; size: number; delay: number; duration: number; driftX: number; driftY: number }> {
  return Array.from({ length: count }, (_, i) => {
    const edge = i % 4 // 0 top, 1 right, 2 bottom, 3 left
    const along = `${(i * 37 + 11) % 100}%`
    const inset = `${(i * 13 + 5) % 12}%`
    const insetFar = `${100 - ((i * 13 + 5) % 12)}%`
    const position =
      edge === 0
        ? { left: along, top: inset }
        : edge === 1
          ? { left: insetFar, top: along }
          : edge === 2
            ? { left: along, top: insetFar }
            : { left: inset, top: along }
    return {
      ...position,
      size: 2 + (i % 3),
      delay: (i * 0.6) % 3.5,
      duration: 2.6 + (i % 3) * 0.6,
      driftX: ((i * 7) % 5) - 2,
      driftY: ((i * 11) % 5) - 2,
    }
  })
}

/** A subtle white edge on every shape's fill — the "slightly glassmorphism" touch. True
 * backdrop-blur glassmorphism (frosting whatever's behind an element) doesn't apply to a layer
 * that sits behind all real content with nothing behind it but the page background, so this is
 * the stand-in: a soft light rim rather than an actual frosted-glass blur. */
const GLASS_EDGE = { stroke: 'white', strokeOpacity: 0.4, strokeWidth: 1 }

/**
 * The soft white aura every CharmOS sparkle wears — three stacked drop-shadows rather than one,
 * so the falloff has a bright core and a wide dim halo instead of a single flat blur. Exported so
 * the login page wears the identical glow rather than an approximation of it.
 */
export const SPARKLE_GLOW = 'var(--sparkle-glow)'

/**
 * The 4-point star, glow included. This is the shape used behind every authenticated page; the
 * login page imports it so there is one sparkle in the product, not two that drift apart.
 */
export function GlimmerSparkle({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, filter: SPARKLE_GLOW }}>
      <DiamondShape size={size} color="var(--sparkle-fill)" />
    </div>
  )
}

function DiamondShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <path
        d="M50 0 C54 34 66 46 100 50 C66 54 54 66 50 100 C46 66 34 54 0 50 C34 46 46 34 50 0 Z"
        fill={color}
        {...GLASS_EDGE}
      />
    </svg>
  )
}

/** Unused within this file since the mesh background went plain-ombre, but kept exported for
 * decorative use elsewhere. */
export function CloudShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 160 96" fill="none">
      <path
        d="M40 76c-16 0-28-11-28-25 0-13 10-23 23-25 3-14 16-24 31-24 14 0 26 9 30 22 15 1 27 13 27 27 0 15-13 25-29 25H40Z"
        fill={color}
        {...GLASS_EDGE}
      />
    </svg>
  )
}

/** Abstract flower: 6 overlapping petal circles + a center circle, each with a faint white edge
 * to suggest a translucent glass petal rather than a flat-filled blob. Unused within this file
 * (see CloudShape comment above) but kept exported. */
export function FlowerShape({ size, color }: { size: number; color: string }) {
  const cx = size / 2
  const cy = size / 2
  const orbit = size * 0.26
  const petalR = size * 0.26
  const centerR = size * 0.16
  const petals = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2
    return { x: cx + Math.cos(angle) * orbit, y: cy + Math.sin(angle) * orbit }
  })
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      {petals.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={petalR} fill={color} {...GLASS_EDGE} />
      ))}
      <circle cx={cx} cy={cy} r={centerR} fill={color} {...GLASS_EDGE} />
    </svg>
  )
}

/**
 * A star's centre as a percentage of the container, whichever edge it was anchored from.
 *
 * Stars are hand-placed with whatever pair of edges read most naturally at authoring time
 * (`top`/`right`, `bottom`/`left`, …), so joining two of them means normalising to one origin
 * first. `right: 12%` is the same point as `left: 88%`; the size offset is ignored because it is
 * a handful of pixels against a percentage and the line reads as touching either way.
 */
function starPoint(s: GlimmerStar): { x: number; y: number } | null {
  const num = (v?: string) => (v && v.endsWith('%') ? parseFloat(v) : null)
  const l = num(s.left)
  const r = num(s.right)
  const t = num(s.top)
  const b = num(s.bottom)
  const x = l ?? (r === null ? null : 100 - r)
  const y = t ?? (b === null ? null : 100 - b)
  return x === null || y === null ? null : { x, y }
}

export function DecorativeShapes({ page = 'default' }: { page?: PageKey }) {
  const prefersReducedMotion = useReducedMotion()
  const allowAmbientMotion = useAllowAmbientMotion()
  const config = PAGE_CONFIGS[page]
  const shouldAnimate = config.animate && allowAmbientMotion && !prefersReducedMotion
  const dots = useMemo(() => generateDots(config.dotCount), [config.dotCount])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/*
        Constellation lines, behind the stars so each line runs under the glow rather than across
        it. The stroke token is transparent in light mode, so this renders to nothing there
        without the component needing to know which theme is active.
      */}
      {config.constellations && config.constellations.length > 0 && (
        <svg className="absolute inset-0 size-full" preserveAspectRatio="none">
          {config.constellations.map(([a, b], i) => {
            const p1 = config.stars[a] && starPoint(config.stars[a])
            const p2 = config.stars[b] && starPoint(config.stars[b])
            if (!p1 || !p2) return null
            return (
              <line
                key={`line-${i}`}
                x1={`${p1.x}%`}
                y1={`${p1.y}%`}
                x2={`${p2.x}%`}
                y2={`${p2.y}%`}
                stroke="var(--constellation-line)"
                strokeWidth={1}
              />
            )
          })}
        </svg>
      )}

      {config.stars.map((s, i) => {
        const style: CSSProperties = {
          top: s.top,
          left: s.left,
          right: s.right,
          bottom: s.bottom,
          width: s.size,
          height: s.size,
          filter: SPARKLE_GLOW,
        }

        if (!shouldAnimate) {
          return (
            <div key={`star-${i}`} className="absolute" style={{ ...style, opacity: 0.8 }}>
              <DiamondShape size={s.size} color="var(--sparkle-fill)" />
            </div>
          )
        }

        return (
          <motion.div
            key={`star-${i}`}
            className="absolute"
            style={style}
            animate={{ opacity: [0.35, 1, 0.35], scale: [0.8, 1.3, 0.8] }}
            transition={{ duration: s.duration, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
          >
            <DiamondShape size={s.size} color="var(--sparkle-fill)" />
          </motion.div>
        )
      })}

      {dots.map((d, i) =>
        shouldAnimate ? (
          <motion.div
            key={`dot-${i}`}
            className="absolute rounded-full bg-white"
            style={{ left: d.left, top: d.top, width: d.size, height: d.size }}
            animate={{ opacity: [0.15, 0.95, 0.15], scale: [0.8, 1.2, 0.8], x: [0, d.driftX, 0], y: [0, d.driftY, 0] }}
            transition={{ duration: d.duration, repeat: Infinity, ease: 'easeInOut', delay: d.delay }}
          />
        ) : (
          <div
            key={`dot-${i}`}
            className="absolute rounded-full bg-white"
            style={{ left: d.left, top: d.top, width: d.size, height: d.size, opacity: 0.5 }}
          />
        ),
      )}
    </div>
  )
}
