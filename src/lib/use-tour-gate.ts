import { useEffect, useRef, useState } from 'react'
import { onTourEvent } from '#/lib/tour-events'
import type { TourGate } from '#/lib/tour-steps'

/**
 * Watches for a step's completion condition and calls `onSatisfied` exactly once.
 *
 * Also reports `missed` — the user did something clearly unrelated while this step was waiting —
 * so the bubble can offer a gentle redirect instead of silently doing nothing. That is the
 * difference between a walkthrough that feels responsive and one that feels broken: if a user
 * clicks the wrong thing and the tour says nothing at all, they assume it has hung.
 *
 * There is no timer in here. A gate is satisfied by the user's action or not at all.
 */
export function useTourGate(gate: TourGate | null, onSatisfied: () => void) {
  const [missed, setMissed] = useState(false)
  // Kept in a ref so the effect doesn't re-subscribe whenever the parent re-renders with a new
  // callback identity — re-subscribing mid-step can drop the very event we're waiting for.
  const fire = useRef(onSatisfied)
  fire.current = onSatisfied

  useEffect(() => {
    setMissed(false)
    if (!gate) return

    let done = false
    const satisfy = () => {
      if (done) return
      done = true
      fire.current()
    }

    if (gate.kind === 'acknowledge') return

    if (gate.kind === 'event') {
      return onTourEvent(gate.event, satisfy)
    }

    if (gate.kind === 'click') {
      const anchor = gate.anchor
      const onClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null
        if (!target) return
        if (target.closest(`[data-tour="${anchor}"]`)) {
          satisfy()
          return
        }
        // Only treat a click on something genuinely interactive as a miss. Clicking the page
        // background, or the bubble itself, is not the user getting it wrong.
        const interactive = target.closest('button, a, [role="tab"], input, select, textarea')
        if (interactive && !interactive.closest('[data-tour-bubble]')) setMissed(true)
      }
      // Capture phase: some targets stop propagation, and a step must not hang because the
      // element it is waiting on swallowed its own click.
      document.addEventListener('click', onClick, true)
      return () => document.removeEventListener('click', onClick, true)
    }

    if (gate.kind === 'text') {
      const anchor = gate.anchor
      const min = gate.minLength ?? 1
      /*
       * A text gate wants the user to type something, so it has to ignore whatever was already
       * in the field when the step began. Without this, replaying the tour with a half-filled
       * deal form open satisfies "type the brand's name" and "say what you're creating" the
       * instant they appear, and the walkthrough silently skips to the middle of the chapter —
       * observed jumping straight to step 4 of 12 on replay.
       *
       * Captured lazily: on the first check rather than at subscribe time, because the field
       * often does not exist yet when the step becomes current.
       */
      let initial: string | null = null
      const check = () => {
        const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
          `[data-tour="${anchor}"]`,
        )
        if (!el) return
        const value = el.value.trim()
        if (initial === null) initial = value
        if (value !== initial && value.length >= min) satisfy()
      }
      // 'input' covers typing; paste and autofill both raise it too. The interval is a safety net
      // for values set programmatically (the parser filling the form), which fires no input event.
      document.addEventListener('input', check, true)
      const poll = window.setInterval(check, 400)
      check()
      return () => {
        document.removeEventListener('input', check, true)
        window.clearInterval(poll)
      }
    }

    // 'appears'
    const anchor = gate.anchor
    const check = () => {
      if (document.querySelector(`[data-tour="${anchor}"]`)) satisfy()
    }
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [gate])

  return { missed, clearMissed: () => setMissed(false) }
}
