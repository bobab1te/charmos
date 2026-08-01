import { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { clamp01, ramp3 } from '#/lib/color-ramp'

/**
 * The hero's celestial body: one object that is a sun in daylight and a true crescent moon at
 * night, with sunset in between. Driven entirely by the `phase` scalar from sky-phase.ts, so it can
 * never fall out of step with the background — they read the same number.
 *
 * The crescent is a real crescent: a disc with a second, offset disc subtracted from it via an SVG
 * mask, and the offset slides in as night falls. It is emphatically NOT built from the flower's
 * petals — the flower mark is the mascot's job, and a moon made of petals reads as neither.
 *
 * Colour comes from the same liquid technique as the waitlist's orb — blurred ellipses drifting
 * inside the mask rather than a static gradient — so the surface never looks like flat vector art.
 */

/**
 * Daytime stops are deliberately deeper than a "realistic" pale sun would be: the light-mode page
 * background is itself a warm cream-to-amber mesh, and a pale sun on it simply disappears. These
 * read as a sun *because* they are a shade stronger than the sky behind them.
 */
const FIELDS = [
  { cx: 86, cy: 78, rx: 46, ry: 42, day: '#fff0cc', dusk: '#ffd9b4', night: '#f1ecff', dur: 24, dx: 6, dy: -5, o: 0.8 },
  { cx: 118, cy: 96, rx: 44, ry: 46, day: '#ffc06d', dusk: '#ffa878', night: '#c9b6f4', dur: 29, dx: -5, dy: 7, o: 0.72 },
  { cx: 94, cy: 122, rx: 48, ry: 40, day: '#ff8f52', dusk: '#ec6f85', night: '#9c86dc', dur: 34, dx: 5, dy: 6, o: 0.68 },
  { cx: 110, cy: 70, rx: 34, ry: 32, day: '#ffdf96', dusk: '#ffc09a', night: '#dcd2fb', dur: 31, dx: 4, dy: 6, o: 0.44 },
]

const FILL_TRANSITION = { duration: 1.2, ease: 'easeInOut' } as const

export function CharmCelestial({ phase, className }: { phase: number; className?: string }) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion
  const uid = useId().replace(/:/g, '')
  const maskId = `charm-celestial-mask-${uid}`
  const softId = `charm-celestial-soft-${uid}`
  const liquidId = `charm-celestial-liquid-${uid}`
  const bloomId = `charm-celestial-bloom-${uid}`

  // The bite only starts biting well after the sun has begun to set, so dusk still reads as a low,
  // deep-orange sun rather than an early moon.
  const bite = clamp01((phase - 0.42) / 0.44)
  const biteCx = 226 - bite * 92
  // The crescent tilts as it forms — a perfectly upright crescent looks like a logo, not a moon.
  const tilt = bite * -18

  const base = ramp3('#ffab55', '#ef7a72', '#a78fe0', phase)
  // The sun carries a stronger halo than the moon: a crescent's glow has to stay tight to the
  // sliver or it fills the bite back in and the crescent stops reading.
  const glowOpacity = 0.66 - bite * 0.26

  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        {/* Constant soft feather — atmospheric edges rather than a crisp graphic. */}
        <filter id={softId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.4" />
        </filter>
        <filter id={liquidId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id={bloomId} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="18" />
        </filter>

        <mask id={maskId}>
          <g filter={`url(#${softId})`}>
            <circle cx={100} cy={100} r={58} fill="#fff" />
            {/* The subtraction that makes it a crescent. Parked off to the right in daylight, where
                it has nothing to subtract, and slid across the disc as night falls. */}
            <motion.circle
              cy={92}
              r={62}
              fill="#000"
              animate={{ cx: biteCx }}
              transition={FILL_TRANSITION}
            />
          </g>
        </mask>
      </defs>

      <motion.g animate={{ rotate: tilt }} transition={FILL_TRANSITION} style={{ originX: '100px', originY: '100px' }}>
        {/* Bloom is masked *before* it is blurred, so once the crescent forms the glow comes off the
            lit sliver rather than sitting behind it as a full disc — which would read as a full moon
            parked behind a crescent. */}
        <g filter={`url(#${bloomId})`} opacity={glowOpacity}>
          <g mask={`url(#${maskId})`}>
            <motion.rect x={0} y={0} width={200} height={200} animate={{ fill: base }} transition={FILL_TRANSITION} />
          </g>
        </g>

        <g mask={`url(#${maskId})`}>
          <motion.rect x={0} y={0} width={200} height={200} animate={{ fill: base }} transition={FILL_TRANSITION} />
          <g filter={`url(#${liquidId})`}>
            {FIELDS.map((f, i) => (
              <motion.g
                key={i}
                animate={animate ? { x: [0, f.dx, 0], y: [0, f.dy, 0] } : undefined}
                transition={{ duration: f.dur, repeat: Infinity, ease: 'easeInOut' }}
              >
                <motion.ellipse
                  cx={f.cx}
                  cy={f.cy}
                  rx={f.rx}
                  ry={f.ry}
                  opacity={f.o}
                  animate={{ fill: ramp3(f.day, f.dusk, f.night, phase) }}
                  transition={FILL_TRANSITION}
                />
              </motion.g>
            ))}
          </g>
          {/* Specular highlight — keeps the surface convex rather than flat. */}
          <ellipse cx={84} cy={80} rx={34} ry={30} fill="#fffdf6" opacity={0.28} filter={`url(#${liquidId})`} />
        </g>
      </motion.g>
    </svg>
  )
}
