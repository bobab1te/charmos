import { useId, useRef } from 'react'
import { motion, useReducedMotion, useTransform } from 'motion/react'
import { usePointerLook, useFinePointer } from '#/components/charm/charm-mascot'
import { clamp01, num3, ramp3 } from '#/lib/color-ramp'

/**
 * The large hero character — the Charm.OS flower by day, a true crescent moon by night, and one
 * continuous shape morph in between. This is the dashboard's celestial body; the small assistant
 * mascot beside the greeting is a separate component and is not this.
 *
 * SOURCE OF TRUTH: the waitlist landing page's own CharmOrb. The flower silhouette, the drifting
 * liquid colour fields (its exact FIELDS table), the feathered mask, the bloom and the winking face
 * are all carried over rather than reinterpreted, so this is the same character.
 *
 * THE MORPH IS REAL GEOMETRY, not a crossfade between two drawings. Everything is one feathered
 * mask, and the mask's own numbers move:
 *
 *   flower    five petal circles orbiting the centre at r=38, plus a core circle
 *   bloom     the orbit radius collapses to 0 while each petal swells 36 -> 58, so the five petals
 *             physically merge into a single disc
 *   bite      a second disc slides in from the right and is subtracted, opening the negative space
 *             that makes a crescent
 *
 * Because it is one mask being reshaped, every in-between state is a real intermediate form — a
 * flower with softening petals, a full disc, a disc with a bite starting — rather than two graphics
 * dissolving into each other.
 *
 * The face is drawn OUTSIDE the mask on purpose. Inside it, the same bite that forms the crescent
 * would eat the expression; outside it, the wink survives the transformation and simply travels onto
 * the lit sliver, which is what keeps it feeling like one character changing form.
 */

/** Lifted verbatim from the waitlist's CharmOrb, with a dusk stop added for the sunset beat. */
const FIELDS = [
  { cx: 78, cy: 70, rx: 60, ry: 56, day: '#fff4e2', dusk: '#ffd9b4', night: '#efe6fb', dur: 23, dx: 8, dy: -6, o: 0.78 },
  { cx: 128, cy: 86, rx: 56, ry: 60, day: '#ffcf9d', dusk: '#ffb086', night: '#c3aef2', dur: 29, dx: -7, dy: 9, o: 0.7 },
  { cx: 96, cy: 132, rx: 64, ry: 52, day: '#ff9d78', dusk: '#ef7f92', night: '#8f7ad4', dur: 34, dx: 6, dy: 7, o: 0.62 },
  { cx: 74, cy: 108, rx: 54, ry: 50, day: '#ef6d9e', dusk: '#e0698f', night: '#d98cae', dur: 26, dx: -9, dy: -5, o: 0.6 },
  { cx: 112, cy: 104, rx: 46, ry: 48, day: '#e8608f', dusk: '#d96a86', night: '#b79cea', dur: 30, dx: 7, dy: -8, o: 0.5 },
  { cx: 118, cy: 58, rx: 40, ry: 38, day: '#fbdf9e', dusk: '#ffc49a', night: '#d8c9f5', dur: 31, dx: 5, dy: 8, o: 0.4 },
]

const ANGLES = Array.from({ length: 5 }, (_, i) => ((-90 + i * 72) * Math.PI) / 180)

/** Slow enough that the change is something you notice having happened, not something you watch. */
const MORPH = { duration: 2.2, ease: 'easeInOut' } as const

/**
 * The flower's own expression, from the mascot — open eye, wink, open smile. Sized and placed for
 * the 200-unit viewBox with its visual centre around (104, 108).
 */
function WinkFace() {
  return (
    <g>
      <ellipse cx={84} cy={100} rx={6.5} ry={11.5} fill="#fffaf4" />
      <path d="M112 105 Q122 93 132 105" stroke="#fffaf4" strokeWidth={5.5} strokeLinecap="round" fill="none" />
      <path d="M86 122 A18 18 0 0 0 122 122 Z" fill="#fffaf4" />
    </g>
  )
}

