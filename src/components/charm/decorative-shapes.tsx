// Scattered blurred clouds/diamonds used behind page content for the CharmOS
// mesh-gradient aesthetic. Purely decorative — non-interactive.
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

export type ShapeIntensity = 'full' | 'toned-down' | 'minimal'

interface Shape {
  kind: 'diamond' | 'cloud'
  top?: string
  left?: string
  right?: string
  bottom?: string
  size: number
  color: string
  opacity: number
  blur: number
  rotate?: number
  /** Adds a soft drop-shadow so a white/bright shape stays visible against the (also pale) light-mode background — muted shapes already have enough natural contrast without it. */
  glow?: boolean
  /** Ambient horizontal drift distance in px, and how long one drift cycle takes. */
  driftX: number
  driftDuration: number
}

const DEFAULT_SHAPES: Array<Shape> = [
  { kind: 'diamond', top: '4%', left: '6%', size: 90, color: '#ffffff', opacity: 0.7, blur: 1, rotate: -8, glow: true, driftX: 12, driftDuration: 15 },
  { kind: 'diamond', top: '58%', right: '4%', size: 120, color: 'var(--charm-lavender-deep)', opacity: 0.3, blur: 1, rotate: 12, driftX: -10, driftDuration: 19 },
  { kind: 'cloud', top: '38%', left: '2%', size: 160, color: '#ffffff', opacity: 0.75, blur: 2, glow: true, driftX: 16, driftDuration: 17 },
  { kind: 'cloud', bottom: '18%', right: '8%', size: 190, color: 'var(--accent)', opacity: 0.32, blur: 2, driftX: -14, driftDuration: 13 },
]

/** Lower-opacity, fewer-shapes variants for data-dense views — same shapes, toned down rather than a different set to keep things simple. */
const INTENSITY_SETTINGS: Record<ShapeIntensity, { shapes: Array<Shape>; opacityScale: number; animate: boolean }> = {
  full: { shapes: DEFAULT_SHAPES, opacityScale: 1, animate: true },
  'toned-down': { shapes: DEFAULT_SHAPES, opacityScale: 0.6, animate: true },
  minimal: { shapes: DEFAULT_SHAPES.slice(0, 2), opacityScale: 0.5, animate: false },
}

function DiamondShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <path
        d="M50 0 C54 34 66 46 100 50 C66 54 54 66 50 100 C46 66 34 54 0 50 C34 46 46 34 50 0 Z"
        fill={color}
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
      />
    </svg>
  )
}

function renderShape(shape: Shape) {
  switch (shape.kind) {
    case 'diamond':
      return <DiamondShape size={shape.size} color={shape.color} />
    case 'cloud':
      return <CloudShape size={shape.size} color={shape.color} />
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

export function DecorativeShapes({ intensity = 'full' }: { intensity?: ShapeIntensity }) {
  const prefersReducedMotion = useReducedMotion()
  const allowAmbientMotion = useAllowAmbientMotion()
  const { shapes, opacityScale, animate } = INTENSITY_SETTINGS[intensity]
  const shouldAnimate = animate && allowAmbientMotion && !prefersReducedMotion

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {shapes.map((shape, i) => {
        const baseStyle: CSSProperties = {
          top: shape.top,
          left: shape.left,
          right: shape.right,
          bottom: shape.bottom,
          opacity: shape.opacity * opacityScale,
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
    </div>
  )
}
