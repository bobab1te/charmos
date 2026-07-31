import { useEffect, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { CharmLiquidMark } from '#/components/charm/charm-liquid-mark'
import type { LiquidPalette } from '#/components/charm/charm-liquid-mark'
import { CharmMascot } from '#/components/charm/charm-mascot'
import { useCharmMoment } from '#/lib/charm-moments'
import { useCharmStore } from '#/lib/charm-store'
import { useCurrency } from '#/lib/currency-context'
import { computeMetrics } from '#/lib/derived'
import { useThemeContext } from '#/lib/theme-context'

/**
 * The dashboard's opening. Deliberately NOT a card: there is no panel, border, corner radius or
 * clipped rectangle anywhere in here. The colour is an atmosphere layer that starts above the
 * hero, spills wider than the content column, and is masked so it fades out on every side into
 * the page background — the same blended-section-boundary idea the waitlist uses, rather than a
 * banner sitting on top of the dashboard.
 *
 * The graphic itself is the landing page's own liquid Charm.OS mark (see charm-liquid-mark.tsx),
 * not a sun. It is blurred and held at low contrast so it reads as an aura behind the greeting;
 * the copy always wins the composition.
 */

const HERO_MASK = 'radial-gradient(closest-side at 50% 38%, #000 12%, rgba(0,0,0,0.72) 52%, transparent 100%)'

function useHour() {
  const [hour, setHour] = useState(() => new Date().getHours())
  useEffect(() => {
    const id = window.setInterval(() => setHour(new Date().getHours()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return hour
}

function greetingFor(hour: number) {
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

/**
 * Abstract colour banks — soft blurred forms, never literal clouds (the same rule the waitlist's
 * CelestialWorld follows). These are what give the hero its horizon without a horizon line.
 */
function ColourBank({
  bank,
  tint,
  mx,
  my,
  animate,
}: {
  bank: { w: number; h: number; l: number; t: number; blur: number; o: number; depth: number; drift: number }
  tint: string
  mx: MotionValue<number>
  my: MotionValue<number>
  animate: boolean
}) {
  const x = useTransform(mx, (v) => v * bank.depth)
  const y = useTransform(my, (v) => v * bank.depth * 0.45)
  return (
    <motion.div className="absolute rounded-[50%]" style={{ x, y }}>
      <motion.div
        className="rounded-[50%]"
        style={{
          width: `${bank.w}%`,
          height: `${bank.h}px`,
          marginLeft: `${bank.l}%`,
          marginTop: `${bank.t}px`,
          background: tint,
          filter: `blur(${bank.blur}px)`,
          opacity: bank.o,
        }}
        animate={animate ? { x: [0, bank.drift, 0] } : undefined}
        transition={{ duration: 34 + Math.abs(bank.drift), repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  )
}

/** A handful of four-point sparkles and dots, held to the margins — dark mode only. */
function HeroSparkles() {
  const marks = [
    { left: '4%', top: '18%', size: 13, delay: 0 },
    { left: '17%', top: '62%', size: 8, delay: 1.4 },
    { left: '84%', top: '14%', size: 15, delay: 0.7 },
    { left: '93%', top: '54%', size: 9, delay: 2.1 },
    { left: '68%', top: '78%', size: 7, delay: 1.1 },
  ]
  return (
    <div className="pointer-events-none absolute -top-16 bottom-[-20%] -left-[10%] -right-[10%] -z-10">
      {marks.map((m, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 24 24"
          className="absolute"
          style={{ left: m.left, top: m.top, width: m.size, height: m.size }}
          animate={{ opacity: [0.25, 0.85, 0.25], scale: [0.9, 1.05, 0.9] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: m.delay }}
        >
          <path d="M12 0c.6 6.6 4.8 10.8 12 12-7.2 1.2-11.4 5.4-12 12-.6-6.6-4.8-10.8-12-12C7.2 10.8 11.4 6.6 12 0Z" fill="#fff" />
        </motion.svg>
      ))}
    </div>
  )
}

export function ParallaxHero({
  displayName,
  /** Overrides the theme-derived palette. Exists so the graphic can be previewed in both states. */
  palette: paletteOverride,
}: {
  displayName: string
  palette?: LiquidPalette
}) {
  const hour = useHour()
  const { theme } = useThemeContext()
  const prefersReducedMotion = useReducedMotion()
  const isDark = theme === 'dark'

  // The mark follows the theme rather than the clock. Without the old opaque rectangle behind it
  // there is nothing separating it from the page, so a cool blue mark on the warm light background
  // (or the reverse) would read as a mistake. Time of day still shows up — in the greeting.
  const palette: LiquidPalette = paletteOverride ?? (isDark ? 'cool' : 'warm')

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const springX = useSpring(mx, { stiffness: 60, damping: 18, mass: 0.6 })
  const springY = useSpring(my, { stiffness: 60, damping: 18, mass: 0.6 })

  const markX = useTransform(springX, (v) => v * 1.1)
  const markY = useTransform(springY, (v) => v * 0.7)

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (prefersReducedMotion) return
    const rect = e.currentTarget.getBoundingClientRect()
    mx.set(((e.clientX - rect.left) / rect.width - 0.5) * 40)
    my.set(((e.clientY - rect.top) / rect.height - 0.5) * 40)
  }

  function handlePointerLeave() {
    mx.set(0)
    my.set(0)
  }

  // The dashboard mascot's mood is derived from real numbers the user already sees on the
  // metric card, not decorative — 'overwhelmed' here reads as "concerned about overdue
  // follow-ups", not literally overwhelmed. Briefly turns 'bright' right after a deal is
  // dragged to Completed (see deal-pipeline.tsx's fireMoment('deal-completed')).
  const { activeMoment } = useCharmMoment()
  const { deals, ledger } = useCharmStore()
  const { convert } = useCurrency()
  const metrics = computeMetrics(deals, ledger, convert)
  const mascotMood = activeMoment === 'deal-completed' ? 'bright' : metrics.needsFollowUp >= 3 ? 'overwhelmed' : 'calm'

  // Wash and banks follow the same palette as the mark, so the whole atmosphere is one decision.
  const cool = palette === 'cool'
  const wash = cool
    ? 'radial-gradient(80% 68% at 30% 34%, rgba(120,100,205,0.34) 0%, rgba(58,48,120,0.2) 44%, rgba(19,25,54,0) 78%)'
    : 'radial-gradient(80% 68% at 30% 34%, rgba(255,198,150,0.4) 0%, rgba(238,168,190,0.24) 46%, rgba(255,240,228,0) 78%)'
  const bankTint = cool ? '#4b3f8f' : '#fbdcc9'

  const banks = [
    { w: 62, h: 150, l: -12, t: 120, blur: 46, o: cool ? 0.42 : 0.6, depth: 0.55, drift: 22 },
    { w: 48, h: 120, l: 44, t: 168, blur: 40, o: cool ? 0.32 : 0.46, depth: 0.32, drift: -18 },
    { w: 38, h: 96, l: 20, t: 205, blur: 34, o: cool ? 0.24 : 0.34, depth: 0.78, drift: 14 },
  ]

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative isolate"
    >
      {/*
        The atmosphere. Extends above, beside and well below the hero's own box, then a radial mask
        dissolves it on every edge — so there is no boundary between "hero" and "dashboard", only a
        gradient that runs out. -z-10 inside `isolate` keeps it behind the greeting but still
        entirely contained by the hero, so it can never slide under the widgets below.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 bottom-[-42%] -left-[16%] -right-[16%] -z-10"
        style={{
          // `closest-side` is doing real work here: it sizes the ellipse to the nearest edge on each
          // axis, which is the only way to guarantee the mask reaches full transparency on *every*
          // side. A percentage-sized mask leaves a few percent of alpha at whichever edge the
          // ellipse doesn't quite reach, and that shows up as a faint hard line across the page.
          WebkitMaskImage: HERO_MASK,
          maskImage: HERO_MASK,
        }}
      >
        <div className="absolute inset-0 transition-[background] duration-700" style={{ background: wash }} />
        {banks.map((bank, i) => (
          <ColourBank
            key={i}
            bank={bank}
            tint={bankTint}
            mx={mx}
            my={my}
            animate={!prefersReducedMotion}
          />
        ))}
      </div>

      {/* Outside the masked layer on purpose — the sparkles live at the margins, which is exactly
          where that mask is transparent, so inside it they would be invisible. */}
      {isDark && !prefersReducedMotion && <HeroSparkles />}

      {/*
        The mark. Blurred and held at low opacity on purpose: at full strength it is a landing-page
        graphic, and at this strength it is the room the greeting sits in.
      */}
      <motion.div
        aria-hidden="true"
        style={{ x: markX, y: markY }}
        className="pointer-events-none absolute -top-2 right-[1%] -z-10 hidden aspect-square w-[38%] max-w-[320px] sm:block"
      >
        <CharmLiquidMark
          palette={palette}
          className="size-full opacity-90 blur-[1px] dark:opacity-80"
        />
      </motion.div>

      <div className="relative flex min-h-[200px] items-end gap-4 px-1 pb-3 pt-12 sm:min-h-[236px] sm:pt-16">
        <CharmMascot mood={mascotMood} lookAtCursor className="hidden shrink-0 sm:block" />
        <div className="flex flex-1 flex-col justify-end">
          <span className="mb-3 w-fit rounded-full bg-white/45 px-3 py-1 text-xs font-semibold tracking-wide text-[var(--charm-ink-soft)] backdrop-blur-md dark:bg-white/10 dark:text-white/75">
            ✦ Charm.OS
          </span>
          <h1 className="font-display-bold text-3xl font-semibold tracking-tight text-[var(--charm-ink)] sm:text-[2.6rem] sm:leading-[1.08]">
            {greetingFor(hour)}, {displayName}.
          </h1>
          <p className="mt-2 max-w-md text-sm text-[var(--charm-ink-soft)] sm:text-base">
            Here's how your brand partnerships are looking today.
          </p>
        </div>
      </div>
    </div>
  )
}
