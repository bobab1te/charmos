import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { TOUR_STEPS, stepIndexOf } from '#/lib/tour-steps'
import type { TourStep } from '#/lib/tour-steps'
import { updateMyProfile } from '#/server/profile'
import type { Profile } from '#/server/profile'

/**
 * Product tour state machine.
 *
 * Four statuses, persisted on the profile:
 *   pending — never started. The bubble offers the tour rather than launching into it.
 *   active  — in progress; `step` is the current step key.
 *   later   — dismissed with "Continue later". Nothing shows, but the step is kept so
 *             resuming from Settings picks up where they stopped instead of restarting.
 *   done    — completed or skipped outright.
 *
 * Local state is the source of truth for the session and updates immediately; the profile write
 * is fire-and-forget behind it. A tour that stutters while waiting on a round trip per click is
 * worse than one that occasionally forgets a step across a reload, and the failure mode of a lost
 * write is simply seeing a step again.
 */

type TourPhase = 'hidden' | 'welcome' | 'step'

type TourContextValue = {
  phase: TourPhase
  status: Profile['tour_status']
  step: TourStep | null
  stepIndex: number
  stepCount: number
  isFirst: boolean
  isLast: boolean
  begin: () => void
  next: () => void
  back: () => void
  /** "Continue later" — resumable from Settings. */
  pause: () => void
  /** Skip / finish outright. */
  dismiss: () => void
  /** Replay from the start, from Settings. */
  restart: () => void
  /** Pick up a paused tour at the step it stopped on. */
  resume: () => void
}

const TourContext = createContext<TourContextValue | null>(null)

export function useProductTour() {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error('useProductTour must be used inside <ProductTourProvider>')
  return ctx
}

function persist(tourStatus: Profile['tour_status'], tourStep: string | null) {
  // Deliberately unawaited. Nothing in the UI depends on the write landing, and a failed write
  // only costs the user a repeated step next session.
  void updateMyProfile({ data: { tourStatus, tourStep } }).catch(() => {})
}

export function ProductTourProvider({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const navigate = useNavigate()

  const [status, setStatus] = useState<Profile['tour_status']>(profile.tour_status)
  const [stepIndex, setStepIndex] = useState(() => stepIndexOf(profile.tour_step))

  const step = status === 'active' ? (TOUR_STEPS[stepIndex] ?? null) : null
  const phase: TourPhase = status === 'pending' ? 'welcome' : status === 'active' ? 'step' : 'hidden'

  /*
   * Drive the route from the current step. Guarded on the step key rather than run on every
   * render: navigate() would otherwise fire on each re-render, and — because navigating changes
   * the router state that re-renders this provider — that is a loop, not just wasted work.
   */
  const navigatedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!step) {
      navigatedFor.current = null
      return
    }
    if (navigatedFor.current === step.key) return
    navigatedFor.current = step.key
    void navigate({ to: step.to, search: step.search ?? {}, replace: true })
  }, [step, navigate])

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(TOUR_STEPS.length - 1, index))
    setStepIndex(clamped)
    persist('active', TOUR_STEPS[clamped].key)
  }, [])

  const begin = useCallback(() => {
    setStatus('active')
    setStepIndex(0)
    persist('active', TOUR_STEPS[0].key)
  }, [])

  const finish = useCallback(() => {
    setStatus('done')
    // The step is cleared on purpose: 'done' plus a leftover step key would be a state the
    // resume path could misread as somewhere to return to.
    persist('done', null)
  }, [])

  const next = useCallback(() => {
    if (stepIndex >= TOUR_STEPS.length - 1) finish()
    else goTo(stepIndex + 1)
  }, [stepIndex, goTo, finish])

  const back = useCallback(() => goTo(stepIndex - 1), [stepIndex, goTo])

  const pause = useCallback(() => {
    setStatus('later')
    persist('later', TOUR_STEPS[stepIndex].key)
  }, [stepIndex])

  const restart = useCallback(() => {
    setStatus('active')
    setStepIndex(0)
    persist('active', TOUR_STEPS[0].key)
    // Cleared so the navigation effect re-runs for step 0. Without this, replaying from Settings
    // while step 0 happens to be the last step seen would show the bubble but never navigate.
    navigatedFor.current = null
  }, [])

  const resume = useCallback(() => {
    setStatus('active')
    persist('active', TOUR_STEPS[stepIndex].key)
    navigatedFor.current = null
  }, [stepIndex])

  const value = useMemo<TourContextValue>(
    () => ({
      phase,
      status,
      step,
      stepIndex,
      stepCount: TOUR_STEPS.length,
      isFirst: stepIndex === 0,
      isLast: stepIndex === TOUR_STEPS.length - 1,
      begin,
      next,
      back,
      pause,
      dismiss: finish,
      restart,
      resume,
    }),
    [phase, status, step, stepIndex, begin, next, back, pause, finish, restart, resume],
  )

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}
