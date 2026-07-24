// Scattered blurred clouds/diamonds/flowers used behind page content for the CharmOS
// mesh-gradient aesthetic. Purely decorative — non-interactive.
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'

/** Each authenticated page gets its own fixed (not randomized) arrangement — see PAGE_CONFIGS. */
export type PageKey = 'dashboard' | 'pipeline' | 'scrapbook' | 'finances' | 'settings' | 'analytics' | 'default'

interface Shape {
  kind: 'diamond' | 'cloud' | 'flower'
  top?: string
  left?: string
  right?: string
  bottom?: string
  size: number
  color: string
  opacity: number
  blur: number
  rotate?: number
  /** Adds a soft drop-shadow so a white/pale shape stays visible against the (also pale) light-mode background — a couple of the more saturated accents don't need it. */
  glow?: boolean
  /** Ambient horizontal drift distance in px, and how long one drift cycle takes. */
  driftX: number
  driftDuration: number
}

/** A small-to-medium-small 4-point star that pulses opacity/scale and glows with a soft white
 * aura (a layered drop-shadow) — distinct from the ambient drifting shapes above, and from the
 * tiny plain dots below. Hand-placed per page rather than generated, so they can be "spaced out
 * well" deliberately instead of relying on a formula to avoid clumping. */
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
  shapes: Array<Shape>
  stars: Array<GlimmerStar>
  /** Tiny plain pulsing dots — cheap ambient texture, count only (positions still generated, unlike the stars above). */
  dotCount: number
  animate: boolean
}

const PALETTE = ['#ffffff', 'var(--charm-pink)', 'var(--charm-blue)']

