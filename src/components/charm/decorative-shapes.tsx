// Scattered blurred clouds/diamonds/flowers used behind page content for the CharmOS
// mesh-gradient aesthetic. Purely decorative — non-interactive.
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'

export type ShapeIntensity = 'full' | 'toned-down' | 'minimal'

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
  // Abstract "glassy" flowers: white/very-transparent-pastel fill + a faint white edge stroke
  // (rendered per-petal in FlowerShape) standing in for true backdrop-blur glassmorphism, which
  // wouldn't read as glass here — there's nothing but the page background behind this layer.
  { kind: 'flower', top: '12%', right: '22%', size: 130, color: '#ffffff', opacity: 0.22, blur: 1, glow: true, driftX: 10, driftDuration: 21 },
  { kind: 'flower', bottom: '6%', left: '28%', size: 150, color: 'var(--charm-pink)', opacity: 0.2, blur: 1, driftX: -12, driftDuration: 16 },
]

/** Lower-opacity, fewer-shapes variants for data-dense views — same shapes, toned down rather than a different set to keep things simple. */
const INTENSITY_SETTINGS: Record<ShapeIntensity, { shapes: Array<Shape>; opacityScale: number; animate: boolean }> = {
  full: { shapes: DEFAULT_SHAPES, opacityScale: 1, animate: true },
  'toned-down': { shapes: DEFAULT_SHAPES, opacityScale: 0.6, animate: true },
  minimal: { shapes: DEFAULT_SHAPES.slice(0, 2), opacityScale: 0.5, animate: false },
}

/** A small pulsing/glowing accent — a dot, a tiny diamond, or a tiny star, cycled by index. */
interface Glimmer {
  left: string
  top: string
  size: number
  delay: number
  duration: number
  shape: 'dot' | 'diamond' | 'star'
}

const GLIMMER_COUNT: Record<ShapeIntensity, number> = { full: 12, 'toned-down': 7, minimal: 3 }
const GLIMMER_SHAPES: Array<Glimmer['shape']> = ['dot', 'diamond', 'star']

/** Deterministic (not Math.random) so server and client render the same layout — avoids a hydration mismatch. */
function generateGlimmers(count: number): Array<Glimmer> {
  return Array.from({ length: count }, (_, i) => {
    const shape = GLIMMER_SHAPES[i % GLIMMER_SHAPES.length]
    return {
      left: `${(i * 29 + 7) % 96}%`,
      top: `${(i * 53 + 13) % 92}%`,
      size: shape === 'dot' ? 2 + (i % 3) : 10 + (i % 3) * 3,
      delay: (i * 0.6) % 3.5,
      duration: 2.6 + (i % 3) * 0.6,
      shape,
    }
  })
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

function StarShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <path d="M50 2 L61 37 L98 37 L68 59 L79 95 L50 73 L21 95 L32 59 L2 37 L39 37 Z" fill={color} />
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

/** Abstract flower: 6 overlapping petal circles + a center circle, each with a faint white edge
 * to suggest a translucent glass petal rather than a flat-filled blob. */
function FlowerShape({ size, color }: { size: number; color: string }) {
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
        <circle key={i} cx={p.x} cy={p.y} r={petalR} fill={color} stroke="white" strokeOpacity={0.5} strokeWidth={1} />
      ))}
      <circle cx={cx} cy={cy} r={centerR} fill={color} stroke="white" strokeOpacity={0.5} strokeWidth={1} />
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

function renderGlimmerShape(shape: Glimmer['shape'], size: number) {
  switch (shape) {
    case 'diamond':
      return <DiamondShape size={size} color="#ffffff" />
    case 'star':
      return <StarShape size={size} color="#ffffff" />
    case 'dot':
      return null
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
  const glimmers = useMemo(() => generateGlimmers(GLIMMER_COUNT[intensity]), [intensity])

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

      {glimmers.map((g, i) => {
        const isDot = g.shape === 'dot'
        const className = isDot ? 'absolute rounded-full bg-white' : 'absolute'
        const style: CSSProperties = { left: g.left, top: g.top, width: g.size, height: g.size }
        const content = renderGlimmerShape(g.shape, g.size)

        if (!shouldAnimate) {
          return (
            <div key={`glimmer-${i}`} className={className} style={{ ...style, opacity: 0.5 }}>
              {content}
            </div>
          )
        }

        return (
          <motion.div
            key={`glimmer-${i}`}
            className={className}
            style={style}
            animate={{ opacity: [0.15, 0.95, 0.15], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: g.duration, repeat: Infinity, ease: 'easeInOut', delay: g.delay }}
          >
            {content}
          </motion.div>
        )
      })}
    </div>
  )
}
