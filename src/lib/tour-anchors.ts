/**
 * Which element a step should be pointing at *right now*.
 *
 * A step is rarely one click. "Open New Deal, then pick Manual entry" is two, and pasting an email
 * and parsing it is three. The tour used to name a single anchor per step, so the spotlight stayed
 * on the button that opened the dialog while the sentence asked for something inside it — the user
 * was told what to do and shown somewhere else.
 *
 * So a step names the *chain* of elements its instruction walks through, and the engine re-resolves
 * which one is live on every frame. The highlight then follows the user through the step by itself,
 * with no extra steps to click past and no per-step special cases.
 *
 * Resolution is pure and probe-injected so the rules can be tested without a DOM — they are the
 * part most likely to break silently, since a highlight on the wrong element still renders.
 */

export type AnchorProbe = {
  visible: boolean
  /** Present but not yet usable — a submit button waiting on its form. Never the live target. */
  disabled: boolean
  /**
   * Whether this anchor's work is done, which is what lets the chain move on. Text fields count as
   * done once they hold something; anything else is done merely by existing, since its completion
   * shows up as the *next* anchor appearing.
   */
  satisfied: boolean
}

/**
 * The last anchor the user can actually act on.
 *
 * Walks the chain in order and stops at the first anchor that is missing, unusable, or still
 * waiting on the user. Stopping — rather than skipping ahead — is what keeps the highlight behind
 * the user rather than ahead of them: a later element being on screen does not mean the earlier one
 * is finished, and pointing at a disabled Parse button while the paste box is empty would be
 * pointing at something that cannot be clicked.
 *
 * Returns null when even the first anchor is absent, which the caller treats as "nothing to
 * spotlight yet" rather than as an error — the page may still be navigating.
 */
export function resolveAnchorChain(
  anchors: Array<string>,
  probe: (name: string) => AnchorProbe | null,
): string | null {
  let chosen: string | null = null

  for (const name of anchors) {
    const p = probe(name)
    // Not rendered yet: the user has not got this far, so the previous anchor is still the ask.
    if (!p || !p.visible) break
    // Rendered but dead. Highlighting it would invite a click that does nothing.
    if (p.disabled) break

    chosen = name

    // Still the user's turn here. Anything further along the chain is not their problem yet.
    if (!p.satisfied) break
  }

  return chosen
}

/**
 * Read an anchor's live state from the document.
 *
 * Deliberately shallow — only the anchored element itself is inspected, never its descendants. A
 * step can anchor a whole panel, and a panel almost always contains *some* disabled control; asking
 * "does anything inside this look disabled" would mark those panels dead and strand the chain.
 */
export function probeAnchorInDom(name: string): AnchorProbe | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${name}"]`)
  if (!el) return null

  const r = el.getBoundingClientRect()
  const disabled =
    (el as HTMLButtonElement).disabled === true || el.getAttribute('aria-disabled') === 'true'

  // Only real text entry gets the "has the user filled this in" treatment. Everything else reports
  // satisfied so the chain is free to move on as soon as the next element shows up.
  const isField = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
  const satisfied = isField ? el.value.trim().length > 0 : true

  return { visible: r.width > 0 && r.height > 0, disabled, satisfied }
}

/** Resolve straight from the document. The common case; kept together with the rules it uses. */
export function resolveAnchorInDom(anchors: Array<string> | undefined): string | null {
  if (!anchors || anchors.length === 0) return null
  return resolveAnchorChain(anchors, probeAnchorInDom)
}

/** True when any of a step's anchors is on the page — used to decide if a step is stranded. */
export function anyAnchorPresent(anchors: Array<string> | undefined): boolean {
  if (!anchors || anchors.length === 0) return false
  return anchors.some((name) => document.querySelector(`[data-tour="${name}"]`) !== null)
}
