import { describe, expect, it } from 'vitest'
import { dateOnlyToISOString } from './date-only'
import { computeMetrics, monthlyRevenue } from './derived'
import type { BrandDeal, LedgerEntry } from './types'

/**
 * Regression tests for the revenue totals.
 *
 * The bug these were written for: a payment can be recorded in two different places (a deal's own
 * compensation, accrued via dealEarnedDate, or a row in the ledger) and the aggregation has to pick
 * exactly one of them per payment. Getting that wrong in one direction double-counts; getting it
 * wrong in the other silently loses money. Both directions are asserted here.
 */

const now = new Date('2026-08-15T12:00:00Z')
const identity = (amount: number) => amount

function deal(over: Partial<BrandDeal> = {}): BrandDeal {
  return {
    id: 'd1',
    brandId: 'b1',
    stage: 'completed',
    compensationType: 'paid',
    compensationAmount: 1000,
    compensationCurrency: 'USD',
    paid: true,
    paidDate: '2026-08-10T00:00:00Z',
    stageUpdatedAt: '2026-08-10T00:00:00Z',
    deliverables: [],
    archived: false,
    ...over,
  } as BrandDeal
}

function entry(over: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: 'l1',
    type: 'income',
    amount: 1000,
    currency: 'USD',
    date: '2026-08-10T00:00:00Z',
    description: 'payment',
    ...over,
  } as LedgerEntry
}

const total = (deals: Array<BrandDeal>, ledger: Array<LedgerEntry>) =>
  computeMetrics(deals, ledger, identity, now).earningsThisMonth

describe('earnings totals', () => {
  it('counts a one-time paid deal exactly once, not twice via its ledger entry', () => {
    const d = deal()
    // syncDealLedgerEntry writes this row whenever a deal is marked paid in full.
    const l = entry({ dealId: d.id })
    expect(total([d], [l])).toBe(1000)
  })

  it('counts a retainer payment from its ledger entry', () => {
    const l = entry({ id: 'r1', partnershipId: 'p1', amount: 500, description: 'retainer payment' })
    expect(total([], [l])).toBe(500)
  })

  it('counts several retainer payments in the same month', () => {
    const ledger = [
      entry({ id: 'r1', partnershipId: 'p1', amount: 500 }),
      entry({ id: 'r2', partnershipId: 'p2', amount: 250 }),
      entry({ id: 'r3', partnershipId: 'p1', amount: 500, date: '2026-08-02T00:00:00Z' }),
    ]
    expect(total([], ledger)).toBe(1250)
  })

  /**
   * Guards the convention the totals depend on: month bucketing uses date-fns isSameMonth, which
   * reads the LOCAL month. A bare "YYYY-MM-DD" parses as UTC midnight, which is the previous day —
   * and so possibly the previous month — anywhere west of UTC, which would drop a payment dated the
   * 1st out of its own month. dateOnlyToISOString exists to stop that, and every date-only input in
   * charm-store goes through it; this asserts the two halves still agree.
   */
  it('keeps a payment dated the 1st inside its own month, via the local-midnight convention', () => {
    const firstOfMonth = dateOnlyToISOString('2026-08-01')
    expect(total([], [entry({ id: 'r1', partnershipId: 'p1', amount: 500, date: firstOfMonth })])).toBe(500)
  })

  it('counts a mixture of one-time and retainer payments', () => {
    const d = deal()
    const ledger = [entry({ dealId: d.id }), entry({ id: 'r1', partnershipId: 'p1', amount: 500 })]
    expect(total([d], ledger)).toBe(1500)
  })

  it('counts a manually added ledger entry with no deal or partnership link', () => {
    expect(total([], [entry({ id: 'm1', amount: 300 })])).toBe(300)
  })

  it('excludes expenses', () => {
    expect(total([], [entry({ id: 'e1', type: 'expense', amount: 300 })])).toBe(0)
  })

  // --- the reported bug ------------------------------------------------------------------

  it('still counts a paid deal after it is archived', () => {
    const d = deal({ archived: true })
    const l = entry({ dealId: d.id })
    expect(total([d], [l])).toBe(1000)
  })

  it('still counts an archived deal in the monthly revenue series', () => {
    const d = deal({ archived: true })
    const l = entry({ dealId: d.id })
    const august = monthlyRevenue([l], [d], identity, 6, now).at(-1)
    expect(august?.total).toBe(1000)
  })

  it('counts every payment of a deal paid in instalments, not just one', () => {
    // Two real payments against one deal. Whatever the accrual does, the money that actually
    // arrived is two rows, and the total has to reflect both.
    const d = deal({ compensationAmount: 1000 })
    const ledger = [
      entry({ id: 'i1', dealId: d.id, amount: 600 }),
      entry({ id: 'i2', dealId: d.id, amount: 400, date: '2026-08-12T00:00:00Z' }),
    ]
    expect(total([d], ledger)).toBe(1000)
  })

  it('does not lose an unarchived, unpaid deal that has accrued but has no ledger row', () => {
    const d = deal({ paid: false, paidDate: undefined, stage: 'live' })
    expect(total([d], [])).toBe(1000)
  })

  /**
   * A retainer confirmed late must land in the month it was earned, not the month it was
   * confirmed. confirmPartnershipCycle dates its ledger entry from the cycle's periodStart for
   * exactly this reason — backfillPastPartnershipCycles exists to create historical cycles in
   * bulk, and dating them "now" piled several months of retainer income into whichever month the
   * user happened to catch up in, leaving the real months reading zero.
   */
  it('books a retainer into its own period, not the month it was confirmed', () => {
    const juneCycleConfirmedInAugust = entry({
      id: 'r-june',
      partnershipId: 'p1',
      amount: 250,
      date: '2026-06-11T09:00:00Z', // periodStart, not the confirmation click
    })
    const monthly = monthlyRevenue([juneCycleConfirmedInAugust], [], identity, 6, now)
    const june = monthly.find((m) => m.key === '2026-5')

    expect(june?.total).toBe(250)
    expect(total([], [juneCycleConfirmedInAugust])).toBe(0) // August, correctly, has none of it
  })

  /**
   * The dashboard metric and the Finances chart are the two things users compare against each
   * other. They now read the same event list, and this pins that: the current month's bar must
   * equal the dashboard's earnings figure for any mix of payment types.
   */
  it('agrees with the Finances chart for a mixture of every payment type', () => {
    const deals = [
      deal({ id: 'paid', compensationAmount: 1000 }),
      deal({ id: 'archived', compensationAmount: 800, archived: true }),
      deal({ id: 'accruing', compensationAmount: 300, paid: false, paidDate: undefined, stage: 'live' }),
    ]
    const ledger = [
      entry({ id: 'l-paid', dealId: 'paid', amount: 1000 }),
      entry({ id: 'l-archived', dealId: 'archived', amount: 800 }),
      entry({ id: 'r1', partnershipId: 'p1', amount: 500 }),
      entry({ id: 'm1', amount: 120 }),
      entry({ id: 'e1', type: 'expense', amount: 999 }),
    ]

    const dashboard = total(deals, ledger)
    const thisMonthBar = monthlyRevenue(ledger, deals, identity, 6, now).at(-1)

    expect(dashboard).toBe(1000 + 800 + 300 + 500 + 120)
    expect(thisMonthBar?.total).toBe(dashboard)
  })
})