const PAGE_CONFIGS: Record<PageKey, PageConfig> = {
  // Dialed back from an earlier, busier pass — fewer shapes, all hugging the edges so nothing
  // competes with the dashboard's own ParallaxHero or the content column.
  dashboard: {
    shapes: [
      { kind: 'diamond', top: '4%', left: '5%', size: 90, color: PALETTE[0], opacity: 0.7, blur: 2, rotate: -8, glow: true, driftX: 12, driftDuration: 15 },
      { kind: 'diamond', top: '56%', right: '4%', size: 110, color: PALETTE[1], opacity: 0.42, blur: 2, rotate: 12, glow: true, driftX: -10, driftDuration: 19 },
      { kind: 'cloud', top: '26%', left: '3%', size: 145, color: PALETTE[2], opacity: 0.5, blur: 3, glow: true, driftX: 16, driftDuration: 17 },
      { kind: 'cloud', top: '42%', right: '3%', size: 120, color: PALETTE[0], opacity: 0.55, blur: 3, glow: true, driftX: -14, driftDuration: 13 },
      { kind: 'cloud', bottom: '8%', left: '4%', size: 130, color: PALETTE[1], opacity: 0.42, blur: 3, glow: true, driftX: 14, driftDuration: 20 },
      { kind: 'cloud', bottom: '14%', right: '6%', size: 110, color: PALETTE[2], opacity: 0.42, blur: 3, glow: true, driftX: -12, driftDuration: 14 },
      { kind: 'flower', top: '66%', left: '6%', size: 75, color: PALETTE[0], opacity: 0.22, blur: 2, glow: true, driftX: 8, driftDuration: 22 },
      { kind: 'flower', bottom: '30%', right: '5%', size: 85, color: PALETTE[1], opacity: 0.22, blur: 2, glow: true, driftX: -9, driftDuration: 18 },
    ],
    stars: [
      { top: '10%', left: '12%', size: 20, delay: 0, duration: 3 },
      { top: '12%', right: '12%', size: 18, delay: 0.5, duration: 2.8 },
      { top: '50%', left: '6%', size: 18, delay: 1.1, duration: 3.4 },
      { top: '48%', right: '6%', size: 22, delay: 1.6, duration: 3.1 },
      { bottom: '10%', left: '16%', size: 20, delay: 2.2, duration: 2.6 },
      { bottom: '8%', right: '14%', size: 20, delay: 1.9, duration: 2.9 },
    ],
    dotCount: 6,
    animate: true,
  },
  pipeline: {
    shapes: [
      { kind: 'diamond', top: '6%', right: '10%', size: 95, color: PALETTE[0], opacity: 0.6, blur: 2, rotate: 6, glow: true, driftX: -11, driftDuration: 18 },
      { kind: 'cloud', top: '6%', right: '8%', size: 130, color: PALETTE[1], opacity: 0.42, blur: 3, glow: true, driftX: 12, driftDuration: 16 },
      { kind: 'cloud', bottom: '16%', left: '4%', size: 150, color: PALETTE[2], opacity: 0.42, blur: 3, glow: true, driftX: -13, driftDuration: 20 },
      { kind: 'cloud', top: '48%', right: '3%', size: 110, color: PALETTE[0], opacity: 0.5, blur: 3, glow: true, driftX: 10, driftDuration: 15 },
      { kind: 'cloud', top: '32%', left: '3%', size: 95, color: PALETTE[1], opacity: 0.4, blur: 3, glow: true, driftX: 11, driftDuration: 19 },
      { kind: 'cloud', bottom: '6%', right: '12%', size: 105, color: PALETTE[2], opacity: 0.42, blur: 3, glow: true, driftX: -10, driftDuration: 17 },
      { kind: 'flower', top: '16%', left: '8%', size: 90, color: PALETTE[0], opacity: 0.22, blur: 2, glow: true, driftX: -9, driftDuration: 21 },
      { kind: 'flower', bottom: '10%', right: '10%', size: 80, color: PALETTE[1], opacity: 0.24, blur: 2, glow: true, driftX: 10, driftDuration: 17 },
      { kind: 'flower', bottom: '18%', left: '6%', size: 85, color: PALETTE[2], opacity: 0.22, blur: 2, glow: true, driftX: -8, driftDuration: 23 },
      { kind: 'flower', top: '52%', left: '10%', size: 65, color: PALETTE[0], opacity: 0.2, blur: 2, glow: true, driftX: 8, driftDuration: 20 },
      { kind: 'flower', bottom: '26%', right: '6%', size: 75, color: PALETTE[1], opacity: 0.22, blur: 2, glow: true, driftX: -8, driftDuration: 16 },
    ],
    stars: [
      { top: '20%', left: '10%', size: 22, delay: 0, duration: 3 },
      { top: '10%', right: '14%', size: 18, delay: 0.7, duration: 3.3 },
      { top: '65%', left: '5%', size: 26, delay: 1.4, duration: 2.7 },
      { top: '55%', right: '6%', size: 20, delay: 2, duration: 3.5 },
      { top: '85%', left: '14%', size: 30, delay: 0.4, duration: 3 },
      { top: '28%', right: '10%', size: 24, delay: 1.8, duration: 2.9 },
      { top: '92%', left: '18%', size: 18, delay: 2.5, duration: 3.2 },
    ],
    dotCount: 7,
    animate: true,
  },
  scrapbook: {
    shapes: [
      { kind: 'diamond', bottom: '30%', left: '8%', size: 90, color: PALETTE[0], opacity: 0.4, blur: 2, rotate: -10, glow: true, driftX: 11, driftDuration: 17 },
      { kind: 'cloud', top: '8%', left: '6%', size: 140, color: PALETTE[1], opacity: 0.42, blur: 3, glow: true, driftX: 13, driftDuration: 18 },
      { kind: 'cloud', bottom: '20%', right: '6%', size: 160, color: PALETTE[2], opacity: 0.42, blur: 3, glow: true, driftX: -15, driftDuration: 14 },
      { kind: 'cloud', top: '54%', left: '3%', size: 120, color: PALETTE[0], opacity: 0.5, blur: 3, glow: true, driftX: 12, driftDuration: 21 },
      { kind: 'cloud', top: '34%', right: '8%', size: 90, color: PALETTE[1], opacity: 0.4, blur: 3, glow: true, driftX: -10, driftDuration: 15 },
      { kind: 'cloud', bottom: '38%', left: '6%', size: 100, color: PALETTE[2], opacity: 0.42, blur: 3, glow: true, driftX: 10, driftDuration: 19 },
      { kind: 'flower', top: '22%', right: '10%', size: 90, color: PALETTE[0], opacity: 0.24, blur: 2, glow: true, driftX: -10, driftDuration: 19 },
      { kind: 'flower', bottom: '12%', left: '10%', size: 80, color: PALETTE[1], opacity: 0.22, blur: 2, glow: true, driftX: 9, driftDuration: 22 },
      { kind: 'flower', top: '62%', right: '8%', size: 90, color: PALETTE[2], opacity: 0.22, blur: 2, glow: true, driftX: -8, driftDuration: 16 },
      { kind: 'flower', top: '12%', left: '8%', size: 65, color: PALETTE[0], opacity: 0.2, blur: 2, glow: true, driftX: 8, driftDuration: 18 },
      { kind: 'flower', bottom: '4%', right: '12%', size: 75, color: PALETTE[1], opacity: 0.22, blur: 2, glow: true, driftX: -8, driftDuration: 20 },
    ],
    stars: [
      { top: '18%', left: '12%', size: 24, delay: 0, duration: 2.9 },
      { top: '8%', right: '18%', size: 20, delay: 0.6, duration: 3.4 },
      { top: '44%', left: '6%', size: 30, delay: 1.3, duration: 2.7 },
      { top: '38%', right: '8%', size: 18, delay: 1.9, duration: 3.1 },
      { top: '78%', left: '14%', size: 26, delay: 0.9, duration: 3.6 },
      { bottom: '6%', right: '16%', size: 22, delay: 2.3, duration: 3 },
      { top: '68%', left: '12%', size: 28, delay: 1.6, duration: 2.8 },
    ],
    dotCount: 7,
    animate: true,
  },
  // The one view where number-accuracy is the point — fewest, dimmest shapes and no motion at all.
  finances: {
    shapes: [
      { kind: 'diamond', top: '4%', left: '6%', size: 70, color: PALETTE[0], opacity: 0.4, blur: 2, rotate: -8, glow: true, driftX: 0, driftDuration: 1 },
      { kind: 'cloud', top: '8%', left: '4%', size: 110, color: PALETTE[1], opacity: 0.34, blur: 3, glow: true, driftX: 0, driftDuration: 1 },
      { kind: 'cloud', bottom: '14%', right: '6%', size: 100, color: PALETTE[2], opacity: 0.34, blur: 3, glow: true, driftX: 0, driftDuration: 1 },
      { kind: 'cloud', top: '10%', right: '10%', size: 80, color: PALETTE[0], opacity: 0.3, blur: 3, glow: true, driftX: 0, driftDuration: 1 },
      { kind: 'flower', bottom: '20%', left: '8%', size: 70, color: PALETTE[1], opacity: 0.18, blur: 2, glow: true, driftX: 0, driftDuration: 1 },
      { kind: 'flower', top: '44%', left: '6%', size: 60, color: PALETTE[2], opacity: 0.16, blur: 2, glow: true, driftX: 0, driftDuration: 1 },
    ],
    stars: [
      { top: '50%', left: '10%', size: 16, delay: 0, duration: 3 },
      { top: '70%', right: '12%', size: 16, delay: 0.5, duration: 3 },
      { top: '14%', right: '14%', size: 14, delay: 1, duration: 3 },
    ],
    dotCount: 3,
    animate: false,
  },
  settings: {
    shapes: [
      { kind: 'cloud', top: '10%', right: '10%', size: 120, color: PALETTE[0], opacity: 0.5, blur: 3, glow: true, driftX: 11, driftDuration: 18 },
      { kind: 'cloud', bottom: '12%', left: '8%', size: 130, color: PALETTE[1], opacity: 0.42, blur: 3, glow: true, driftX: -12, driftDuration: 15 },
      { kind: 'cloud', top: '48%', right: '8%', size: 90, color: PALETTE[2], opacity: 0.4, blur: 3, glow: true, driftX: 10, driftDuration: 19 },
      { kind: 'cloud', bottom: '6%', left: '10%', size: 80, color: PALETTE[0], opacity: 0.36, blur: 3, glow: true, driftX: -9, driftDuration: 16 },
      { kind: 'flower', top: '42%', left: '10%', size: 90, color: PALETTE[1], opacity: 0.22, blur: 2, glow: true, driftX: 9, driftDuration: 20 },
      { kind: 'flower', bottom: '28%', right: '10%', size: 85, color: PALETTE[2], opacity: 0.24, blur: 2, glow: true, driftX: -9, driftDuration: 17 },
      { kind: 'flower', top: '16%', left: '10%', size: 65, color: PALETTE[0], opacity: 0.2, blur: 2, glow: true, driftX: 8, driftDuration: 21 },
      { kind: 'flower', bottom: '44%', right: '6%', size: 70, color: PALETTE[1], opacity: 0.22, blur: 2, glow: true, driftX: -8, driftDuration: 18 },
    ],
    stars: [
      { top: '16%', left: '12%', size: 20, delay: 0, duration: 3.2 },
      { top: '20%', right: '12%', size: 24, delay: 0.7, duration: 2.9 },
      { top: '60%', left: '8%', size: 18, delay: 1.4, duration: 3.4 },
      { top: '72%', right: '10%', size: 26, delay: 2, duration: 3 },
      { bottom: '8%', left: '16%', size: 20, delay: 0.9, duration: 3.3 },
    ],
    dotCount: 5,
    animate: true,
  },
  analytics: {
    shapes: [
      { kind: 'cloud', top: '6%', left: '10%', size: 125, color: PALETTE[0], opacity: 0.5, blur: 3, glow: true, driftX: 12, driftDuration: 16 },
      { kind: 'cloud', bottom: '8%', right: '8%', size: 140, color: PALETTE[1], opacity: 0.42, blur: 3, glow: true, driftX: -13, driftDuration: 19 },
      { kind: 'cloud', top: '32%', right: '10%', size: 90, color: PALETTE[2], opacity: 0.4, blur: 3, glow: true, driftX: 10, driftDuration: 17 },
      { kind: 'cloud', bottom: '34%', left: '6%', size: 80, color: PALETTE[0], opacity: 0.36, blur: 3, glow: true, driftX: -9, driftDuration: 15 },
      { kind: 'flower', top: '58%', right: '12%', size: 95, color: PALETTE[1], opacity: 0.24, blur: 2, glow: true, driftX: 8, driftDuration: 21 },
      { kind: 'flower', bottom: '14%', left: '10%', size: 80, color: PALETTE[2], opacity: 0.22, blur: 2, glow: true, driftX: -10, driftDuration: 18 },
      { kind: 'flower', top: '12%', left: '10%', size: 65, color: PALETTE[0], opacity: 0.2, blur: 2, glow: true, driftX: 8, driftDuration: 20 },
      { kind: 'flower', bottom: '46%', right: '10%', size: 70, color: PALETTE[1], opacity: 0.22, blur: 2, glow: true, driftX: -8, driftDuration: 16 },
    ],
    stars: [
      { top: '24%', left: '12%', size: 22, delay: 0, duration: 3 },
      { top: '8%', right: '12%', size: 18, delay: 0.6, duration: 3.4 },
      { top: '54%', left: '4%', size: 28, delay: 1.3, duration: 2.8 },
      { top: '44%', right: '6%', size: 20, delay: 1.9, duration: 3.1 },
      { bottom: '10%', left: '16%', size: 24, delay: 0.9, duration: 3.5 },
    ],
    dotCount: 5,
    animate: true,
  },
  default: {
    shapes: [
      { kind: 'cloud', top: '8%', left: '6%', size: 120, color: PALETTE[0], opacity: 0.5, blur: 3, glow: true, driftX: 10, driftDuration: 17 },
      { kind: 'cloud', bottom: '10%', right: '8%', size: 130, color: PALETTE[1], opacity: 0.42, blur: 3, glow: true, driftX: -11, driftDuration: 20 },
      { kind: 'cloud', top: '38%', left: '8%', size: 85, color: PALETTE[2], opacity: 0.4, blur: 3, glow: true, driftX: 9, driftDuration: 15 },
      { kind: 'flower', top: '46%', right: '10%', size: 90, color: PALETTE[0], opacity: 0.22, blur: 2, glow: true, driftX: 9, driftDuration: 19 },
      { kind: 'flower', bottom: '14%', left: '10%', size: 70, color: PALETTE[1], opacity: 0.2, blur: 2, glow: true, driftX: -8, driftDuration: 18 },
    ],
    stars: [
      { top: '18%', left: '12%', size: 20, delay: 0, duration: 3 },
      { top: '70%', right: '14%', size: 24, delay: 0.8, duration: 3.2 },
      { top: '40%', left: '6%', size: 18, delay: 1.5, duration: 2.9 },
    ],
    dotCount: 5,
    animate: true,
  },
}

