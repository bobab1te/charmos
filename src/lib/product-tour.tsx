import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { anyAnchorPresent } from '#/lib/tour-anchors'
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
  /** True while the step is watching for a real action — drives the "Your turn" indicator. */
  awaitingAction: boolean
  /** The user just interacted with something unrelated; show the step's nudge. */
  showNudge: boolean
  dismissNudge: () => void
  begin: () => void
  /**
   * Move to the next step. Backs both routes forward: the gate calls it when the user completes
   * the action, and the Continue button calls it when they would rather not. Nothing distinguishes
   * the two, which is what keeps the manual path from being able to corrupt the tour's state.
   */
  next: () => void
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

/**
 * How long every anchor of a step may be missing before the tour assumes the user has wandered and
 * steers them back. Long enough that a navigation or a dialog animation is never mistaken for it.
 */
const RECOVER_AFTER_MS = 1500
/** How often the stranded-check runs. Two DOM queries; cheap enough to run continuously. */
const RECOVER_POLL_MS = 300

export function ProductTourProvider({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const navigate = useNavigate()

  const [status, setStatus] = useState<Profile['tour_status']>(profile.tour_status)
  const [stepIndex, setStepIndex] = useState(() => stepIndexOf(profile.tour_step))

  const step = status === 'active' ? (TOUR_STEPS[stepIndex] ?? null) : null
  const phase: TourPhase = status === 'pending' ? 'welcome' : status === 'active' ? 'step' : 'hidden'

  /*
   * Persistence as a reaction to state, rather than something each action remembers to do.
   *
   * Every mutator used to call persist() itself, and advance() called it from inside a setState
   * updater — a side effect in a function React is free to invoke twice, which it does in
   * development. Deriving the write from the state that resulted means it cannot disagree with
   * what is on screen, cannot double-fire, and cannot be forgotten by a new action added later.
   *
   * The signature guard skips the write when nothing meaningful changed, including on mount, so
   * reading the profile does not immediately write it back.
   */
  const persisted = useRef(`${profile.tour_status}:${profile.tour_step ?? ''}`)
  useEffect(() => {
    // 'done' deliberately clears the step: a finished tour with a leftover key is a state the
    // resume path could misread as somewhere to return to.
    const stepKey = status === 'done' || status === 'pending' ? null : (TOUR_STEPS[stepIndex]?.key ?? null)
    const signature = `${status}:${stepKey ?? ''}`
    if (persisted.current === signature) return
    persisted.current = signature
    // Unawaited: nothing in the UI depends on the write landing, and a walkthrough that stalls on
    // a round trip per step is worse than one that repeats a step after a reload.
    void updateMyProfile({ data: { tourStatus: status, tourStep: stepKey } }).catch(() => {})
  }, [status, stepIndex])

  const goTo = useCallback((index: number) => {
    setStepIndex(Math.max(0, Math.min(TOUR_STEPS.length - 1, index)))
  }, [])

  const finish = useCallback(() => setStatus('done'), [])

  /*
   * One way forward, shared by the gate and the Continue button.
   *
   * The ref guard makes a second call for the same step a no-op, so a gate that fires while the
   * user is also clicking Continue advances once rather than skipping a step. It needs no reset:
   * once stepIndex moves the recorded value no longer matches.
   */
  const advancedFrom = useRef<number | null>(null)
  const next = useCallback(() => {
    if (advancedFrom.current === stepIndex) return
    advancedFrom.current = stepIndex
    if (stepIndex >= TOUR_STEPS.length - 1) {
      finish()
      return
    }
    setStepIndex(stepIndex + 1)
  }, [stepIndex, finish])

  const { missed, clearMissed } = useTourGate(step?.gate ?? null, next)

  /** Which step we last routed for, so re-renders don't re-navigate. Cleared when we want a retry. */
  const navigatedFor = useRef<string | null>(null)

  /*
   * Self-healing for a step with nothing on screen to point at.
   *
   * Three ways to end up here, and they used to be three ways to get permanently stuck: resuming
   * mid-chapter on a step that lives inside the New Deal dialog, closing that dialog part-way
   * through, or simply clicking off to another page. In each case the bubble ends up describing an
   * element that is not there, with no way forward.
   *
   * This polls rather than checking once when the step becomes current, which is the actual fix.
   * The old version ran a single timer on mount, so a target that vanished *later* — the common
   * case, since closing the dialog is a thing users do — was never noticed at all and the tour sat
   * there forever. Watching continuously means recovery does not depend on catching the moment.
   *
   * Recovery only ever navigates back to the step's own page or rewinds to the step that reopens
   * the dialog. It never advances, so it cannot skip work the user has not done.
   */
  useEffect(() => {
    if (!step) return

    let missingSince: number | null = null
    const id = window.setInterval(() => {
      if (anyAnchorPresent(step.anchors)) {
        missingSince = null
        return
      }
      if (missingSince === null) {
        missingSince = Date.now()
        return
      }
      if (Date.now() - missingSince < RECOVER_AFTER_MS) return
      missingSince = null

      // Wandered off the page the step lives on: bring them back to it rather than rewinding.
      if (window.location.pathname !== step.to) {
        navigatedFor.current = null
        void navigate({ to: step.to, search: step.search ?? {}, replace: true })
        return
      }

      // On the right page, but the dialog holding the target is closed. Rewind to the step that
      // opens it, so the instruction the user sees is one they can actually follow.
      if (!step.recoverTo) return
      const target = TOUR_STEPS.findIndex((s) => s.key === step.recoverTo)
      if (target === -1) return
      navigatedFor.current = null
      goTo(target)
    }, RECOVER_POLL_MS)

    return () => window.clearInterval(id)
  }, [step, goTo, navigate])

  /*
   * Drive the route from the current step. Guarded on the step key rather than run on every
   * render: navigate() changes router state, which re-renders this provider, which would navigate
   * again — a loop rather than merely wasted work.
   *
   * A step whose route matches where the user already is does not navigate at all, which matters
   * because several consecutive steps sit on the same page inside an open modal — re-navigating
   * would tear that modal down mid-walkthrough.
   */
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

  // None of these write to the profile: the persistence effect above reacts to the state they set,
  // so there is exactly one place that decides what gets saved.
  const begin = useCallback(() => {
    setStatus('active')
    setStepIndex(0)
    navigatedFor.current = null
  }, [])

  const back = useCallback(() => goTo(stepIndex - 1), [stepIndex, goTo])

  const pause = useCallback(() => setStatus('later'), [])

  const restart = useCallback(() => {
    setStatus('active')
    setStepIndex(0)
    navigatedFor.current = null
  }, [])

  const resume = useCallback(() => {
    setStatus('active')
    navigatedFor.current = null
  }, [])

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
      next,
      back,
      pause,
      dismiss: finish,
      restart,
      resume,
    }),
    [phase, status, step, stepIndex, missed, clearMissed, begin, next, back, pause, finish, restart, resume],
  )

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}
