import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { CharmMascot } from '#/components/charm/charm-mascot'

/**
 * The flower demonstrating a drag, by making the trip itself.
 *
 * "Drag your idea onto a date" is the one instruction in the tour that a sentence genuinely
 * struggles to convey — the user has to understand both which object moves and where it lands,
 * and a static highlight can only show one of those at a time. So the mascot travels the route on
 * a slow loop: it drifts from the idea over to the calendar, fades, and starts again.
 *
 * Deliberately a guide rather than a puppet. It moves at about a third of the speed a real drag
 * would, and there is no ghost card in tow, so it reads as "this way" instead of as the app
 * animating the action for you — which would be the thing the user is meant to do themselves.
 *
 * Positions are re-measured each loop rather than captured once, because the calendar and the
 * idea bank both move: adding an idea reflows the list, and the bubble scrolls the page.
 */
export function TourDragHint({ fromAnchor, toSelector }: { fromAnchor: string; toSelector: string }) {
  const reduced = useReducedMotion()
  const [path, setPath] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null)

  useEffect(() => {
    if (reduced) return

    const measure = () => {
      const fromEl = document.querySelector<HTMLElement>(`[data-tour="${fromAnchor}"]`)
      // First child card if the source holds any — the thing the user actually grabs — falling
      // back to the container itself while the list is still empty.
      const grabbable = fromEl?.querySelector<HTMLElement>('[data-idea-card]') ?? fromEl
      const toEl = document.querySelector<HTMLElement>(toSelector)
      if (!grabbable || !toEl) {
        setPath(null)
        return
      }
      const f = grabbable.getBoundingClientRect()
      const t = toEl.getBoundingClientRect()
      setPath({
        from: { x: f.left + f.width / 2, y: f.top + f.height / 2 },
        to: { x: t.left + t.width / 2, y: t.top + t.height / 2 },
      })
    }

    measure()
    // Cheap and infrequent: the hint only exists for one step, and re-measuring twice a second
    // keeps it correct through reflows without watching for them.
    const poll = window.setInterval(measure, 500)
    return () => window.clearInterval(poll)
  }, [fromAnchor, toSelector, reduced])

  if (reduced || !path) return null

  return (
    <motion.div
      className="pointer-events-none fixed z-[65]"
      style={{ left: 0, top: 0 }}
      initial={{ x: path.from.x - 22, y: path.from.y - 22, opacity: 0, scale: 0.85 }}
      animate={{
        x: [path.from.x - 22, path.to.x - 22],
        y: [path.from.y - 22, path.to.y - 22],
        opacity: [0, 1, 1, 0],
        scale: [0.85, 1, 1, 0.9],
      }}
      transition={{
        duration: 2.6,
        times: [0, 0.18, 0.82, 1],
        repeat: Infinity,
        // A beat between passes, so it reads as a repeated demonstration rather than a loop.
        repeatDelay: 0.7,
        ease: 'easeInOut',
      }}
      aria-hidden="true"
    >
      <CharmMascot size={44} mood="bright" />
    </motion.div>
  )
}
