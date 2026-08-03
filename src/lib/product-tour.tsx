import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { TOUR_STEPS, stepIndexOf } from '#/lib/tour-steps'
import type { TourStep } from '#/lib/tour-steps'
import { useTourGate } from '#/lib/use-tour-gate'
import { updateMyProfile } from '#/server/profile'
import type { Profile } from '#/server/profile'

/**
 * The interactive walkthrough's state machine.
 *
 * Four statuses, persisted on the profile:
 *   pending — never started. The bubble offers the tour rather than launching into it.
 *   active  — in progress; `step` is the current step key.
 *   later   — dismissed with "Continue later". Nothing shows, but the step is kept so resuming
 *             from Settings picks up exactly where they stopped.
 *   done    — completed or skipped outright.
 *
 * Advancement is driven entirely by the current step's gate (see use-tour-gate). There is no
 * Next button on an actionable step and no timer anywhere: the user completes the real action in
 * the real CRM, the gate notices, and the tour moves on. Only explanatory steps — the payoff
 * beats, the retainer aside — carry an acknowledge button, because there is genuinely nothing to
 * do on those.
 *
 * Local state drives the UI and the profile write trails behind it unawaited. A walkthrough that
 * stalls waiting on a round trip per step is worse than one that occasionally repeats a step
 * after a reload, which is the entire cost of a dropped write.
 */

type TourPhase = 'hidden' | 'welcome' | 'step'

type TourContextValue = {
  phase: TourPhase
  status: Profile['tour_status']
  step: TourStep | null
  stepIndex: number
  stepCount: number
  /** True while waiting on the user to do something — the bubble hides its advance button. */
  awaitingAction: boolean
  /** The user just interacted with something unrelated; show the step's nudge. */
  showNudge: boolean
  dismissNudge: () => void
  begin: () => void
  /** Only valid on acknowledge steps. */
  acknowledge: () => void
  back: () => void
  pause: () => void
  dismiss: () => void
  restart: () => void
  resume: () => void
}

const TourContext = createContext<TourContextValue | null>(null)

export function useProductTour() {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error('useProductTour must be used inside <ProductTourProvider>')
  return ctx
}

function persist(tourStatus: Profile['tour_status'], tourStep: string | null) {
  // Deliberately unawaited — nothing in the UI depends on the write landing.
  void updateMyProfile({ data: { tourStatus, tourStep } }).catch(() => {})
}

export function ProductTourProvider({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const navigate = useNavigate()

  const [status, setStatus] = useState<Profile['tour_status']>(profile.tour_status)
  const [stepIndex, setStepIndex] = useState(() => stepIndexOf(profile.tour_step))

  const step = status === 'active' ? (TOUR_STEPS[stepIndex] ?? null) : null
  const phase: TourPhase = status === 'pending' ? 'welcome' : status === 'active' ? 'step' : 'hidden'

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(TOUR_STEPS.length - 1, index))
    setStepIndex(clamped)
    persist('active', TOUR_STEPS[clamped].key)
  }, [])

  const finish = useCallback(() => {
    setStatus('done')
    // Cleared deliberately: 'done' plus a leftover step key is a state the resume path could
    // misread as somewhere to return to.
    persist('done', null)
  }, [])

  const advance = useCallback(() => {
    setStepIndex((i) => {
      if (i >= TOUR_STEPS.length - 1) {
        finish()
        return i
      }
      persist('active', TOUR_STEPS[i + 1].key)
      return i + 1
    })
  }, [finish])

  const { missed, clearMissed } = useTourGate(step?.gate ?? null, advance)

  /*
   * Self-healing for steps whose anchor is gone.
   *
   * Resuming mid-chapter lands the user on a step that lives inside the New Deal dialog, with the
   * dialog closed — a bubble pointing at nothing and no way forward. The same happens if they
   * close the dialog mid-step. When a step declares recoverTo and its anchor has not shown up
   * after a grace period, rewind to the step that re-opens it.
   *
   * This is the one timer in the tour, and it only ever moves backwards. It cannot skip work: no
   * gate is satisfied by it and the user still performs every action.
   */
  useEffect(() => {
    if (!step?.recoverTo || !step.anchor) return
    if (document.querySelector(`[data-tour="${step.anchor}"]`)) return
    const target = TOUR_STEPS.findIndex((s) => s.key === step.recoverTo)
    if (target === -1) return
    // Long enough that a step arriving just after a navigation or a dialog animation is never
    // mistaken for a missing one.
    const timer = window.setTimeout(() => {
      if (document.querySelector(`[data-tour="${step.anchor}"]`)) return
      navigatedFor.current = null
      goTo(target)
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [step, goTo])

  /*
   * Drive the route from the current step. Guarded on the step key rather than run on every
   * render: navigate() changes router state, which re-renders this provider, which would navigate
   * again — a loop rather than merely wasted work.
   *
   * A step whose route matches where the user already is does not navigate at all, which matters
   * because several consecutive steps sit on the same page inside an open modal — re-navigating
   * would tear that modal down mid-walkthrough.
   */
  const navigatedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!step) {
      navigatedFor.current = null
      return
    }
    if (navigatedFor.current === step.key) return
    navigatedFor.current = step.key
    if (window.location.pathname === step.to && !step.search) return
    void navigate({ to: step.to, search: step.search ?? {}, replace: true })
  }, [step, navigate])

  const begin = useCallback(() => {
    setStatus('active')
    setStepIndex(0)
    persist('active', TOUR_STEPS[0].key)
  }, [])

  const acknowledge = useCallback(() => {
    if (step?.gate.kind !== 'acknowledge') return
    advance()
  }, [step, advance])

  const back = useCallback(() => goTo(stepIndex - 1), [stepIndex, goTo])

  const pause = useCallback(() => {
    setStatus('later')
    persist('later', TOUR_STEPS[stepIndex].key)
  }, [stepIndex])

  const restart = useCallback(() => {
    setStatus('active')
    setStepIndex(0)
    persist('active', TOUR_STEPS[0].key)
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
      awaitingAction: step !== null && step.gate.kind !== 'acknowledge',
      showNudge: missed && Boolean(step?.nudge),
      dismissNudge: clearMissed,
      begin,
      acknowledge,
      back,
      pause,
      dismiss: finish,
      restart,
      resume,
    }),
    [phase, status, step, stepIndex, missed, clearMissed, begin, acknowledge, back, pause, finish, restart, resume],
  )

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}
