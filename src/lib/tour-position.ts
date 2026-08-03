/**
 * Where the tour bubble sits relative to the element it's pointing at.
 *
 * Pure and viewport-injected rather than reading `window` directly, so the placement rules are
 * testable — they're the part most likely to break silently, since a bubble pushed off-screen
 * still "works" as far as React is concerned and only shows up by looking at it on the one
 * screen size that reproduces it.
 */

export const BUBBLE_WIDTH = 340
/** Space between the spotlight ring and the bubble. */
export const GAP = 16
/** Minimum distance the bubble keeps from the viewport edge. */
export const EDGE = 12
/**
 * A fixed estimate rather than a measurement of the rendered bubble: measuring means rendering at
 * one position, reading the height, then moving it, which is a visible second paint at every step.
 * Generous on purpose — overestimating flips the bubble above the anchor slightly earlier than
 * strictly needed, which is harmless, whereas underestimating puts its footer off-screen.
 */
export const ESTIMATED_BUBBLE_HEIGHT = 260

export type Rect = {
  top: number
  left: number
  width: number
  height: number
  /** The target's own corner radius, so the highlight follows its shape rather than boxing it. */
  radius: string
  /** Bounds of the dialog the target sits inside, when it does. The bubble steers clear of it. */
  dialog: { top: number; left: number; width: number; height: number } | null
}
export type Viewport = { width: number; height: number }

export type BubblePlacement = { top: number; left: number; centered: boolean; side: 'below' | 'above' | 'center' }

export function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height &&
    a.radius === b.radius &&
    a.dialog?.top === b.dialog?.top &&
    a.dialog?.left === b.dialog?.left &&
    a.dialog?.width === b.dialog?.width &&
    a.dialog?.height === b.dialog?.height
  )
}

/**
 * Below the anchor when it fits, otherwise above; horizontally centred on the anchor but clamped
 * so the bubble never leaves the viewport. With no anchor (the welcome step, or an anchor that
 * isn't on screen) the bubble is centred and there's nothing to point at.
 */
export function bubblePlacement(rect: Rect | null, viewport: Viewport): BubblePlacement {
  if (!rect) return { top: 0, left: 0, centered: true, side: 'center' }

  /*
   * When the target is inside a dialog, sit beside the dialog rather than next to the target.
   *
   * The bubble is a real element and takes its own clicks, so placing it over a form means the
   * user cannot reach the fields underneath — observed on the Content Requirements step, where
   * the bubble covered the panel it had just asked the user to look at. Docking to whichever
   * side of the dialog has more room keeps the whole form reachable.
   */
  if (rect.dialog) {
    const d = rect.dialog
    const roomLeft = d.left
    const roomRight = viewport.width - (d.left + d.width)
    const top = Math.max(EDGE, Math.min(viewport.height - ESTIMATED_BUBBLE_HEIGHT - EDGE, d.top))

    if (Math.max(roomLeft, roomRight) >= BUBBLE_WIDTH + GAP * 2) {
      const left =
        roomRight >= roomLeft ? d.left + d.width + GAP : Math.max(EDGE, d.left - BUBBLE_WIDTH - GAP)
      return { top, left, centered: false, side: 'below' }
    }

    // Narrow viewport: no room either side, so tuck under the dialog and let the page scroll
    // rather than overlapping the form.
    const below = d.top + d.height + GAP
    const fitsBelow = below + ESTIMATED_BUBBLE_HEIGHT <= viewport.height - EDGE
    return {
      top: fitsBelow ? below : Math.max(EDGE, d.top - GAP - ESTIMATED_BUBBLE_HEIGHT),
      left: Math.max(EDGE, Math.min(viewport.width - BUBBLE_WIDTH - EDGE, d.left + d.width / 2 - BUBBLE_WIDTH / 2)),
      centered: false,
      side: fitsBelow ? 'below' : 'above',
    }
  }

  const below = rect.top + rect.height + GAP
  const fitsBelow = below + ESTIMATED_BUBBLE_HEIGHT <= viewport.height - EDGE

  // When it fits in neither direction — a tall anchor on a short viewport — clamping to EDGE
  // keeps the bubble on screen and overlapping the anchor, which still reads correctly. An
  // unclamped `rect.top - GAP - height` would place it above the top of the window entirely.
  const top = fitsBelow ? below : Math.max(EDGE, rect.top - GAP - ESTIMATED_BUBBLE_HEIGHT)

  const preferredLeft = rect.left + rect.width / 2 - BUBBLE_WIDTH / 2
  const maxLeft = Math.max(EDGE, viewport.width - BUBBLE_WIDTH - EDGE)
  const left = Math.max(EDGE, Math.min(maxLeft, preferredLeft))

  return { top, left, centered: false, side: fitsBelow ? 'below' : 'above' }
}
