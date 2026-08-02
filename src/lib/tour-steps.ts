import type { Mood } from '#/components/charm/charm-mascot'

/**
 * The four stops of the product tour, in order.
 *
 * Each step names a DOM anchor rather than importing the component it points at, so the tour
 * stays a single self-contained feature instead of threading refs through four unrelated pages.
 * The anchor is a `data-tour="<anchor>"` attribute on the target element; adding one to a new
 * element is the entire cost of putting it on the tour.
 *
 * An anchor that isn't on screen is a normal, expected state, not an error — the user may have
 * navigated away mid-tour, or the element may be inside a collapsed sidebar. The bubble falls
 * back to centre-screen rather than pointing at nothing (see tour-bubble.tsx).
 */

export type TourStepKey = 'partnership' | 'ai-parsing' | 'scrapbook' | 'settings'

export type TourStep = {
  key: TourStepKey
  /** Where this step lives. The provider navigates here when the step becomes current. */
  to: string
  search?: Record<string, string>
  /** `data-tour` value of the element to spotlight. */
  anchor: string
  title: string
  body: string
  /** The mascot's expression for this step — bright for the celebratory last one. */
  mood: Mood
}

export const TOUR_STEPS: Array<TourStep> = [
  {
    key: 'partnership',
    to: '/brand-deals',
    search: { tab: 'partnerships' },
    anchor: 'new-partnership',
    title: 'Start with a partnership',
    body: 'Retainers and other ongoing relationships live here, kept separate from one-off deals so a monthly retainer never gets mistaken for a single payment.',
    mood: 'calm',
  },
  {
    key: 'ai-parsing',
    to: '/brand-deals',
    search: { tab: 'pipeline' },
    anchor: 'new-deal',
    title: 'Let AI read the email',
    body: 'Paste a brand email or DM straight into a new deal and the fee, deliverables, and dates get filled in for you. Correct anything it got wrong before saving — nothing is written until you do.',
    mood: 'calm',
  },
  {
    key: 'scrapbook',
    to: '/scrapbook',
    anchor: 'add-idea',
    title: 'Park your ideas here',
    body: "The Scrapbook is for concepts with nowhere to go yet. Drop one in unscheduled, then drag it onto a date once you know when it's shooting.",
    mood: 'calm',
  },
  {
    key: 'settings',
    to: '/settings',
    anchor: 'dashboard-widgets',
    title: 'Make it yours',
    body: 'Hide any dashboard widget you never look at and bring it back from here. Your theme, currency, and profile live on this page too.',
    mood: 'bright',
  },
]

export function stepIndexOf(key: string | null | undefined): number {
  if (!key) return 0
  const i = TOUR_STEPS.findIndex((s) => s.key === key)
  // An unrecognised key means the step was renamed or removed since the user paused. Restarting
  // from the beginning is better than stranding them on a step that no longer exists.
  return i === -1 ? 0 : i
}
