import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { subscribePointer, useFinePointer } from '#/components/charm/charm-mascot'
import { GlimmerSparkle } from '#/components/charm/decorative-shapes'
import { useAllowAmbientMotion } from '#/lib/use-ambient-motion'
import { cn } from '#/lib/utils'

/**
 * The environment behind the auth card: a creator's workload, floating.
 *
 * Scattered, tilted, drifting at different depths — "there is a lot going on", which is the
 * feeling the product exists to answer. Deliberately secondary: the auth card is the focal point
 * and these sit behind and around it, never competing for the eye.
 *
 * Deliberately not the sticker-pill treatment this replaces. Three things do the work: depth
 * (each item has a z-layer that drives its blur, scale, opacity and parallax together), restraint
 * (ten items, not thirty), and mixed weight — a couple read as cards, most as quiet labels.
 */

type Layer = 0 | 1 | 2

type Item = {
  label: string
  /** 0 = nearest and sharpest, 2 = furthest and softest. Drives blur, scale, opacity, parallax. */
  layer: Layer
  /** Percentage position. Kept off the vertical centre band where the card sits. */
  top: string
  left?: string
  right?: string
  rotate: number
  /** Seconds for one drift cycle. Long and varied so nothing pulses in unison. */
  drift: number
  /** Reads as a small card rather than a label — used sparingly, for weight. */
  card?: boolean
  /**
   * Hidden below `lg`. Most items are: the card owns the centre column, and on a narrow viewport
   * there is simply no room beside it — items that fit on desktop end up sliding under the card
   * and getting clipped mid-word, which reads as a bug rather than as depth.
   */
  desktopOnly?: boolean
  /** Position used below `lg`, for the few items that survive there. Kept clear of the card. */
  mobile?: { top: string; left?: string; right?: string }
}

/*
 * Curated, not generated. Positions avoid the centre column so nothing ever competes with the
 * card, and the two `card` items sit on opposite diagonals so the weight is balanced.
 */
const ITEMS: Array<Item> = [
  { label: 'UGC Brief', layer: 0, top: '14%', left: '8%', rotate: -6, drift: 19, card: true,
    mobile: { top: '5%', left: '5%' } },
  { label: 'Due Friday', layer: 1, top: '30%', left: '4%', rotate: 4, drift: 23, desktopOnly: true },
  { label: '#beauty', layer: 2, top: '52%', left: '9%', rotate: -3, drift: 27, desktopOnly: true },
  { label: 'Revision', layer: 1, top: '72%', left: '6%', rotate: 7, drift: 21, desktopOnly: true },
  { label: 'Content Idea', layer: 0, top: '80%', left: '15%', rotate: -4, drift: 25,
    mobile: { top: '90%', left: '6%' } },
  { label: 'Brand Deal', layer: 0, top: '18%', right: '9%', rotate: 5, drift: 22, card: true,
    mobile: { top: '6%', right: '5%' } },
  { label: '3 unread emails', layer: 1, top: '36%', right: '5%', rotate: -5, drift: 26, desktopOnly: true },
  { label: 'Invoice', layer: 2, top: '58%', right: '8%', rotate: 3, drift: 24, desktopOnly: true },
  { label: 'Campaign', layer: 1, top: '74%', right: '11%', rotate: -6, drift: 20,
    mobile: { top: '91%', right: '6%' } },
  { label: 'Sponsored Post', layer: 2, top: '88%', right: '20%', rotate: 4, drift: 29, desktopOnly: true },
]

/** Per-layer look. Depth is one decision applied consistently, not four independent knobs. */
const LAYER = {
  0: { blur: 0, scale: 0.96, opacity: 0.82, parallax: 26 },
  1: { blur: 1.2, scale: 0.9, opacity: 0.66, parallax: 16 },
  2: { blur: 2.6, scale: 0.82, opacity: 0.5, parallax: 9 },
} as const

