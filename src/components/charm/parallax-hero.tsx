import { useEffect, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { CharmCelestial } from '#/components/charm/charm-celestial'
import { CharmMascot } from '#/components/charm/charm-mascot'
import { useCharmMoment } from '#/lib/charm-moments'
import { useCharmStore } from '#/lib/charm-store'
import { num3, ramp3, withAlpha } from '#/lib/color-ramp'
import { useCurrency } from '#/lib/currency-context'
import { computeMetrics } from '#/lib/derived'
import { greetingForPhaseHour, useSkyPhase } from '#/lib/sky-phase'
import { useThemeContext } from '#/lib/theme-context'

/**
 * The dashboard's opening — an environment the page sits inside, not a banner sitting on it. There
 * is no panel, border, corner radius or clipped rectangle anywhere in here.
 *
 * Everything visual is driven by one scalar: `phase` from sky-phase.ts, 0 at midday and 1 in the
 * middle of the night. The wash, the colour banks, the wisps, the sparkles and the sun/crescent all
 * read that same number, which is what makes the day → sunset → night change feel like one event
 * rather than a background swap plus an icon swap. The user's manual light/dark choice still
 * controls the *page* palette; this controls the *sky*.
 *
 * Layering, front to back: greeting copy → mascot → celestial → colour banks and wisps → wash.
 * The greeting deliberately overlaps the mascot's glow, which is where the depth comes from.
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

/**
 * Wisps of atmosphere, not clouds. Heavily blurred, low opacity, drifting on a minute-plus cycle —
 * at these settings they read as light in the air rather than as objects, which is the only way
 * something cloud-shaped belongs in a CRM. Three of them, placed to frame the composition.
 */
function Wisp({
  wisp,
  tint,
  mx,
  my,
  animate,
}: {
  wisp: { w: number; h: number; left: string; top: string; blur: number; o: number; depth: number; drift: number }
  tint: string
  mx: MotionValue<number>
  my: MotionValue<number>
  animate: boolean
}) {
  const x = useTransform(mx, (v) => v * wisp.depth)
  const y = useTransform(my, (v) => v * wisp.depth * 0.45)
  return (
    <motion.div className="absolute" style={{ left: wisp.left, top: wisp.top, x, y }}>
      <motion.div
        className="rounded-[50%]"
        style={{
          width: wisp.w,
          height: wisp.h,
          background: tint,
          filter: `blur(${wisp.blur}px)`,
          opacity: wisp.o,
        }}
        animate={animate ? { x: [0, wisp.drift, 0] } : undefined}
        transition={{ duration: 48 + Math.abs(wisp.drift), repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  )
}

/** A few four-point sparkles at the margins. Fades in with the phase, so they arrive with dusk. */
function HeroSparkles({ strength }: { strength: number }) {
  const marks = [
    { left: '3%', top: '12%', size: 13, delay: 0 },
    { left: '15%', top: '78%', size: 8, delay: 1.4 },
    { left: '88%', top: '58%', size: 14, delay: 0.7 },
    { left: '70%', top: '8%', size: 9, delay: 2.1 },
    { left: '52%', top: '86%', size: 7, delay: 1.1 },
  ]
  return (
    <div className="pointer-events-none absolute -top-16 bottom-[-20%] -left-[10%] -right-[10%] -z-10">
      {marks.map((m, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 24 24"
          className="absolute"
          style={{ left: m.left, top: m.top, width: m.size, height: m.size }}
          animate={{ opacity: [0.2 * strength, 0.85 * strength, 0.2 * strength], scale: [0.9, 1.05, 0.9] }}
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
  /** Overrides the clock-derived sky phase. Exists so the arc can be previewed at any time of day. */
  phase: phaseOverride,
}: {
  displayName: string
  phase?: number
}) {
  const hour = useHour()
  const clockPhase = useSkyPhase()
  const { preference } = useThemeContext()
  const prefersReducedMotion = useReducedMotion()

  /*
   * On Auto the sky is simply the clock, and the page palette follows the same scalar — so sky and
   * background are one thing by construction.
   *
   * On a manual override the sky is clamped into the half of the arc that matches the palette the
   * user picked. Without this, choosing Dark at noon would put a bright warm daytime wash and a sun
   * on a navy page, which is precisely the "background and celestial element out of sync" the whole
   * design is meant to avoid. The clamp is a range rather than a fixed value, so manual mode still
   * drifts a little across the day.
   */
  const phase =
    phaseOverride ??
    (preference === 'auto'
      ? clockPhase
      : preference === 'dark'
        ? Math.max(0.72, clockPhase)
        : Math.min(0.3, clockPhase))

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const springX = useSpring(mx, { stiffness: 60, damping: 18, mass: 0.6 })
  const springY = useSpring(my, { stiffness: 60, damping: 18, mass: 0.6 })

  const celestialX = useTransform(springX, (v) => v * 1.1)
  const celestialY = useTransform(springY, (v) => v * 0.7)
  const mascotX = useTransform(springX, (v) => v * -0.35)
  const mascotY = useTransform(springY, (v) => v * -0.22)

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

  // Day → sunset → night, all from the one scalar.
  const washInner = ramp3('#ffc696', '#ff8f6e', '#7864cd', phase)
  const washOuter = ramp3('#eea8be', '#c2688f', '#3a3078', phase)
  const washInnerAlpha = num3(0.4, 0.46, 0.36, phase)
  const washOuterAlpha = num3(0.24, 0.3, 0.22, phase)
  const wash = `radial-gradient(closest-side at 46% 32%, ${withAlpha(washInner, washInnerAlpha)} 0%, ${withAlpha(washOuter, washOuterAlpha)} 48%, transparent 84%)`

  const bankTint = ramp3('#fbdcc9', '#f0a48c', '#4b3f8f', phase)
  const wispTint = ramp3('#fff1e0', '#ffc4a8', '#6f5fb8', phase)
  const bankOpacity = num3(0.55, 0.5, 0.36, phase)
  const wispOpacity = num3(0.22, 0.2, 0.16, phase)
  // Sparkles arrive with dusk rather than snapping on when the page turns dark.
  const sparkleStrength = Math.max(0, (phase - 0.4) / 0.45)

  // Glow that sits between the mascot and the wash, so the mascot's colour dissolves outward
  // instead of ending in a defined patch: mascot -> glow -> liquid gradient -> dashboard.
  const mascotGlow = ramp3('#f6a8c4', '#f09a86', '#8f7ad4', phase)

  const banks = [
    { w: 62, h: 150, l: -12, t: 118, blur: 46, depth: 0.55, drift: 22, scale: 1 },
    { w: 48, h: 120, l: 44, t: 166, blur: 40, depth: 0.32, drift: -18, scale: 0.85 },
    { w: 38, h: 96, l: 20, t: 202, blur: 34, depth: 0.78, drift: 14, scale: 0.62 },
  ]

  const wisps = [
    { w: 340, h: 84, left: '-4%', top: '2%', blur: 52, o: wispOpacity, depth: 0.5, drift: 20 },
    { w: 260, h: 70, left: '60%', top: '10%', blur: 46, o: wispOpacity * 0.8, depth: 0.28, drift: -16 },
    { w: 300, h: 76, left: '26%', top: '76%', blur: 54, o: wispOpacity * 0.66, depth: 0.68, drift: 13 },
  ]

  return (
    <div onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave} className="relative isolate">
      {/*
        The atmosphere. Extends above, beside and well below the hero's own box, then a mask
        dissolves it on every edge — so there is no hero/dashboard boundary, only a gradient that
        runs out. `closest-side` is load-bearing: a percentage-sized mask leaves a few percent of
        alpha at whichever edge its ellipse doesn't reach, which shows up as a hard line.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 bottom-[-42%] -left-[16%] -right-[16%] -z-10 overflow-hidden"
        style={{ WebkitMaskImage: HERO_MASK, maskImage: HERO_MASK }}
      >
        <div className="absolute inset-0 transition-[background] duration-1000" style={{ background: wash }} />

        {banks.map((bank, i) => (
          <Wisp
            key={`bank-${i}`}
            wisp={{
              w: bank.w * 12,
              h: bank.h,
              left: `${bank.l}%`,
              top: `${bank.t}px`,
              blur: bank.blur,
              o: bankOpacity * bank.scale,
              depth: bank.depth,
              drift: bank.drift,
            }}
            tint={bankTint}
            mx={mx}
            my={my}
            animate={!prefersReducedMotion}
          />
        ))}

        {wisps.map((wisp, i) => (
          <Wisp key={`wisp-${i}`} wisp={wisp} tint={wispTint} mx={mx} my={my} animate={!prefersReducedMotion} />
        ))}

        {/* Grain over the hero's own gradients — the page-level .charm-grain sits behind all of
            this and never reaches it. */}
        <div className="charm-grain-local" />
      </div>

      {sparkleStrength > 0.02 && !prefersReducedMotion && <HeroSparkles strength={Math.min(1, sparkleStrength)} />}

      {/*
        The large hero character: the Charm.OS flower by day, morphing into a crescent moon at
        night.

        It overflows the hero's bottom edge and reaches down past the Customize row, stopping just
        short of the metric cards — measured at 1440px, its box ends 11px above the first card, and
        the edge dissolve puts the visible gap nearer 60px. Adjacent to the widget area rather than
        underneath it. Because it does cross the Customize row, that row needs its own `relative`
        (see dashboard.tsx) or the control would paint beneath the artwork.

        Everything here is proportional rather than a fixed offset: `top` is a share of the hero's
        own height and the width is a share of the content column, so the composition holds as the
        column narrows instead of drifting.
      */}
      <motion.div
        aria-hidden="true"
        style={{ x: celestialX, y: celestialY }}
        /*
         * Hidden below `sm`, and that is a measured decision rather than a default. At 414px the
         * greeting wraps to the full column width and the metric cards stack single-file, which
         * leaves exactly one clear band — 222px to 312px, 90px tall — with the Customize pill
         * sitting in its right half. A character large enough to read cannot put its face in 90px:
         * placing it there buries it behind the first card, and placing it any higher puts artwork
         * under the greeting. Making it genuinely fit needs the mobile hero at ~330px, which pushes
         * the first metric card past the half-screen mark on an 812px device — too much of a
         * working dashboard spent on atmosphere.
         *
         * Two placements above that, split at `lg` for a reason that falls out of the arithmetic:
         * the greeting is ~495px wide, so it reaches the character's 54% left edge once the content
         * column drops under ~917px — a viewport of about 965px. Below `lg`, then, the low
         * behind-the-widgets placement would put artwork under the heading, so the character moves
         * up into the empty space above the copy (which is bottom-aligned) and shrinks. The
         * behind-the-dashboard layering is a `lg`-and-up effect; everything narrower gets the
         * character without the overlap.
         */
        className="pointer-events-none absolute -top-[6%] left-[56%] -z-10 hidden aspect-square w-[38%] max-w-[280px] sm:block lg:-top-[11%] lg:left-[54%] lg:w-[42%] lg:max-w-[400px]"
      >
        <CharmCelestial phase={phase} className="charm-celestial-dissolve size-full opacity-[0.78] blur-[2px]" />
      </motion.div>

      {/* Taller than the copy strictly needs: the extra height is what lets the character sit low
          in the hero instead of being pinned near the top of the page. */}
      <div className="relative flex min-h-[210px] items-end gap-3 pb-3 pt-14 sm:min-h-[300px] sm:pt-20">
        {/*
          The assistant sits beside the whole greeting block rather than inside it. That matters for
          alignment: with it inline on the heading row, the heading started after the mascot while
          the badge and subline started at the column edge, so the three lines had two different
          left edges. Out here, every line of the greeting shares one.
        */}
        <motion.div
          style={{ x: mascotX, y: mascotY }}
          className="pointer-events-none relative hidden shrink-0 self-end pb-1 sm:block"
        >
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 size-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[background] duration-1000"
            style={{
              background: `radial-gradient(closest-side, ${withAlpha(mascotGlow, 0.26)} 0%, ${withAlpha(mascotGlow, 0.1)} 45%, transparent 76%)`,
              filter: 'blur(30px)',
            }}
          />
          {/*
            Stationary by design — no `lookAtCursor`. The large hero character is the one that
            reacts; two flowers tracking the same cursor read as competing for attention rather than
            as hierarchy. This one keeps only its own slow ambient float (see charm-mascot.tsx),
            which also means it registers no pointer listener at all.
          */}
          <CharmMascot mood={mascotMood} size={84} className="relative" />
        </motion.div>

        {/* One block, one left edge: greeting → wordmark → subline. */}
        <div className="flex flex-1 flex-col justify-end">
          <h1 className="font-display-bold text-3xl font-semibold tracking-tight text-[var(--charm-ink)] sm:text-[2.6rem] sm:leading-[1.08]">
            {greetingForPhaseHour(hour)}, {displayName}.
          </h1>
          <span className="mt-2 w-fit rounded-full bg-white/45 px-3 py-1 text-xs font-semibold tracking-wide text-[var(--charm-ink-soft)] backdrop-blur-md dark:bg-white/10 dark:text-white/75">
            ✦ Charm.OS
          </span>
          <p className="mt-2 max-w-md text-sm text-[var(--charm-ink-soft)] sm:text-base">
            Here's how your brand partnerships are looking today.
          </p>
        </div>
      </div>
    </div>
  )
}
