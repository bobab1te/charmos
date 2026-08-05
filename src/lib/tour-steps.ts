import type { Mood } from '#/components/charm/charm-mascot'
import type { TourEventName } from '#/lib/tour-events'

/**
 * The interactive walkthrough, as data.
 *
 * The governing rule: a step advances because the user completed its action, never because time
 * passed. Every step declares a `gate` describing what completion means, and the engine watches
 * for exactly that. There is no timeout anywhere in the tour, by design — a user who stops to
 * read, or wanders off to look at something, comes back to the same step still waiting.
 *
 * Steps point at their target through a `data-tour` attribute rather than importing the component
 * they highlight, so the tour composes on top of the real CRM instead of duplicating it.
 */

export type TourGate =
  /** The user clicked the anchored element. */
  | { kind: 'click'; anchor: string }
  /** The anchored input holds at least `minLength` non-space characters. */
  | { kind: 'text'; anchor: string; minLength?: number }
  /** The CRM emitted a real event — a record was actually saved. */
  | { kind: 'event'; event: TourEventName }
  /** The anchored element appeared in the DOM. */
  | { kind: 'appears'; anchor: string }
  /** Nothing to do — the step is explanatory and the user acknowledges it. */
  | { kind: 'acknowledge' }

export type TourStep = {
  key: string
  /** Route this step lives on. The engine navigates here when the step becomes current. */
  to: string
  search?: Record<string, string>
  /**
   * The `data-tour` targets this step's instruction walks through, in the order the user meets
   * them. The engine spotlights whichever one is currently live (see tour-anchors), so a step that
   * says "open this, then fill that" moves its own highlight along instead of pointing at the
   * opener the whole way through. A single-element step is just a chain of one.
   */
  anchors?: Array<string>
  title: string
  body: string
  gate: TourGate
  mood: Mood
  /**
   * Shown when the user interacts with something else while this step is waiting. Encouraging and
   * specific — never an error. Omitted where a wrong action isn't really possible.
   */
  nudge?: string
  /** Optional copyable text offered inside the bubble (the example brand email). */
  copyable?: string
  /** Marks the last step of a chapter, so the bubble can show a small completion beat. */
  chapterEnd?: boolean
  /**
   * Shows the mascot travelling from this step's anchor to `dragHintTo`, demonstrating a drag.
   * Only for the step that asks for one — a sentence cannot easily convey both what moves and
   * where it lands.
   */
  dragHintTo?: string
  /** The finale. The bubble drops its progress row and shows a completion treatment instead. */
  finale?: boolean
  /**
   * Step to fall back to when this one's anchor never appears.
   *
   * Steps that live inside the New Deal dialog are only reachable while it is open, and a user
   * who pauses mid-form, reloads, or resumes from Settings arrives with it closed — stranded on a
   * bubble pointing at nothing, with no way forward. Naming the step that re-opens the dialog
   * lets the tour heal itself instead.
   */
  recoverTo?: string
}

/**
 * The example email for the AI parsing chapter.
 *
 * Deliberately messy in the way real brand outreach is — the fee is written in prose, the
 * deliverables are split across a sentence, and the two dates mean different things (content due
 * vs. go live). That exercises the parser properly instead of demonstrating it on a form.
 */
export const EXAMPLE_BRAND_EMAIL = `Hi Amanda!

We loved your recent skincare content and would love to work with you on our Summer Glow campaign.

We're thinking 2 Instagram Reels and 3 Stories. Budget on our side is $2,500 USD, paid net 30 after the content goes live. We'd need drafts by August 15 so our team has time to review, and we're aiming to have everything live by August 25.

We'd also want 3 months of paid usage rights for the Reels.

Let me know if that works!

Priya
Partnerships, Lumière Beauty`

