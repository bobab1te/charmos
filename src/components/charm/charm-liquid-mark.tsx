import { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'

/**
 * The Charm.OS mark as an abstract liquid graphic — the same object that opens the waitlist
 * landing page (charmos-waitlist's CharmOrb), ported rather than approximated so the CRM reads as
 * the same world.
 *
 * The technique is unchanged from the landing page: the five-petal flower silhouette is a *mask*,
 * not a drawn shape, and what shows through it is a set of heavily-blurred colour ellipses drifting
 * slowly past each other. That is what produces the liquid, never-quite-repeating gradient — you
 * cannot get it from a static CSS gradient. The mask itself is feathered, so the mark has no hard
 * edge anywhere and dissolves into whatever sits behind it.
 *
 * Two deliberate differences from the landing-page version, because this one lives in a product
 * rather than a story:
 *   - No face. The landing page's orb is the narrator; here the face would compete with the actual
 *     CharmMascot that sits beside the greeting, and two flowers looking at you is one too many.
 *   - No scroll coupling. The landing page drives day → night from scroll progress; here it is just
 *     a `palette` prop, crossfaded over 700ms to match the hero's own theme transition.
 */

export type LiquidPalette = 'warm' | 'cool'

const ANGLES = Array.from({ length: 5 }, (_, i) => ((-90 + i * 72) * Math.PI) / 180)

/**
 * Colour fields that drift inside the mask, lifted from the landing page's own FIELDS table so the
 * two graphics are genuinely the same object. `warm` is its daytime state (the landing page's
 * opening frame), `cool` its night state — periwinkle and violet, the blue half of the brand.
 */
const FIELDS = [
  { cx: 78, cy: 70, rx: 60, ry: 56, warm: '#fff4e2', cool: '#efe6fb', dur: 23, dx: 8, dy: -6, o: 0.78 },
  { cx: 128, cy: 86, rx: 56, ry: 60, warm: '#ffcf9d', cool: '#c3aef2', dur: 29, dx: -7, dy: 9, o: 0.7 },
  { cx: 96, cy: 132, rx: 64, ry: 52, warm: '#ff9d78', cool: '#8f7ad4', dur: 34, dx: 6, dy: 7, o: 0.62 },
  { cx: 74, cy: 108, rx: 54, ry: 50, warm: '#ef6d9e', cool: '#7d8ede', dur: 26, dx: -9, dy: -5, o: 0.6 },
  { cx: 112, cy: 104, rx: 46, ry: 48, warm: '#e8608f', cool: '#b79cea', dur: 30, dx: 7, dy: -8, o: 0.5 },
  { cx: 118, cy: 58, rx: 40, ry: 38, warm: '#fbdf9e', cool: '#a8c4f0', dur: 31, dx: 5, dy: 8, o: 0.4 },
]

const BASE_FILL: Record<LiquidPalette, string> = { warm: '#ffb877', cool: '#8f9ee0' }

const FILL_TRANSITION = { duration: 0.7, ease: 'easeInOut' } as const

function LiquidField({
  field,
  palette,
  animate,
}: {
  field: (typeof FIELDS)[number]
  palette: LiquidPalette
  animate: boolean
}) {
  return (
    <motion.g
      animate={animate ? { x: [0, field.dx, 0], y: [0, field.dy, 0] } : undefined}
      transition={{ duration: field.dur, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.ellipse
        cx={field.cx}
        cy={field.cy}
        rx={field.rx}
        ry={field.ry}
        opacity={field.o}
        animate={{ fill: field[palette] }}
        transition={FILL_TRANSITION}
      />
    </motion.g>
  )
}

/** One petal of the mask — a plain circle offset from centre; five of them make the flower. */
function Petal({ angle }: { angle: number }) {
  return <circle cx={100 + Math.cos(angle) * 38} cy={100 + Math.sin(angle) * 38} r={36} fill="#fff" />
}

export function CharmLiquidMark({
  palette,
  className,
  /** Extra feather on the mask. Higher = softer, more atmospheric, less legible as a flower. */
  feather = 5,
}: {
  palette: LiquidPalette
  className?: string
  feather?: number
}) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion
  // Filter/mask ids are document-global in SVG, so two marks on one page would silently share
  // (and fight over) the same definitions without this.
  const uid = useId().replace(/:/g, '')
  const maskId = `charm-liquid-mask-${uid}`
  const featherId = `charm-liquid-feather-${uid}`
  const blurId = `charm-liquid-blur-${uid}`
  const bloomId = `charm-liquid-bloom-${uid}`

  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <filter id={featherId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={feather} />
        </filter>
        <filter id={blurId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="13" />
        </filter>
        <filter id={bloomId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="16" />
        </filter>

        <mask id={maskId}>
          <g filter={`url(#${featherId})`}>
            {ANGLES.map((a, i) => (
              <Petal key={i} angle={a} />
            ))}
            <circle cx={100} cy={100} r={44} fill="#fff" />
          </g>
        </mask>
      </defs>

      {/* Outer bloom — masked before it is blurred, so the glow takes the flower's shape rather
          than sitting behind it as a plain disc. */}
      <g filter={`url(#${bloomId})`} opacity={0.45}>
        <g mask={`url(#${maskId})`}>
          <motion.rect
            x={0}
            y={0}
            width={200}
            height={200}
            animate={{ fill: BASE_FILL[palette] }}
            transition={FILL_TRANSITION}
          />
        </g>
      </g>

      <g mask={`url(#${maskId})`}>
        {/* Opaque base so the mark never goes translucent while the fields drift apart. */}
        <motion.rect
          x={0}
          y={0}
          width={200}
          height={200}
          animate={{ fill: BASE_FILL[palette] }}
          transition={FILL_TRANSITION}
        />
        <g filter={`url(#${blurId})`}>
          {FIELDS.map((f, i) => (
            <LiquidField key={i} field={f} palette={palette} animate={animate} />
          ))}
        </g>
        {/* Specular highlight — keeps the surface reading as convex rather than flat. */}
        <ellipse cx={88} cy={80} rx={44} ry={40} fill="#fffdf6" opacity={0.3} filter={`url(#${blurId})`} />
      </g>
    </svg>
  )
}
