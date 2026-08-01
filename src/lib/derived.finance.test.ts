import { describe, expect, it } from 'vitest'
import { dateOnlyToISOString } from './date-only'
import { computeFinanceInsights, computeMetrics, monthlyRetainerValue, monthlyRevenue } from './derived'
import type { Brand, BrandDeal, LedgerEntry, Partnership } from './types'

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

const brand = (id: string, name: string) => ({ id, name }) as Brand

function partnership(over: Partial<Partnership> = {}): Partnership {
  return {
    id: 'p1',
    brandId: 'b1',
    startDate: '2026-01-01T00:00:00Z',
    paymentType: 'retainer',
    retainerAmount: 500,
    retainerCadence: 'monthly',
    currency: 'USD',
    deliverableCount: 4,
    deliverableUnit: 'videos',
    deliverableCadence: 'month',
    contentFormats: [],
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    ...over,
  } as Partnership
}

const insights = (
  deals: Array<BrandDeal>,
  ledger: Array<LedgerEntry>,
  brands: Array<Brand> = [],
  partnerships: Array<Partnership> = [],
) => computeFinanceInsights(deals, ledger, brands, partnerships, identity, now)

describe('finance insights', () => {
  /** The whole point of moving off "this month": July money must survive the roll into August. */
  it('includes earlier months of the same year, unlike the monthly metric', () => {
    const july = entry({ id: 'r-july', partnershipId: 'p1', amount: 900, date: '2026-07-15T12:00:00Z' })
    const august = entry({ id: 'r-aug', partnershipId: 'p1', amount: 100 })

    expect(total([], [july, august])).toBe(100) // monthly metric: August only
    expect(insights([], [july, august]).earningsThisYear).toBe(1000)
  })

  it('excludes last year', () => {
    const lastYear = entry({ id: 'old', partnershipId: 'p1', amount: 5000, date: '2025-11-01T12:00:00Z' })
    expect(insights([], [lastYear]).earningsThisYear).toBe(0)
  })

  it('reports the current year dynamically', () => {
    expect(insights([], []).year).toBe(2026)
  })

  it('does not double-count a paid deal in the yearly total', () => {
    const d = deal()
    expect(insights([d], [entry({ dealId: d.id })]).earningsThisYear).toBe(1000)
  })

  it('names the largest deal and its brand', () => {
    const deals = [
      deal({ id: 'a', brandId: 'b1', compensationAmount: 1200 }),
      deal({ id: 'b', brandId: 'b2', compensationAmount: 4800 }),
    ]
    const result = insights(deals, [], [brand('b1', 'Glossier'), brand('b2', 'Rhode')])
    expect(result.largestDeal).toEqual({ amount: 4800, brandName: 'Rhode' })
  })

  it('leaves gifted and still-negotiating deals out of the deal statistics', () => {
    const deals = [
      deal({ id: 'cash', compensationAmount: 1000 }),
      deal({ id: 'gifted', compensationAmount: 0, compensationType: 'gifted' }),
      deal({ id: 'pitching', compensationAmount: 9999, stage: 'negotiating', paid: false, paidDate: undefined }),
    ]
    const result = insights(deals, [])
    expect(result.dealCount).toBe(1)
    expect(result.largestDeal?.amount).toBe(1000)
    expect(result.averageDealSize).toBe(1000)
  })

  it('averages only the cash deals', () => {
    const deals = [deal({ id: 'a', compensationAmount: 1000 }), deal({ id: 'b', compensationAmount: 500 })]
    expect(insights(deals, []).averageDealSize).toBe(750)
  })

  it('normalises retainer cadences to a monthly figure before comparing', () => {
    // 200/week is worth more per month than 700/month, despite the smaller headline number.
    const weekly = partnership({ id: 'p-week', brandId: 'b1', retainerAmount: 200, retainerCadence: 'weekly' })
    const monthly = partnership({ id: 'p-month', brandId: 'b2', retainerAmount: 700, retainerCadence: 'monthly' })
    const result = insights([], [], [brand('b1', 'Aesop'), brand('b2', 'Rhode')], [monthly, weekly])

    expect(result.topRetainer?.brandName).toBe('Aesop')
    expect(Math.round(result.topRetainer?.monthlyAmount ?? 0)).toBe(867)
    expect(monthlyRetainerValue(monthly)).toBe(700)
  })

  it('ignores ended partnerships but keeps paused ones', () => {
    const ended = partnership({ id: 'p-ended', brandId: 'b1', retainerAmount: 5000, status: 'ended' })
    const paused = partnership({ id: 'p-paused', brandId: 'b2', retainerAmount: 400, status: 'paused' })
    const result = insights([], [], [brand('b1', 'Old'), brand('b2', 'Current')], [ended, paused])
    expect(result.topRetainer?.brandName).toBe('Current')
  })

  it('ignores per-deliverable partnerships in the retainer stat', () => {
    const perDeliverable = partnership({ paymentType: 'per_deliverable', retainerAmount: undefined })
    expect(insights([], [], [], [perDeliverable]).topRetainer).toBeUndefined()
  })

  it('returns undefined rather than zero when there is nothing to average', () => {
    const result = insights([], [])
    expect(result.averageDealSize).toBeUndefined()
    expect(result.largestDeal).toBeUndefined()
  })
})
