import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { subscribePointer, useFinePointer } from '#/components/charm/charm-mascot'
import { useAllowAmbientMotion } from '#/lib/use-ambient-motion'
import { cn } from '#/lib/utils'

/**
 * The environment behind the auth card: a creator's workload, floating.
 *
 * The point is narrative. Before you sign in these are scattered, tilted, drifting at different
 * depths — "there is a lot going on". On success they straighten, slow, and draw inward toward
 * the flower, which is the product's promise stated visually rather than in a tagline.
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
  0: { blur: 0, scale: 1, opacity: 0.96, parallax: 26 },
  1: { blur: 1.2, scale: 0.92, opacity: 0.8, parallax: 16 },
  2: { blur: 2.6, scale: 0.84, opacity: 0.6, parallax: 9 },
} as const

function WorkloadItem({
  item,
  index,
  settled,
  narrow,
  pointer,
}: {
  item: Item
  index: number
  settled: boolean
  narrow: boolean
  pointer: { x: ReturnType<typeof useMotionValue<number>>; y: ReturnType<typeof useMotionValue<number>> }
}) {
  const reduced = useReducedMotion()
  const [hovered, setHovered] = useState(false)
  const depth = LAYER[item.layer]

  // Nearer items travel further with the cursor. That difference is the whole parallax effect.
  const px = useTransform(pointer.x, (v) => v * depth.parallax)
  const py = useTransform(pointer.y, (v) => v * depth.parallax * 0.6)

  /*
   * On settle everything resolves at once: rotation to zero, blur away, opacity up, and the item
   * pulls toward the centre — the flower's position — so the group visibly gathers rather than
   * merely tidying in place. Staggered by index so it reads as a sweep, not a snap.
   */
  const settleShift = settled ? (item.left ? 34 : -34) : 0

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
        opacity: settled ? Math.min(1, depth.opacity + 0.15) : depth.opacity,
        scale: hovered && !settled ? depth.scale * 1.04 : depth.scale,
        rotate: settled ? 0 : item.rotate + (hovered ? (item.rotate > 0 ? -2.5 : 2.5) : 0),
        filter: `blur(${settled ? 0 : depth.blur}px)`,
        translateX: settleShift,
      }}
      transition={
        reduced
          ? { duration: 0 }
          : settled
            ? { type: 'spring', stiffness: 120, damping: 20, delay: index * 0.035 }
            : { type: 'spring', stiffness: 220, damping: 22 }
      }
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
        animate={reduced || settled ? { y: 0 } : { y: [0, -7, 0, 5, 0] }}
        transition={
          reduced || settled
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

export function LoginAtmosphere({ settled }: { settled: boolean }) {
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
        animate={{ opacity: settled ? 0.1 : 0.42, scale: settled ? 1.1 : 1 }}
        transition={{ duration: settled ? 1.1 : 0.8, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute -right-[12%] bottom-[-15%] size-[50vw] rounded-full"
        style={{
          background:
            'radial-gradient(circle, color-mix(in oklab, var(--charm-lavender-deep) 50%, transparent), transparent 70%)',
          filter: 'blur(100px)',
        }}
        animate={{ opacity: settled ? 0.08 : 0.34, scale: settled ? 1.1 : 1 }}
        transition={{ duration: settled ? 1.1 : 0.8, ease: 'easeOut' }}
      />

      {ITEMS.map((item, i) => (
        <WorkloadItem key={item.label} item={item} index={i} settled={settled} narrow={narrow} pointer={{ x, y }} />
      ))}
    </div>
  )
}
