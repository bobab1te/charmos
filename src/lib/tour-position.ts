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
 *
 * 320 rather than the original 260 because the tallest bubble in the walkthrough — the finale,
 * whose heading wraps to three lines — measures 304 in practice. The old value was an
 * underestimate for the one step where being unable to reach the button ends the tour.
 */
export const ESTIMATED_BUBBLE_HEIGHT = 320
/**
 * How much clear space beside a protected region is enough to dock there, accepting that the
 * bubble will hang over that region's outer edge.
 *
 * Nearly zero on purpose. Any threshold with a plausible-sounding value is a cliff: at 120 a
 * dialog with 115px either side fell through to the stacked branch and landed on its tab row,
 * which is the exact failure this is meant to prevent. Hanging over a region's outer edge is
 * always better than covering its middle, so the only case worth excluding is a region that spans
 * the whole viewport and has no side to dock to at all.
 */
export const MIN_SIDE_ROOM = 24

export type Rect = {
  top: number
  left: number
  width: number
  height: number
  /** The target's own corner radius, so the highlight follows its shape rather than boxing it. */
  radius: string
  /**
   * Bounds of a region the bubble must not cover — the dialog the target sits inside, or any panel
   * marked `data-tour-keep-clear`. Pointing at a control and then sitting on top of the thing it
   * reveals is the single most common way this bubble gets in the user's way, and the target's own
   * rect is not enough to prevent it: the input the step is about often does not exist yet at the
   * moment the bubble is placed.
   */
  keepClear: { top: number; left: number; width: number; height: number } | null
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
    a.keepClear?.top === b.keepClear?.top &&
    a.keepClear?.left === b.keepClear?.left &&
    a.keepClear?.width === b.keepClear?.width &&
    a.keepClear?.height === b.keepClear?.height
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
   * When the target sits inside a protected region, dock beside that region rather than next to
   * the target itself.
   *
   * The bubble is a real element and takes its own clicks, so placing it over a form means the
   * user cannot reach the fields underneath — observed on the Content Requirements step, where the
   * bubble covered the panel it had just asked the user to look at, and again on Add idea, where
   * it landed exactly where the new input appears. Docking to whichever side has more room keeps
   * the whole region reachable.
   */
  if (rect.keepClear) {
    const d = rect.keepClear
    const roomLeft = d.left
    const roomRight = viewport.width - (d.left + d.width)
    const top = Math.max(EDGE, Math.min(viewport.height - ESTIMATED_BUBBLE_HEIGHT - EDGE, d.top))

    /*
     * Dock to whichever side has more room, clamped to the viewport.
     *
     * The threshold is deliberately far below the bubble's own width. Requiring a full clear
     * BUBBLE_WIDTH meant a merely snug window fell through to the stacked branch below, which —
     * when the region is also too tall to sit under — clamps to the top edge and lands squarely on
     * the dialog's own tabs. Observed doing exactly that to the Manual entry tab it was pointing
     * at. Overlapping the far edge of a region is a much smaller cost than covering its controls,
     * because the controls a step asks for are never at the edge the bubble is pushed toward.
     */
    if (Math.max(roomLeft, roomRight) >= MIN_SIDE_ROOM) {
      const left =
        roomRight >= roomLeft
          ? Math.min(d.left + d.width + GAP, viewport.width - BUBBLE_WIDTH - EDGE)
          : Math.max(EDGE, d.left - BUBBLE_WIDTH - GAP)
      return { top, left: Math.max(EDGE, left), centered: false, side: 'below' }
    }

    // A region spanning the whole viewport: tuck under it and let the page scroll rather than
    // overlapping the form.
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