/** Deterministic (not Math.random) so server and client render the same layout — avoids a hydration mismatch. */
function generateDots(count: number): Array<{ left: string; top: string; size: number; delay: number; duration: number }> {
  return Array.from({ length: count }, (_, i) => ({
    left: `${(i * 29 + 7) % 96}%`,
    top: `${(i * 53 + 13) % 92}%`,
    size: 2 + (i % 3),
    delay: (i * 0.6) % 3.5,
    duration: 2.6 + (i % 3) * 0.6,
  }))
}

/** A subtle white edge on every shape's fill — the "slightly glassmorphism" touch. True
 * backdrop-blur glassmorphism (frosting whatever's behind an element) doesn't apply to a layer
 * that sits behind all real content with nothing behind it but the page background, so this is
 * the stand-in: a soft light rim rather than an actual frosted-glass blur. */
const GLASS_EDGE = { stroke: 'white', strokeOpacity: 0.4, strokeWidth: 1 }

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
 * to suggest a translucent glass petal rather than a flat-filled blob. */
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

function renderShape(shape: Shape) {
  switch (shape.kind) {
    case 'diamond':
      return <DiamondShape size={shape.size} color={shape.color} />
    case 'cloud':
      return <CloudShape size={shape.size} color={shape.color} />
    case 'flower':
      return <FlowerShape size={shape.size} color={shape.color} />
  }
}

