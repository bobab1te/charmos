import { describe, expect, it } from 'vitest'
import {
  BUBBLE_WIDTH,
  EDGE,
  ESTIMATED_BUBBLE_HEIGHT,
  GAP,
  bubblePlacement,
  sameRect,
} from './tour-position'
import type { Rect } from './tour-position'
import { TOUR_STEPS, stepIndexOf } from './tour-steps'

/**
 * The tour bubble's placement rules.
 *
 * These are asserted rather than eyeballed because the failure they guard against is invisible in
 * normal use: a bubble that runs off the bottom or side of the viewport still renders and still
 * animates, it just can't be read or clicked — and only on the window sizes that trigger it.
 */

const desktop = { width: 1280, height: 800 }

function rect(over: Partial<Rect> = {}): Rect {
  return { top: 100, left: 500, width: 160, height: 40, radius: '8px', keepClear: null, ...over }
}

describe('bubblePlacement', () => {
  it('centres itself when there is no anchor', () => {
    const p = bubblePlacement(null, desktop)
    expect(p.centered).toBe(true)
    expect(p.side).toBe('center')
  })

  it('sits below the anchor when there is room', () => {
    const r = rect()
    const p = bubblePlacement(r, desktop)
    expect(p.side).toBe('below')
    expect(p.top).toBe(r.top + r.height + GAP)
  })

  it('is horizontally centred on the anchor', () => {
    const r = rect()
    const p = bubblePlacement(r, desktop)
    expect(p.left + BUBBLE_WIDTH / 2).toBe(r.left + r.width / 2)
  })

  it('flips above the anchor when it would overflow the bottom', () => {
    // Anchor near the bottom: below would need 740 + 40 + 16 + 260, well past an 800px viewport.
    const r = rect({ top: 740 })
    const p = bubblePlacement(r, desktop)
    expect(p.side).toBe('above')
    expect(p.top).toBe(r.top - GAP - ESTIMATED_BUBBLE_HEIGHT)
    expect(p.top).toBeGreaterThanOrEqual(EDGE)
  })

  it('never runs off the right edge for an anchor near the right', () => {
    const p = bubblePlacement(rect({ left: 1240, width: 40 }), desktop)
    expect(p.left + BUBBLE_WIDTH).toBeLessThanOrEqual(desktop.width - EDGE)
  })

  it('never runs off the left edge for an anchor near the left', () => {
    const p = bubblePlacement(rect({ left: 0, width: 40 }), desktop)
    expect(p.left).toBeGreaterThanOrEqual(EDGE)
  })

  it('stays on screen when the viewport is narrower than the bubble', () => {
    // Below the bubble's own width, the clamp range inverts — min would otherwise win over max
    // and push it to a negative left.
    const p = bubblePlacement(rect({ left: 10, width: 40 }), { width: 300, height: 700 })
    expect(p.left).toBeGreaterThanOrEqual(EDGE)
  })

  it('stays on screen when the anchor fills a short viewport', () => {
    const p = bubblePlacement(rect({ top: 20, height: 400 }), { width: 1280, height: 500 })
    expect(p.top).toBeGreaterThanOrEqual(EDGE)
  })
})

describe('bubblePlacement with a protected region', () => {
  // The New Deal dialog on a 1226px-wide window: 157px clear either side, and tall enough that
  // there is no room above or below it either.
  const dialog = { top: 217, left: 157, width: 912, height: 540 }
  const narrow = { width: 1226, height: 980 }

  it('docks beside the region rather than landing on its controls', () => {
    const p = bubblePlacement(rect({ top: 363, left: 390, keepClear: dialog }), narrow)
    // Anything at or above the dialog's top would cover the tab row, which is what it used to do.
    expect(p.top).toBeGreaterThanOrEqual(dialog.top)
    expect(p.left).toBeGreaterThan(dialog.left + dialog.width / 2)
  })

  it('stays inside the viewport when it hangs over the region edge', () => {
    const p = bubblePlacement(rect({ keepClear: dialog }), narrow)
    expect(p.left).toBeGreaterThanOrEqual(EDGE)
    expect(p.left + BUBBLE_WIDTH).toBeLessThanOrEqual(narrow.width - EDGE)
  })

  it('sits fully clear when the window is wide enough to allow it', () => {
    const p = bubblePlacement(rect({ keepClear: dialog }), { width: 1920, height: 1000 })
    expect(p.left).toBeGreaterThanOrEqual(dialog.left + dialog.width)
  })

  it('goes under a region that spans the whole width, never on top of it', () => {
    const full = { top: 40, left: 0, width: 1226, height: 300 }
    const p = bubblePlacement(rect({ keepClear: full }), narrow)
    expect(p.top).toBeGreaterThanOrEqual(full.top + full.height)
  })
})

describe('sameRect', () => {
  it('treats identical values as unchanged, so a stationary anchor causes no re-render', () => {
    expect(sameRect(rect(), rect())).toBe(true)
  })

  it('detects a moved anchor', () => {
    expect(sameRect(rect(), rect({ top: 101 }))).toBe(false)
  })

  it('detects appearing and disappearing anchors', () => {
    expect(sameRect(null, rect())).toBe(false)
    expect(sameRect(rect(), null)).toBe(false)
    expect(sameRect(null, null)).toBe(true)
  })
})

describe('stepIndexOf', () => {
  it('resolves each known step key to its position', () => {
    TOUR_STEPS.forEach((step, i) => expect(stepIndexOf(step.key)).toBe(i))
  })

  it('falls back to the first step for a key that no longer exists', () => {
    // A user who paused on a step that was later renamed or removed restarts rather than
    // being stranded on a step the app can no longer render.
    expect(stepIndexOf('a-step-that-was-removed')).toBe(0)
    expect(stepIndexOf(null)).toBe(0)
    expect(stepIndexOf(undefined)).toBe(0)
  })
})
