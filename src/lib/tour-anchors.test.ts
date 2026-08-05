import { describe, expect, it } from 'vitest'
import { resolveAnchorChain } from './tour-anchors'
import type { AnchorProbe } from './tour-anchors'
import { TOUR_STEPS } from './tour-steps'

/**
 * Which element the spotlight lands on as the user works through a multi-part step.
 *
 * Asserted rather than eyeballed because the failure is invisible: a highlight on the wrong
 * element renders perfectly and animates correctly, and only shows up as a user not knowing where
 * to click. Every case below is a real moment from the walkthrough.
 */

const absent = null
const ready: AnchorProbe = { visible: true, disabled: false, satisfied: true }
const empty: AnchorProbe = { visible: true, disabled: false, satisfied: false }
const dead: AnchorProbe = { visible: true, disabled: true, satisfied: false }

function chain(anchors: Array<string>, states: Record<string, AnchorProbe | null>) {
  return resolveAnchorChain(anchors, (name) => states[name] ?? absent)
}

describe('resolveAnchorChain', () => {
  const openDeal = ['new-deal', 'deal-manual-tab', 'deal-brand-name']

  it('points at the opener while the dialog is still closed', () => {
    expect(chain(openDeal, { 'new-deal': ready })).toBe('new-deal')
  })

  it('moves to the tab once the dialog it opens is on screen', () => {
    expect(chain(openDeal, { 'new-deal': ready, 'deal-manual-tab': ready })).toBe('deal-manual-tab')
  })

  it('moves to the field once the tab reveals it', () => {
    expect(
      chain(openDeal, { 'new-deal': ready, 'deal-manual-tab': ready, 'deal-brand-name': empty }),
    ).toBe('deal-brand-name')
  })

  const parse = ['new-deal', 'deal-parse-input', 'deal-parse-submit']

  it('waits on the paste box rather than jumping to a Parse button that cannot be pressed', () => {
    expect(chain(parse, { 'new-deal': ready, 'deal-parse-input': empty, 'deal-parse-submit': dead })).toBe(
      'deal-parse-input',
    )
  })

  it('moves to Parse the moment the box has something in it', () => {
    expect(chain(parse, { 'new-deal': ready, 'deal-parse-input': ready, 'deal-parse-submit': ready })).toBe(
      'deal-parse-submit',
    )
  })

  const fields = ['deal-brand-name', 'deal-deliverable-type']

  it('stays on the first field until the user has typed in it', () => {
    expect(chain(fields, { 'deal-brand-name': empty, 'deal-deliverable-type': empty })).toBe('deal-brand-name')
  })

  it('steps down to the second field once the first is filled', () => {
    expect(chain(fields, { 'deal-brand-name': ready, 'deal-deliverable-type': empty })).toBe(
      'deal-deliverable-type',
    )
  })

  it('never runs ahead of a gap in the chain', () => {
    // The tab is gone (a different mode is showing) but the field somehow resolves. Skipping to it
    // would point at something the user has no route to.
    expect(chain(openDeal, { 'new-deal': ready, 'deal-manual-tab': absent, 'deal-brand-name': ready })).toBe(
      'new-deal',
    )
  })

  it('ignores an element that is present but has no box, so a collapsed panel is not a target', () => {
    expect(chain(openDeal, { 'new-deal': { ...ready, visible: false } })).toBeNull()
  })

  it('has nothing to point at before the page renders', () => {
    expect(chain(openDeal, {})).toBeNull()
    expect(resolveAnchorChain([], () => ready)).toBeNull()
  })
})

describe('TOUR_STEPS anchors', () => {
  it('gives every step at least one anchor to point at', () => {
    // A step with no anchor centres its bubble and highlights nothing, which is the state the
    // rebuild was meant to remove — the user is told to do something and shown nowhere.
    TOUR_STEPS.forEach((step) => {
      expect(step.anchors, `step "${step.key}" has no anchors`).toBeDefined()
      expect(step.anchors?.length, `step "${step.key}" has an empty anchor chain`).toBeGreaterThan(0)
    })
  })

  it('keeps the walkthrough at ten steps', () => {
    // The count is user-visible on every bubble, and drifted three times before it was pinned.
    expect(TOUR_STEPS).toHaveLength(10)
  })

  it('ends on the finale, and only there', () => {
    expect(TOUR_STEPS.filter((s) => s.finale)).toHaveLength(1)
    expect(TOUR_STEPS[TOUR_STEPS.length - 1].finale).toBe(true)
  })

  it('points every recoverTo at a step that exists and comes earlier', () => {
    // Recovery must only ever rewind. A forward or dangling target would skip work or hang.
    TOUR_STEPS.forEach((step, i) => {
      if (!step.recoverTo) return
      const target = TOUR_STEPS.findIndex((s) => s.key === step.recoverTo)
      expect(target, `step "${step.key}" recovers to a step that does not exist`).toBeGreaterThanOrEqual(0)
      expect(target, `step "${step.key}" recovers forwards`).toBeLessThan(i)
    })
  })
})