/** Ambient drift only kicks in at `lg`+ — cheap on desktop, skipped on mobile/tablet where compositor headroom is tighter and the shapes are less likely to be the point of focus anyway. */
function useAllowAmbientMotion() {
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

export function DecorativeShapes({ page = 'default' }: { page?: PageKey }) {
  const prefersReducedMotion = useReducedMotion()
  const allowAmbientMotion = useAllowAmbientMotion()
  const config = PAGE_CONFIGS[page]
  const shouldAnimate = config.animate && allowAmbientMotion && !prefersReducedMotion
  const dots = useMemo(() => generateDots(config.dotCount), [config.dotCount])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {config.shapes.map((shape, i) => {
        const baseStyle: CSSProperties = {
          top: shape.top,
          left: shape.left,
          right: shape.right,
          bottom: shape.bottom,
          opacity: shape.opacity,
          filter: shape.glow
            ? `blur(${shape.blur}px) drop-shadow(0 4px 14px rgba(58, 46, 66, 0.12))`
            : `blur(${shape.blur}px)`,
        }
        const rotate = shape.rotate ? `rotate(${shape.rotate}deg)` : undefined

        if (!shouldAnimate) {
          return (
            <div key={i} className="charm-blob" style={{ ...baseStyle, transform: rotate }}>
              {renderShape(shape)}
            </div>
          )
        }

        return (
          <motion.div
            key={i}
            className="charm-blob"
            style={{ ...baseStyle, rotate: shape.rotate }}
            animate={{ x: [0, shape.driftX, 0] }}
            transition={{ duration: shape.driftDuration, repeat: Infinity, ease: 'easeInOut' }}
          >
            {renderShape(shape)}
          </motion.div>
        )
      })}

      {config.stars.map((s, i) => {
        const style: CSSProperties = {
          top: s.top,
          left: s.left,
          right: s.right,
          bottom: s.bottom,
          width: s.size,
          height: s.size,
          filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.9)) drop-shadow(0 0 11px rgba(255,255,255,0.5))',
        }

        if (!shouldAnimate) {
          return (
            <div key={`star-${i}`} className="absolute" style={{ ...style, opacity: 0.55 }}>
              <DiamondShape size={s.size} color="#ffffff" />
            </div>
          )
        }

        return (
          <motion.div
            key={`star-${i}`}
            className="absolute"
            style={style}
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.85, 1.15, 0.85] }}
            transition={{ duration: s.duration, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
          >
            <DiamondShape size={s.size} color="#ffffff" />
          </motion.div>
        )
      })}

      {dots.map((d, i) =>
        shouldAnimate ? (
          <motion.div
            key={`dot-${i}`}
            className="absolute rounded-full bg-white"
            style={{ left: d.left, top: d.top, width: d.size, height: d.size }}
            animate={{ opacity: [0.15, 0.95, 0.15], scale: [0.8, 1.2, 0.8] }}
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
