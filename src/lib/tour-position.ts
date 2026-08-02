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

export type Rect = { top: number; left: number; width: number; height: number }
export type Viewport = { width: number; height: number }

export type BubblePlacement = { top: number; left: number; centered: boolean; side: 'below' | 'above' | 'center' }

export function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height
}

/**
 * Below the anchor when it fits, otherwise above; horizontally centred on the anchor but clamped
 * so the bubble never leaves the viewport. With no anchor (the welcome step, or an anchor that
 * isn't on screen) the bubble is centred and there's nothing to point at.
 */
export function bubblePlacement(rect: Rect | null, viewport: Viewport): BubblePlacement {
  if (!rect) return { top: 0, left: 0, centered: true, side: 'center' }

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