export function CharmCelestial({ phase, className }: { phase: number; className?: string }) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion
  const finePointer = useFinePointer()
  const svgRef = useRef<SVGSVGElement>(null)
  // Reuses the mascot's single coalesced pointer listener rather than registering a second one.
  const look = usePointerLook(finePointer && animate, svgRef)

  const uid = useId().replace(/:/g, '')
  const maskId = `charm-celestial-mask-${uid}`
  const softId = `charm-celestial-soft-${uid}`
  const liquidId = `charm-celestial-liquid-${uid}`
  const bloomId = `charm-celestial-bloom-${uid}`
  const faceBlurId = `charm-celestial-face-${uid}`

  // Two overlapping stages: the petals finish merging just as the bite starts to bite, so there is
  // never a dead beat where the shape is a plain disc doing nothing.
  const bloom = clamp01((phase - 0.3) / 0.3)
  const bite = clamp01((phase - 0.58) / 0.34)

  const petalSpread = 38 * (1 - bloom)
  const petalR = 36 + 22 * bloom
  const coreR = 44 + 14 * bloom
  const biteCx = 230 - bite * 78

  // The whole body leans as it reforms — a crescent standing perfectly upright reads as a logo.
  const tilt = bite * -16

  /*
   * Where the face ends up. On the flower it sits centred. On the crescent the lit sliver runs
   * roughly x 42..97, so the face slides left and shrinks to sit inside it rather than hanging off
   * the dark edge. Verified against the mask geometry above rather than eyeballed.
   */
  const faceX = -34 * bite
  const faceY = -6 * bite
  const faceScale = 1 - 0.24 * bite

  const base = ramp3('#ffb877', '#ef8a7e', '#a289df', phase)
  const glowOpacity = num3(0.5, 0.46, 0.3, phase)

  // Deliberately gentler than the mascot's: this object is several times larger, so the same
  // deflection in viewBox units would read as a much bigger movement on screen.
  const lookX = useTransform(look.x, (v) => v * 7)
  const lookY = useTransform(look.y, (v) => v * 5)

  return (
    <svg ref={svgRef} viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <filter id={softId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        <filter id={liquidId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="13" />
        </filter>
        <filter id={bloomId} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="17" />
        </filter>
        {/* Just enough blur that the face reads as part of the surface, not pasted onto it. */}
        <filter id={faceBlurId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>

        <mask id={maskId}>
          <g filter={`url(#${softId})`}>
            {/* `initial` is not optional here: motion drives cx/cy/r as SVG *attributes*, and with
                only an `animate` target the circles render with no geometry at all on the first
                paint — r defaults to 0, the mask comes out empty, and the whole body disappears. */}
            {ANGLES.map((a, i) => {
              const petal = {
                cx: 100 + Math.cos(a) * petalSpread,
                cy: 100 + Math.sin(a) * petalSpread,
                r: petalR,
              }
              return <motion.circle key={i} fill="#fff" initial={petal} animate={petal} transition={MORPH} />
            })}
            <motion.circle
              cx={100}
              cy={100}
              fill="#fff"
              initial={{ r: coreR }}
              animate={{ r: coreR }}
              transition={MORPH}
            />
            <motion.circle
              cy={88}
              r={56}
              fill="#000"
              initial={{ cx: biteCx }}
              animate={{ cx: biteCx }}
              transition={MORPH}
            />
          </g>
        </mask>
      </defs>

      <motion.g animate={{ rotate: tilt }} transition={MORPH} style={{ originX: '100px', originY: '100px' }}>
        {/* Bloom is masked before it is blurred, so the glow takes the current silhouette — petals
            while it is a flower, and only the lit sliver once the crescent forms rather than a full
            disc sitting behind it. */}
        <g filter={`url(#${bloomId})`}>
          <motion.g mask={`url(#${maskId})`} animate={{ opacity: glowOpacity }} transition={MORPH}>
            <motion.rect x={0} y={0} width={200} height={200} initial={{ fill: base }} animate={{ fill: base }} transition={MORPH} />
          </motion.g>
        </g>

        <g mask={`url(#${maskId})`}>
          {/* Opaque base so the object never goes translucent while the fields drift apart. */}
          <motion.rect x={0} y={0} width={200} height={200} initial={{ fill: base }} animate={{ fill: base }} transition={MORPH} />
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
                  initial={{ fill: ramp3(f.day, f.dusk, f.night, phase) }}
                  animate={{ fill: ramp3(f.day, f.dusk, f.night, phase) }}
                  transition={MORPH}
                />
              </motion.g>
            ))}
          </g>
          <ellipse cx={88} cy={80} rx={44} ry={40} fill="#fffdf6" opacity={0.3} filter={`url(#${liquidId})`} />
        </g>

        {/* Outside the mask so the bite cannot eat the expression — see the note at the top. */}
        <motion.g
          filter={`url(#${faceBlurId})`}
          animate={{ x: faceX, y: faceY, scale: faceScale }}
          transition={MORPH}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          <motion.g style={{ x: lookX, y: lookY }}>
            <WinkFace />
          </motion.g>
        </motion.g>
      </motion.g>
    </svg>
  )
}
