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
  /** `data-tour` value to spotlight. Omitted for steps with nothing to point at. */
  anchor?: string
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
    anchor: 'new-deal',
    title: "Let's create your first partnership",
    body: "We'll do a normal brand deal first — the one-off kind. Open the form and I'll walk you through it.",
    gate: { kind: 'click', anchor: 'new-deal' },
    nudge: 'The New Deal button is the one glowing — give it a click when you\'re ready.',
    mood: 'calm',
  },
  {
    key: 'deal-manual',
    to: '/brand-deals',
    anchor: 'deal-manual-tab',
    title: 'Enter it yourself this time',
    body: "We'll come back to the AI parser in a moment. For now let's fill it in by hand so you know where everything lives.",
    gate: { kind: 'click', anchor: 'deal-manual-tab' },
    nudge: 'Switch to Manual entry — the AI route is the next chapter.',
    mood: 'calm',
  },
  {
    key: 'deal-brand',
    to: '/brand-deals',
    anchor: 'deal-brand-name',
    title: 'Who is it with?',
    body: "Type the brand's name. It doesn't have to be real — you can delete this deal afterwards. CharmOS creates the brand for you when you save.",
    gate: { kind: 'text', anchor: 'deal-brand-name', minLength: 2 },
    mood: 'calm',
  },
  {
    key: 'deal-deliverable',
    to: '/brand-deals',
    anchor: 'deal-deliverable-type',
    title: 'Now tell CharmOS what you\'re creating',
    body: 'One line is enough — "2 Instagram Reels", "1 TikTok video". This is what shows up on your dashboard and drives your deadlines.',
    gate: { kind: 'text', anchor: 'deal-deliverable-type', minLength: 3 },
    mood: 'calm',
  },
  {
    key: 'deal-requirements',
    to: '/brand-deals',
    anchor: 'deal-requirements-tab',
    title: 'And what the brand needs',
    body: "Switch over here for the brand's own requirements — hooks, talking points, hashtags, anything they've asked for. It stays with the deal so you're not digging through email at 2am.",
    gate: { kind: 'click', anchor: 'deal-requirements-tab' },
    nudge: 'Tap the Content Requirements tab to peek inside — nothing to fill in unless you want to.',
    mood: 'calm',
  },
  {
    key: 'deal-save',
    to: '/brand-deals',
    anchor: 'deal-submit',
    title: "You're ready. Let's save it.",
    body: 'Everything else is optional and you can come back to it any time.',
    gate: { kind: 'event', event: 'deal:created' },
    nudge: 'Hit save when you\'re happy — I\'ll be here.',
    mood: 'calm',
  },
  {
    key: 'deal-payoff',
    to: '/brand-deals',
    search: { tab: 'pipeline' },
    anchor: 'pipeline-board',
    title: 'There it is',
    body: "It's on your board, sorted into a stage, counting toward your dashboard totals and deadlines. Drag it between columns as the work moves — that's the whole system.",
    gate: { kind: 'acknowledge' },
    mood: 'bright',
  },
  {
    key: 'retainer-intro',
    to: '/brand-deals',
    search: { tab: 'partnerships' },
    anchor: 'partnerships-tab',
    title: 'And if you work with a brand long-term…',
    body: "Retainers live here instead — recurring deliverables, recurring payments, tracked separately so a monthly retainer never reads as one payment. Have a look whenever you like; there's nothing to set up now.",
    gate: { kind: 'acknowledge' },
    mood: 'calm',
    chapterEnd: true,
  },

  // ---------- Chapter 2: AI parsing ----------
  {
    key: 'parse-open',
    to: '/brand-deals',
    search: { tab: 'pipeline' },
    anchor: 'new-deal',
    title: 'Now the fast way',
    body: "Most deals arrive as an email. CharmOS can read one and fill the form in for you. Open a new deal again.",
    gate: { kind: 'click', anchor: 'new-deal' },
    mood: 'calm',
  },
  {
    key: 'parse-paste',
    to: '/brand-deals',
    anchor: 'deal-parse-input',
    title: 'No brand email handy? Try this one.',
    body: "Copy the example and paste it into the box. It's deliberately a bit messy — that's what real outreach looks like.",
    gate: { kind: 'text', anchor: 'deal-parse-input', minLength: 40 },
    copyable: EXAMPLE_BRAND_EMAIL,
    nudge: 'Paste it into the big box — the one asking for the brand\'s email or DM.',
    mood: 'calm',
  },
  {
    key: 'parse-run',
    to: '/brand-deals',
    anchor: 'deal-parse-submit',
    title: 'Let it read',
    body: 'This takes a few seconds. It pulls out the fee, the deliverables, the dates, and the usage rights.',
    gate: { kind: 'event', event: 'parse:succeeded' },
    nudge: 'Press Parse with AI when you\'re ready.',
    mood: 'calm',
  },
  {
    key: 'parse-review',
    to: '/brand-deals',
    anchor: 'deal-form-body',
    title: 'Check its work',
    body: "Everything it found is now in the form — and it's all editable. Nothing is saved until you say so, so correct anything it misread before you commit.",
    gate: { kind: 'acknowledge' },
    mood: 'bright',
    chapterEnd: true,
  },

  // ---------- Chapter 3: scrapbook → calendar ----------
  {
    key: 'idea-add',
    to: '/scrapbook',
    anchor: 'add-idea',
    title: "Let's save an idea before it disappears",
    body: 'The Scrapbook is for concepts with nowhere to go yet. No brand, no deadline, just the thought.',
    gate: { kind: 'click', anchor: 'add-idea' },
    nudge: 'Add idea is the glowing button, top-right of your idea bank.',
    mood: 'calm',
  },
  {
    key: 'idea-type',
    to: '/scrapbook',
    anchor: 'idea-input',
    title: 'Anything at all',
    body: 'Try "GRWM for a summer campaign" — then press Enter to save it.',
    gate: { kind: 'event', event: 'idea:created' },
    mood: 'calm',
  },
  {
    key: 'idea-drag',
    to: '/scrapbook',
    anchor: 'unscheduled-list',
    title: "Now let's give it a place on your calendar",
    body: 'Drag your idea from the bank onto any date. It becomes a scheduled post — and shows up on your dashboard alongside your deal deadlines.',
    gate: { kind: 'event', event: 'idea:scheduled' },
    nudge: 'Almost! Drop it onto a day cell in the calendar on the left.',
    mood: 'calm',
  },
  {
    key: 'finish',
    to: '/dashboard',
    title: "That's the whole thing",
    body: "A deal on your board, an idea on your calendar, and a parser that reads brand emails for you. Everything else is a variation on what you just did. I'll be in Settings if you want a refresher.",
    gate: { kind: 'acknowledge' },
    mood: 'bright',
    chapterEnd: true,
  },
]

export function stepIndexOf(key: string | null | undefined): number {
  if (!key) return 0
  const i = TOUR_STEPS.findIndex((s) => s.key === key)
  // An unrecognised key means the step was renamed or removed since the user paused. Restarting
  // from the beginning beats stranding them on a step that no longer exists.
  return i === -1 ? 0 : i
}