export const TOUR_STEPS: Array<TourStep> = [
  // ---------- Chapter 1: create a real brand deal ----------
  {
    key: 'deal-open',
    to: '/brand-deals',
    search: { tab: 'pipeline' },
    // Follows the sentence: the button, then the tab inside the dialog it opens, then the first
    // field of the form that tab reveals.
    anchors: ['new-deal', 'deal-manual-tab', 'deal-brand-name'],
    title: "Let's create your first partnership",
    body: "A normal brand deal first — the one-off kind. Open New Deal, then pick Manual entry so we can fill it in together.",
    // Gated on the manual form appearing rather than on the two clicks separately. A step whose
    // only lesson is "now click this tab" teaches nothing; what matters is that they arrive.
    gate: { kind: 'appears', anchor: 'deal-brand-name' },
    nudge: 'New Deal is the glowing button — then choose Manual entry inside.',
    mood: 'calm',
  },
  {
    key: 'deal-details',
    to: '/brand-deals',
    // Two fields, in the order the body names them — the highlight steps down to the deliverable
    // once the brand name holds something, which is also what the gate is waiting on.
    anchors: ['deal-brand-name', 'deal-deliverable-type'],
    title: 'Who is it with, and what are you making?',
    body: 'Brand name first — it does not have to be real. Then the deliverable just below: "2 Instagram Reels", "1 TikTok video". That line drives your deadlines and your dashboard.',
    // Gated on the deliverable, which is the second of the two fields — so filling in only the
    // brand name leaves the step waiting rather than advancing half-done.
    gate: { kind: 'text', anchor: 'deal-deliverable-type', minLength: 3 },
    nudge: 'Both fields are in the Brand section — the name, then the deliverable underneath.',
    recoverTo: 'deal-open',
    mood: 'calm',
  },
  {
    key: 'deal-requirements',
    to: '/brand-deals',
    anchors: ['deal-requirements-tab'],
    title: 'And what the brand needs',
    body: "Over here are the brand's own requirements — hooks, talking points, hashtags. It stays with the deal, so you're not digging through email at 2am.",
    gate: { kind: 'click', anchor: 'deal-requirements-tab' },
    nudge: 'Tap Content Requirements to look inside — nothing to fill in unless you want to.',
    recoverTo: 'deal-open',
    mood: 'calm',
  },
  {
    key: 'deal-save',
    to: '/brand-deals',
    anchors: ['deal-submit'],
    title: "You're ready. Let's save it.",
    body: 'Everything else is optional and you can come back to it any time.',
    gate: { kind: 'event', event: 'deal:created' },
    nudge: "Hit save when you're happy — I'll be here.",
    recoverTo: 'deal-open',
    mood: 'calm',
  },
  {
    key: 'deal-payoff',
    to: '/brand-deals',
    search: { tab: 'pipeline' },
    anchors: ['pipeline-board'],
    title: 'There it is',
    body: "On your board, sorted into a stage, counting toward your dashboard totals and deadlines. Drag it between columns as the work moves. And if a brand ever books you ongoing, retainers live under Long-Term Partnerships — same idea, recurring.",
    // The retainer aside rides along here rather than taking its own step: it is genuinely a
    // "by the way", and a second acknowledge-only beat back to back is just two clicks.
    gate: { kind: 'acknowledge' },
    mood: 'bright',
    chapterEnd: true,
  },

  // ---------- Chapter 2: AI parsing ----------
  {
    key: 'parse-run',
    to: '/brand-deals',
    search: { tab: 'pipeline' },
    // The whole motion: open the dialog, fill the paste box, then press Parse. The Parse button is
    // disabled until the box holds something, so the chain only reaches it once it can be pressed.
    anchors: ['new-deal', 'deal-parse-input', 'deal-parse-submit'],
    title: 'No brand email handy? Try this one.',
    body: 'Most deals arrive as an email. Open a new deal, copy this into the paste box, and hit Parse with AI. It takes a few seconds.',
    // One step for open → paste → parse: they are a single motion, and splitting them made the
    // user click through three bubbles to perform one action.
    gate: { kind: 'event', event: 'parse:succeeded' },
    copyable: EXAMPLE_BRAND_EMAIL,
    nudge: 'Paste it into the big box, then press Parse with AI.',
    mood: 'calm',
  },
  {
    key: 'parse-review',
    to: '/brand-deals',
    anchors: ['deal-form-body'],
    title: 'Check its work',
    body: "The fee, deliverables, dates and usage rights are all in the form now — and all editable. Nothing is saved until you say so, so fix anything it misread before you commit.",
    gate: { kind: 'acknowledge' },
    recoverTo: 'parse-run',
    mood: 'bright',
    chapterEnd: true,
  },

  // ---------- Chapter 3: scrapbook → calendar ----------
  {
    key: 'idea-create',
    to: '/scrapbook',
    // The button, then the field it reveals — so the spotlight lands on the box being typed into
    // rather than staying on the button that is now beside the point.
    anchors: ['add-idea', 'idea-input'],
    title: "Let's save an idea before it disappears",
    body: 'The Scrapbook is for concepts with nowhere to go yet. Add one — try "GRWM for a summer campaign" — and press Enter.',
    gate: { kind: 'event', event: 'idea:created' },
    nudge: 'Add idea is the glowing button at the top of your idea bank.',
    mood: 'calm',
  },
  {
    key: 'idea-drag',
    to: '/scrapbook',
    anchors: ['unscheduled-list'],
    title: 'Now give it a place on your calendar',
    body: 'Drag your idea from the bank onto any date. It becomes a scheduled post, and shows up on your dashboard next to your deal deadlines.',
    gate: { kind: 'event', event: 'idea:scheduled' },
    dragHintTo: '[data-tour="calendar-grid"]',
    nudge: 'Almost! Drop it onto a day cell in the calendar on the left.',
    mood: 'calm',
    chapterEnd: true,
  },

  // ---------- Chapter 4: make it yours, then finish ----------
  {
    key: 'complete',
    to: '/settings',
    anchors: ['replay-tour'],
    title: "Congrats! You're all ready to manage your content like a pro ✨",
    body: 'Hide any dashboard widget you never look at, or change your theme and currency. You can always find this tutorial again in Settings.',
    // Anchored on the replay control itself, so the sentence above is pointing at the thing it
    // describes rather than asking the user to take it on trust.
    gate: { kind: 'acknowledge' },
    mood: 'bright',
    finale: true,
  },
]

export function stepIndexOf(key: string | null | undefined): number {
  if (!key) return 0
  const i = TOUR_STEPS.findIndex((s) => s.key === key)
  // An unrecognised key means the step was renamed or removed since the user paused. Restarting
  // from the beginning beats stranding them on a step that no longer exists.
  return i === -1 ? 0 : i
}
