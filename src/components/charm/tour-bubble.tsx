import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { X } from 'lucide-react'
import { CharmMascot } from '#/components/charm/charm-mascot'
import { Button } from '#/components/ui/button'
import { CHARM_TIER_2_SPRING } from '#/lib/motion-tiers'
import { useProductTour } from '#/lib/product-tour'
import { BUBBLE_WIDTH, bubblePlacement, sameRect } from '#/lib/tour-position'
import type { Rect } from '#/lib/tour-position'
import { cn } from '#/lib/utils'

/**
 * Track the anchor element's viewport rect for as long as the step is current.
 *
 * A rAF loop rather than a set of scroll/resize/mutation listeners: the anchor can move for
 * reasons no single listener catches — a tab panel mounting after navigation, a sidebar collapse
 * animating, a widget springing in — and the tour is a short-lived, foreground-only state where
 * one getBoundingClientRect() per frame is cheap. State is only set when the rect actually
 * changes, so a stationary anchor costs a measurement per frame and no React work at all.
 */
function useAnchorRect(anchor: string | null) {
  const [rect, setRect] = useState<Rect | null>(null)
  const rectRef = useRef<Rect | null>(null)
  const scrolledFor = useRef<string | null>(null)

  useEffect(() => {
    if (!anchor) {
      rectRef.current = null
      setRect(null)
      return
    }

    let frame = 0
    const measure = () => {
      frame = requestAnimationFrame(measure)
      const el = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`)
      if (!el) {
        if (rectRef.current !== null) {
          rectRef.current = null
          setRect(null)
        }
        return
      }

      // Bring the anchor into view once per step — not on every frame, which would fight the
      // user the moment they tried to scroll away and look around.
      if (scrolledFor.current !== anchor) {
        scrolledFor.current = anchor
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }

      const r = el.getBoundingClientRect()
      const next = { top: r.top, left: r.left, width: r.width, height: r.height }
      if (!sameRect(rectRef.current, next)) {
        rectRef.current = next
        setRect(next)
      }
    }

    frame = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(frame)
  }, [anchor])

  return rect
}

function ProgressDots({ index, count }: { index: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all duration-150 ease-out',
            i === index ? 'w-5 bg-[var(--accent)]' : 'w-1.5 bg-[var(--charm-ink-soft)]/35',
          )}
        />
      ))}
    </div>
  )
}

export function TourBubble() {
  const tour = useProductTour()
  const prefersReducedMotion = useReducedMotion()
  const anchor = tour.phase === 'step' ? (tour.step?.anchor ?? null) : null
  const rect = useAnchorRect(anchor)

  // Escape pauses rather than dismisses. Escape is a reflex, and losing the whole tour to a
  // reflex is a worse outcome than pausing something that can be resumed.
  useEffect(() => {
    if (tour.phase === 'hidden') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (tour.phase === 'welcome') tour.dismiss()
      else tour.pause()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tour])

  if (tour.phase === 'hidden') return null

  /*
   * `rect` is only ever non-null after the measuring effect has run, so reading `window` inside
   * this branch is client-only by construction — evaluating it unconditionally would crash the
   * server render, where the welcome bubble is reachable.
   *
   * The viewport is read here rather than held in state because the rAF loop already re-renders
   * on any rect change, and in this layout a resize always moves the anchor.
   */
  const showSpotlight = tour.phase === 'step' && rect !== null
  const pos = showSpotlight
    ? bubblePlacement(rect, { width: window.innerWidth, height: window.innerHeight })
    : bubblePlacement(null, { width: 0, height: 0 })

  const heading = tour.phase === 'welcome' ? 'Want the quick tour?' : (tour.step?.title ?? '')
  const body =
    tour.phase === 'welcome'
      ? "Four stops, about a minute. I'll show you where partnerships, AI deal parsing, your scrapbook, and customization live."
      : (tour.step?.body ?? '')

  return (
    <>
      {/*
        The whole overlay is pointer-events:none, including the dimmed area. The tour guides
        rather than gates — nothing here should stop someone clicking the very button being
        pointed at, and letting the page stay live also means no focus trap to get wrong.
      */}
      <AnimatePresence>
        {showSpotlight && (
          <motion.div
            key="spotlight"
            className="pointer-events-none fixed z-40 rounded-2xl"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              // One element does both jobs: the ring around the anchor and the dimming of
              // everything else, via a spread-out shadow. No second full-screen element, and
              // no SVG mask that would need re-rendering on every rect change.
              boxShadow: '0 0 0 9999px rgba(24, 16, 28, 0.45), 0 0 0 2px var(--accent)',
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        key="bubble"
        role="dialog"
        aria-live="polite"
        aria-label={heading}
        className={cn(
          'charm-glass fixed z-50 flex flex-col gap-3 rounded-2xl p-5 shadow-xl',
          pos.centered && 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
        )}
        style={{
          width: BUBBLE_WIDTH,
          ...(pos.centered ? {} : { top: pos.top, left: pos.left }),
        }}
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={prefersReducedMotion ? { duration: 0 } : CHARM_TIER_2_SPRING}
      >
        <button
          type="button"
          onClick={tour.phase === 'welcome' ? tour.dismiss : tour.pause}
          aria-label={tour.phase === 'welcome' ? 'Dismiss tour' : 'Continue later'}
          className="absolute right-3 top-3 rounded-full p-1 text-[var(--charm-ink-soft)] transition duration-150 ease-out hover:bg-white/50 hover:text-[var(--charm-ink)] active:scale-90"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-start gap-3">
          <CharmMascot size={52} mood={tour.step?.mood ?? 'calm'} className="-mt-1 shrink-0" />
          <div className="min-w-0 flex-1 pr-4">
            <h2 className="font-display text-base font-semibold text-[var(--charm-ink)]">{heading}</h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--charm-ink-soft)]">{body}</p>
          </div>
        </div>

        {tour.phase === 'welcome' ? (
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={tour.dismiss}>
              No thanks
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={tour.begin}
              className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
            >
              Show me around
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <ProgressDots index={tour.stepIndex} count={tour.stepCount} />
              <span className="text-xs text-[var(--charm-ink-soft)]">
                {tour.stepIndex + 1} of {tour.stepCount}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={tour.pause}
                className="rounded-full px-1 text-xs font-medium text-[var(--charm-ink-soft)] underline-offset-2 transition duration-150 ease-out hover:text-[var(--charm-ink)] hover:underline"
              >
                Continue later
              </button>
              <div className="flex items-center gap-2">
                {!tour.isFirst && (
                  <Button type="button" variant="ghost" size="sm" onClick={tour.back}>
                    Back
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={tour.next}
                  className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
                >
                  {tour.isLast ? 'Finish' : 'Next'}
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </>
  )
}
