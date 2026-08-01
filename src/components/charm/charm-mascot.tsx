import { useEffect, useId, useRef, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'

/**
 * The CharmOS flower, ported from the waitlist project (charmos-waitlist's CharmMascot.tsx) rather
 * than reinvented — same five-petal mark, winking face, and heart message bubble as the shipped
 * app icon (public/logo.png), but as a live SVG so its expression and cursor-look can actually move.
 * A flat PNG can't do either without a sprite sheet of alternate expressions.
 *
 * Its own fill colors (#e8608f / #f284ab) already match --accent in light and dark mode
 * respectively, so it reads as on-brand in both themes without being wired to the theme context —
 * treat it like a logo mark, not a themed component.
 */

export type Mood = 'calm' | 'overwhelmed' | 'bright'

const ANGLES = Array.from({ length: 5 }, (_, i) => ((-90 + i * 72) * Math.PI) / 180)

/**
 * Cursor tracking, measured from each mascot's OWN centre rather than the viewport's, and shared
 * across every mounted instance via one window pointermove listener (rAF-batched) instead of one
 * listener + one getBoundingClientRect() read per instance per mousemove.
 */
const pointerSubscribers = new Set<(x: number, y: number) => void>()
let pointerBound = false
let pendingFrame = 0
let lastX = 0
let lastY = 0

function flushPointer() {
  pendingFrame = 0
  for (const fn of pointerSubscribers) fn(lastX, lastY)
}

function onWindowPointerMove(e: PointerEvent) {
  lastX = e.clientX
  lastY = e.clientY
  if (!pendingFrame) pendingFrame = requestAnimationFrame(flushPointer)
}

export function subscribePointer(fn: (x: number, y: number) => void) {
  pointerSubscribers.add(fn)
  if (!pointerBound) {
    window.addEventListener('pointermove', onWindowPointerMove, { passive: true })
    pointerBound = true
  }
  return () => {
    pointerSubscribers.delete(fn)
    if (pointerSubscribers.size === 0 && pointerBound) {
      window.removeEventListener('pointermove', onWindowPointerMove)
      pointerBound = false
      if (pendingFrame) cancelAnimationFrame(pendingFrame)
      pendingFrame = 0
    }
  }
}

export function usePointerLook(enabled: boolean, ref: React.RefObject<SVGSVGElement | null>) {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(mx, { stiffness: 55, damping: 17, mass: 0.9 })
  const y = useSpring(my, { stiffness: 55, damping: 17, mass: 0.9 })

  useEffect(() => {
    if (!enabled) return
    const SATURATE = 460 // px from the flower at which the look reaches full deflection
    return subscribePointer((cx, cy) => {
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      if (r.width === 0) return
      if (r.bottom < -200 || r.top > window.innerHeight + 200) return
      const dx = (cx - (r.left + r.width / 2)) / SATURATE
      const dy = (cy - (r.top + r.height / 2)) / SATURATE
      mx.set(Math.max(-1, Math.min(1, dx)))
      my.set(Math.max(-1, Math.min(1, dy)))
    })
  }, [enabled, mx, my, ref])

  return { x, y }
}

/** Cursor-following is a pointer affordance only — no hover on touch, and off under reduced motion. */
export function useFinePointer() {
  const [fine, setFine] = useState(false)
  useEffect(() => {
    const q = window.matchMedia('(pointer: fine)')
    setFine(q.matches)
    const on = (e: MediaQueryListEvent) => setFine(e.matches)
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])
  return fine
}

function Face({ mood }: { mood: Mood }) {
  if (mood === 'overwhelmed') {
    return (
      <g>
        <circle cx={84} cy={100} r={7.5} fill="#fffaf4" />
        <circle cx={122} cy={100} r={7.5} fill="#fffaf4" />
        <path d="M88 128 Q103 121 118 128" stroke="#fffaf4" strokeWidth={5} strokeLinecap="round" fill="none" />
      </g>
    )
  }
  if (mood === 'bright') {
    return (
      <g>
        <path d="M76 103 Q84 93 92 103" stroke="#fffaf4" strokeWidth={5} strokeLinecap="round" fill="none" />
        <path d="M114 103 Q122 93 130 103" stroke="#fffaf4" strokeWidth={5} strokeLinecap="round" fill="none" />
        <path d="M83 120 A20 20 0 0 0 123 120 Z" fill="#fffaf4" />
      </g>
    )
  }
  // Calm — the shipped icon's own expression: open eye, wink, open smile.
  return (
    <g>
      <ellipse cx={84} cy={100} rx={6.5} ry={11.5} fill="#fffaf4" />
      <path d="M112 105 Q122 93 132 105" stroke="#fffaf4" strokeWidth={5.5} strokeLinecap="round" fill="none" />
      <path d="M86 122 A18 18 0 0 0 122 122 Z" fill="#fffaf4" />
    </g>
  )
}

/** The heart message bubble that sits over the top-left petal in the app icon. */
function MessageBubble() {
  return (
    <g transform="rotate(-16 62 54)">
      <rect x={34} y={30} width={56} height={46} rx={13} fill="#ffffff" />
      <path d="M52 72 L58 86 L70 74 Z" fill="#ffffff" />
      <path
        d="M62 62 C52 55 50 48 55 44.5 C58.5 42 62 45 62 47.5 C62 45 65.5 42 69 44.5 C74 48 72 55 62 62 Z"
        fill="#e8608f"
      />
    </g>
  )
}

export function CharmMascot({
  mood = 'calm',
  size = 84,
  lookAtCursor = false,
  className = '',
}: {
  mood?: Mood
  size?: number
  /** Only the one hero instance should track the cursor — everywhere else the face stays idle,
   * so the mascot doesn't become an ambient "roaming" feature scattered across the interface. */
  lookAtCursor?: boolean
  className?: string
}) {
  const reduced = useReducedMotion()
  const finePointer = useFinePointer()
  const uid = useId().replace(/:/g, '')
  const fillId = `mascot-fill-${uid}`
  const softId = `mascot-soft-${uid}`
  const bloomId = `mascot-bloom-${uid}`

  const svgRef = useRef<SVGSVGElement>(null)
  const look = usePointerLook(lookAtCursor && finePointer && !reduced, svgRef)
  const faceX = useTransform(look.x, (v) => v * 19)
  const faceY = useTransform(look.y, (v) => v * 13)
  const faceRotate = useTransform(look.x, (v) => v * 4)
  const bodyX = useTransform(look.x, (v) => v * 5)
  const bodyY = useTransform(look.y, (v) => v * 3.5)

  const idle = reduced
    ? undefined
    : mood === 'overwhelmed'
      ? { y: [0, -2, 0, 2, 0], rotate: [0, -2.5, 0, 2.5, 0] }
      : mood === 'bright'
        ? { y: [0, -7, 0], rotate: [0, 3, 0] }
        : { y: [0, -4, 0], rotate: [0, -2, 0] }

  const duration = mood === 'overwhelmed' ? 1.6 : mood === 'bright' ? 2.4 : 4.2

  return (
    <motion.div
      className={className}
      style={{ width: size, height: size }}
      animate={idle}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      <svg ref={svgRef} viewBox="0 0 200 200" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id={fillId} cx="36%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#f284ab" />
            <stop offset="45%" stopColor="#e8608f" />
            <stop offset="100%" stopColor="#d94e80" />
          </radialGradient>
          <filter id={softId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
          <filter id={bloomId} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="11" />
          </filter>
        </defs>

        <g filter={`url(#${bloomId})`} opacity={0.42}>
          {ANGLES.map((a, i) => (
            <circle key={i} cx={100 + Math.cos(a) * 34} cy={104 + Math.sin(a) * 34} r={36} fill="#f078a4" />
          ))}
        </g>

        <motion.g style={{ x: bodyX, y: bodyY }}>
          <g filter={`url(#${softId})`}>
            {ANGLES.map((a, i) => (
              <circle
                key={i}
                cx={100 + Math.cos(a) * 34}
                cy={104 + Math.sin(a) * 34}
                r={36}
                fill={`url(#${fillId})`}
              />
            ))}
            <circle cx={100} cy={104} r={44} fill={`url(#${fillId})`} />
          </g>

          <motion.g style={{ x: faceX, y: faceY, rotate: faceRotate, transformBox: 'fill-box', transformOrigin: 'center' }}>
            <Face mood={mood} />
          </motion.g>

          <MessageBubble />
        </motion.g>
      </svg>
    </motion.div>
  )
}