function WorkloadItem({
  item,
  index,
  narrow,
  pointer,
}: {
  item: Item
  index: number
  narrow: boolean
  pointer: { x: ReturnType<typeof useMotionValue<number>>; y: ReturnType<typeof useMotionValue<number>> }
}) {
  const reduced = useReducedMotion()
  const [hovered, setHovered] = useState(false)
  const depth = LAYER[item.layer]

  // Nearer items travel further with the cursor. That difference is the whole parallax effect.
  const px = useTransform(pointer.x, (v) => v * depth.parallax)
  const py = useTransform(pointer.y, (v) => v * depth.parallax * 0.6)

  return (
    <motion.div
      className={cn('pointer-events-auto absolute select-none', item.desktopOnly && 'hidden lg:block')}
      style={{
        top: narrow && item.mobile ? item.mobile.top : item.top,
        left: narrow && item.mobile ? item.mobile.left : item.left,
        right: narrow && item.mobile ? item.mobile.right : item.right,
        x: reduced ? 0 : px,
        y: reduced ? 0 : py,
      }}
      initial={reduced ? false : { opacity: 0, scale: 0.9 }}
      animate={{
        opacity: depth.opacity,
        scale: hovered ? depth.scale * 1.04 : depth.scale,
        rotate: item.rotate + (hovered ? (item.rotate > 0 ? -2.5 : 2.5) : 0),
        filter: `blur(${depth.blur}px)`,
      }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 22 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      // Touch gets the same acknowledgement as hover, just self-cancelling.
      onTapStart={() => {
        setHovered(true)
        window.setTimeout(() => setHovered(false), 450)
      }}
      aria-hidden="true"
    >
      {/* The drift is a separate element so it composes with parallax instead of fighting it for
          the same transform. Stops entirely once settled — calm is the point. */}
      <motion.div
        animate={reduced ? { y: 0 } : { y: [0, -7, 0, 5, 0] }}
        transition={
          reduced
            ? { duration: 0.5 }
            : { duration: item.drift, repeat: Infinity, ease: 'easeInOut', delay: index * 0.7 }
        }
      >
        <span
          className={cn(
            // Primary rather than secondary text: each layer already dims itself via opacity, and
            // stacking a softer colour on top of that dropped the mid layer to 3.83:1 in light
            // mode. Depth still reads, because blur and scale carry it.
            'whitespace-nowrap rounded-full border text-[var(--text-primary)] transition-colors duration-200',
            'border-[var(--border-subtle)] bg-[var(--surface-nested)] backdrop-blur-md',
            item.card
              ? 'block rounded-2xl px-3.5 py-2.5 text-[13px] font-medium text-[var(--text-primary)] shadow-lg'
              : 'px-3 py-1.5 text-xs',
          )}
        >
          {item.label}
        </span>
      </motion.div>
    </motion.div>
  )
}


/**
 * The sparkle field.
 *
 * Same 4-point star and the same layered white glow as every authenticated page — imported, not
 * reimplemented. Eleven of them, placed by hand around the card's edges so they frame the
 * composition rather than sit on top of the form.
 *
 * Proximity is computed entirely in normalised space against the shared pointer motion values:
 * each sparkle knows where it is as a fraction of the viewport, so "how close is the cursor" is
 * arithmetic on two numbers. No getBoundingClientRect, no listener per star, and no React render
 * on pointer move — motion writes the transform directly. That keeps the whole field to one
 * rAF-batched listener no matter how many sparkles there are.
 */
type Spark = { x: number; y: number; size: number; delay: number; duration: number; desktopOnly?: boolean }

const SPARKS: Array<Spark> = [
  { x: 0.13, y: 0.16, size: 18, delay: 0, duration: 3.2 },
  { x: 0.86, y: 0.12, size: 14, delay: 0.9, duration: 2.8 },
  { x: 0.08, y: 0.44, size: 13, delay: 1.6, duration: 3.6, desktopOnly: true },
  { x: 0.92, y: 0.38, size: 17, delay: 0.4, duration: 3 },
  { x: 0.2, y: 0.72, size: 15, delay: 2.1, duration: 3.3 },
  { x: 0.8, y: 0.68, size: 12, delay: 1.2, duration: 2.9, desktopOnly: true },
  { x: 0.5, y: 0.06, size: 12, delay: 0.7, duration: 3.4 },
  { x: 0.46, y: 0.95, size: 14, delay: 1.9, duration: 3.1 },
  { x: 0.3, y: 0.3, size: 10, delay: 2.6, duration: 2.7, desktopOnly: true },
  { x: 0.7, y: 0.86, size: 11, delay: 0.2, duration: 3.5, desktopOnly: true },
  { x: 0.04, y: 0.88, size: 13, delay: 1.4, duration: 3 },
]

function Sparkle({
  spark,
  pointer,
  reactive,
}: {
  spark: Spark
  pointer: { x: ReturnType<typeof useMotionValue<number>>; y: ReturnType<typeof useMotionValue<number>> }
  reactive: boolean
}) {
  const reduced = useReducedMotion()

  // Pointer values are normalised to [-1, 1] from the centre; convert this sparkle's [0,1]
  // position into the same space once so the comparison below is a plain subtraction.
  const nx = spark.x * 2 - 1
  const ny = spark.y * 2 - 1

  /** 1 when the cursor is on top of the sparkle, easing to 0 at the edge of its radius. */
  const RADIUS = 0.34
  const near = useTransform([pointer.x, pointer.y], ([px, py]: Array<number>) => {
    const d = Math.hypot(px - nx, py - ny)
    return Math.max(0, 1 - d / RADIUS)
  })

  // Drifts a little toward the cursor and brightens as it approaches — the sparkle noticing you,
  // not chasing you.
  const tx = useTransform([pointer.x, near], ([px, n]: Array<number>) => (px - nx) * 14 * n)
  const ty = useTransform([pointer.y, near], ([py, n]: Array<number>) => (py - ny) * 14 * n)
  const proximityScale = useTransform(near, [0, 1], [1, 1.45])
  /*
   * Brightness rather than opacity for the proximity boost. Opacity here would multiply with the
   * twinkle animation on the child, so a value starting at 0 makes every sparkle invisible until
   * the cursor reaches it — the opposite of an ambient field. Brightness composes cleanly and, on
   * a white star, reads as the sparkle catching the light.
   */
  const proximityBrightness = useTransform(near, [0, 1], [1, 1.9])
  const brightnessFilter = useTransform(proximityBrightness, (v) => `brightness(${v})`)

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${spark.x * 100}%`,
        top: `${spark.y * 100}%`,
        x: reactive ? tx : 0,
        y: reactive ? ty : 0,
        scale: reactive ? proximityScale : 1,
        filter: reactive ? brightnessFilter : undefined,
        marginLeft: -spark.size / 2,
        marginTop: -spark.size / 2,
      }}
    >
      <motion.div
        animate={reduced ? { opacity: 0.5 } : { opacity: [0.28, 0.72, 0.28], scale: [0.9, 1.06, 0.9] }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: spark.duration, repeat: Infinity, ease: 'easeInOut', delay: spark.delay }
        }
      >
        <GlimmerSparkle size={spark.size} />
      </motion.div>
    </motion.div>
  )
}

export function LoginAtmosphere() {
  const reduced = useReducedMotion()
  const fine = useFinePointer()
  const allowAmbient = useAllowAmbientMotion()

  // One pointer subscription for the whole field, springed once and shared by every item — the
  // same approach the mascot uses, rather than a listener per element.
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(mx, { stiffness: 40, damping: 18, mass: 1 })
  const y = useSpring(my, { stiffness: 40, damping: 18, mass: 1 })
  // useAllowAmbientMotion is the lg breakpoint the rest of the app already uses for exactly this
  // decision, so "narrow" and "no parallax" stay one concept rather than two thresholds.
  const narrow = !allowAmbient
  const active = fine && !reduced && allowAmbient
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    if (!active) {
      mx.set(0)
      my.set(0)
      return
    }
    return subscribePointer((cx, cy) => {
      // Normalised to [-1, 1] from the viewport centre, so parallax reads as the environment
      // shifting around the card rather than tracking the cursor directly.
      mx.set((cx / window.innerWidth - 0.5) * 2)
      my.set((cy / window.innerHeight - 0.5) * 2)
    })
  }, [active, mx, my])

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/*
        Two warm blooms that sit above the global mesh only while the page is unsettled — the
        "slightly more energetic than the rest of the product" opening state. They fade out on
        success, which is most of why the background reads as calming down.
      */}
      <motion.div
        className="absolute -left-[15%] top-[-10%] size-[55vw] rounded-full"
        style={{
          background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 45%, transparent), transparent 70%)',
          filter: 'blur(90px)',
        }}
        animate={{ opacity: 0.42 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute -right-[12%] bottom-[-15%] size-[50vw] rounded-full"
        style={{
          background:
            'radial-gradient(circle, color-mix(in oklab, var(--charm-lavender-deep) 50%, transparent), transparent 70%)',
          filter: 'blur(100px)',
        }}
        animate={{ opacity: 0.34 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      {SPARKS.map((spark, i) => (
        <div key={`spark-${i}`} className={cn(spark.desktopOnly && 'hidden lg:block')}>
          <Sparkle spark={spark} pointer={{ x, y }} reactive={active} />
        </div>
      ))}

      {ITEMS.map((item, i) => (
        <WorkloadItem key={item.label} item={item} index={i} narrow={narrow} pointer={{ x, y }} />
      ))}
    </div>
  )
}
