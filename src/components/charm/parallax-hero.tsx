import { useEffect, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { CharmMascot } from '#/components/charm/charm-mascot'
import { useCharmMoment } from '#/lib/charm-moments'
import { useCharmStore } from '#/lib/charm-store'
import { useCurrency } from '#/lib/currency-context'
import { computeMetrics } from '#/lib/derived'

function getIsDaytime(hour: number) {
  return hour >= 6 && hour < 21
}

function useHour() {
  const [hour, setHour] = useState(() => new Date().getHours())
  useEffect(() => {
    const id = window.setInterval(() => setHour(new Date().getHours()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return hour
}

function CloudLayer({ depth, mx, my, className, style }: { depth: number; mx: MotionValue<number>; my: MotionValue<number>; className?: string; style?: React.CSSProperties }) {
  const x = useTransform(mx, (v) => v * depth)
  const y = useTransform(my, (v) => v * depth * 0.5)
  return (
    <motion.div style={{ x, y, ...style }} className={className}>
      <svg width="220" height="90" viewBox="0 0 220 90" fill="none">
        <path
          d="M55 78C25 78 4 62 4 41 4 22 20 8 40 6 47 -3 62 -8 78 -6 96 -4 110 8 115 24 138 24 158 40 158 58 158 70 148 78 132 78H55Z"
          fill="currentColor"
        />
      </svg>
    </motion.div>
  )
}

/** A few small constellations — 4-5 stars each linked by faint straight lines, twinkling
 * independently — scattered among the plain star field for the night scene. */
function Constellations() {
  const groups = [
    {
      points: [
        [8, 20],
        [22, 12],
        [36, 22],
        [48, 10],
      ],
      top: '10%',
      left: '6%',
      scale: 1,
    },
    {
      points: [
        [0, 10],
        [16, 4],
        [26, 16],
        [14, 26],
      ],
      top: '38%',
      left: '62%',
      scale: 0.9,
    },
  ]
  return (
    <div className="pointer-events-none absolute inset-0">
      {groups.map((g, gi) => {
        const w = Math.max(...g.points.map((p) => p[0])) + 10
        const h = Math.max(...g.points.map((p) => p[1])) + 10
        const path = g.points.map((p) => p.join(',')).join(' ')
        return (
          <div key={gi} className="absolute" style={{ top: g.top, left: g.left, transform: `scale(${g.scale})` }}>
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
              <polyline points={path} stroke="white" strokeOpacity="0.35" strokeWidth="1" />
              {g.points.map(([x, y], pi) => (
                <motion.circle
                  key={pi}
                  cx={x}
                  cy={y}
                  r={1.6}
                  fill="white"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2.6 + (pi % 3) * 0.4, repeat: Infinity, ease: 'easeInOut', delay: pi * 0.4 + gi }}
                />
              ))}
            </svg>
          </div>
        )
      })}
    </div>
  )
}

export function ParallaxHero({ displayName }: { displayName: string }) {
  const hour = useHour()
  const isDay = getIsDaytime(hour)
  const prefersReducedMotion = useReducedMotion()

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const springX = useSpring(mx, { stiffness: 60, damping: 18, mass: 0.6 })
  const springY = useSpring(my, { stiffness: 60, damping: 18, mass: 0.6 })

  const orbX = useTransform(springX, (v) => v * 1.1)
  const orbY = useTransform(springY, (v) => v * 0.7)

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (prefersReducedMotion) return
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width - 0.5
    const relY = (e.clientY - rect.top) / rect.height - 0.5
    mx.set(relX * 40)
    my.set(relY * 40)
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

  const greeting = isDay
    ? hour < 12
      ? 'Good morning'
      : hour < 17
        ? 'Good afternoon'
        : 'Good evening'
    : 'Good night'

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={
        'relative w-full overflow-hidden rounded-3xl h-[280px] sm:h-[320px] transition-colors duration-700 ' +
        // Recolored to the same families as the page background (rose/amber blob light,
        // navy/plum diagonal dark) so the hero card reads as part of the page, not a separate
        // panel dropped on top of it.
        (isDay
          ? 'bg-[linear-gradient(160deg,#fdf6f1_0%,#f6dfc4_40%,#eec9a8_70%,#e6b3c2_100%)]'
          : 'bg-[linear-gradient(160deg,#131936_0%,#2c2650_45%,#5b4488_100%)]')
      }
    >
      {/* radiant sun / moon */}
      <motion.div
        aria-hidden="true"
        style={{ x: orbX, y: orbY }}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        {isDay ? (
          <div
            className="size-40 rounded-full sm:size-52"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #fff9e6, #ffd97a 55%, #ffb457 100%)',
              boxShadow: '0 0 90px 30px rgba(255, 190, 120, 0.55), 0 0 160px 60px rgba(255, 210, 160, 0.35)',
            }}
          />
        ) : (
          <div className="relative size-36 sm:size-44">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle at 32% 30%, #f5f0ff, #cdbdf7 60%, #9c86d8 100%)',
                boxShadow: '0 0 80px 26px rgba(160, 130, 230, 0.45), 0 0 150px 50px rgba(130, 100, 210, 0.3)',
                clipPath: 'circle(50% at 62% 50%)',
              }}
            />
          </div>
        )}
      </motion.div>

      {/* drifting cloud layers, parallax depth via cursor + gentle ambient drift */}
      <div className={isDay ? 'text-white/70' : 'text-white/10'}>
        <motion.div
          animate={prefersReducedMotion ? undefined : { x: [0, 14, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -left-6 bottom-6"
        >
          <CloudLayer depth={0.6} mx={mx} my={my} />
        </motion.div>
        <motion.div
          animate={prefersReducedMotion ? undefined : { x: [0, -18, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute right-2 bottom-2 scale-90 opacity-80"
        >
          <CloudLayer depth={0.35} mx={mx} my={my} />
        </motion.div>
        <motion.div
          animate={prefersReducedMotion ? undefined : { x: [0, 10, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-1/3 bottom-0 scale-75 opacity-60"
        >
          <CloudLayer depth={0.8} mx={mx} my={my} />
        </motion.div>
      </div>

      {isDay ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/50 to-transparent" />
      ) : (
        <div className="pointer-events-none absolute inset-0">
          {[...Array(24)].map((_, i) => (
            <div
              key={i}
              className="absolute size-[3px] rounded-full bg-white/70"
              style={{
                left: `${(i * 37) % 100}%`,
                top: `${(i * 53) % 70}%`,
                opacity: 0.3 + ((i * 13) % 60) / 100,
              }}
            />
          ))}
          <Constellations />
        </div>
      )}

      <div className="relative z-10 flex h-full items-end gap-4 p-6 sm:p-9">
        <CharmMascot mood={mascotMood} lookAtCursor className="hidden shrink-0 sm:block" />
        <div className="flex flex-1 flex-col justify-end">
          <span
            className={
              'mb-2 w-fit rounded-full px-3 py-1 text-xs font-semibold tracking-wide backdrop-blur-md ' +
              (isDay ? 'bg-white/50 text-[#5a3a4a]' : 'bg-white/10 text-white/80')
            }
          >
            ✦ CharmOS
          </span>
          <h1
            className={
              'font-display-bold text-3xl font-semibold sm:text-4xl ' + (isDay ? 'text-[#3a2e42]' : 'text-white')
            }
          >
            {greeting}, {displayName}.
          </h1>
          <p className={'mt-1 text-sm sm:text-base ' + (isDay ? 'text-[#6b5b73]' : 'text-white/70')}>
            Here's how your brand partnerships are looking today.
          </p>
        </div>
      </div>
    </div>
  )
}
