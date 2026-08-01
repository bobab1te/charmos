import { differenceInCalendarDays, isSameMonth, isWithinInterval } from 'date-fns'
import type { Brand, BrandDeal, LedgerEntry } from './types'

/** Converts an amount from its own currency into the creator's display currency — see CurrencyProvider. */
export type ConvertFn = (amount: number, fromCurrency: string) => number

export function nextDeliverable(deal: BrandDeal) {
  const pending = deal.deliverables
    .filter((d) => !d.done)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  return pending[0]
}

export type Urgency = 'red' | 'orange' | 'green'

export function urgencyForDate(dueDate: string, now = new Date()): Urgency {
  const days = differenceInCalendarDays(new Date(dueDate), now)
  if (days < 3) return 'red'
  if (days < 7) return 'orange'
  return 'green'
}

/**
 * Whether to show the "Unpaid" alert on a deal's kanban card: only for cash
 * ("paid") deals not yet marked paid in full, once the content is live or
 * the deal is completed — AND, if an expected payout date was set, only once
 * that date has actually arrived or passed. Without an expected date, falls
 * back to alerting as soon as the deal is live/completed, so the reminder
 * isn't silently lost for deals with no date entered.
 */
export function isDealUnpaidAlert(deal: BrandDeal, now = new Date()): boolean {
  if (deal.archived || deal.compensationAmount === 0) return false
  if (deal.compensationType !== 'paid' || deal.paid) return false
  if (deal.stage !== 'live' && deal.stage !== 'completed') return false
  if (deal.expectedPayoutDate) return new Date(deal.expectedPayoutDate) <= now
  return true
}

/** Whether a deal has a deliverable due within the next 3 days (including overdue) and isn't done or archived. */
export function isDealDueSoon(deal: BrandDeal, now = new Date()): boolean {
  if (deal.archived || deal.stage === 'completed') return false
  const next = nextDeliverable(deal)
  if (!next) return false
  return differenceInCalendarDays(new Date(next.dueDate), now) <= 3
}

/**
 * Whether a deal looks possibly ghosted: only ever applies while the deal is
 * in the "negotiating" stage (a brand gone quiet in any other stage isn't
 * "ghosting" — there's no reply pending), and only once 8+ days have passed
 * since the last stage change, the only "last update"/brand-response signal
 * the data model tracks. Moving out of "negotiating" clears the flag
 * automatically since this is computed fresh from current stage, not a
 * separate persisted flag.
 */
export function isDealGhosted(deal: BrandDeal, now = new Date()): boolean {
  if (deal.archived || deal.stage !== 'negotiating') return false
  return differenceInCalendarDays(now, new Date(deal.stageUpdatedAt)) >= 8
}

/** Whether a completed deal has been sitting for 30+ days and is worth prompting the user to archive. */
export function isDealStaleCompleted(deal: BrandDeal, now = new Date()): boolean {
  if (deal.archived || deal.stage !== 'completed') return false
  return differenceInCalendarDays(now, new Date(deal.stageUpdatedAt)) >= 30
}

export interface UpcomingDeadline {
  dealId: string
  brandName: string
  deliverableType: string
  dueDate: string
  urgency: Urgency
}

export function getUpcomingDeadlines(
  deals: Array<BrandDeal>,
  brands: Array<Brand>,
  limit = 5,
  now = new Date(),
): Array<UpcomingDeadline> {
  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? 'Unknown brand'

  return deals
    .filter((d) => !d.archived && d.stage !== 'completed')
    .map((d) => ({ deal: d, next: nextDeliverable(d) }))
    .filter((x): x is { deal: BrandDeal; next: NonNullable<ReturnType<typeof nextDeliverable>> } => Boolean(x.next))
    .sort((a, b) => new Date(a.next.dueDate).getTime() - new Date(b.next.dueDate).getTime())
    .slice(0, limit)
    .map(({ deal, next }) => ({
      dealId: deal.id,
      brandName: brandName(deal.brandId),
      deliverableType: next.type,
      dueDate: next.dueDate,
      urgency: urgencyForDate(next.dueDate, now),
    }))
}

/**
 * The date a deal's compensation counts toward, accrual-style: once a deal is
 * no longer just being negotiated, its value counts toward whichever month it
 * most recently entered its current stage — even before it's actually been
 * paid out. `paidDate` wins when a deal is explicitly marked paid, so any
 * future "mark as paid" UI plugs into this automatically. Still-negotiating
 * deals (nothing committed yet) and deals with no compensation amount are
 * excluded entirely.
 */
export function dealEarnedDate(deal: BrandDeal): Date | undefined {
  if (deal.archived || !deal.compensationAmount) return undefined
  if (deal.paid && deal.paidDate) return new Date(deal.paidDate)
  if (deal.stage === 'negotiating') return undefined
  return new Date(deal.stageUpdatedAt)
}

/** One piece of revenue, already converted to the display currency. */
export interface RevenueEvent {
  date: Date
  amount: number
}

/**
 * THE single source of truth for "money earned". Every revenue total in the app — the dashboard's
 * earnings metric, the Finances chart — is a filter over this list, so they cannot disagree and a
 * new revenue source only has to be added in one place.
 *
 * Revenue reaches the app by two routes and each payment must be counted through exactly one:
 *
 *   accrual   a deal's own compensationAmount, dated by dealEarnedDate
 *   ledger    a row in the ledger — retainer cycles (markPartnershipCyclePaid), the row
 *             syncDealLedgerEntry writes when a deal is marked paid, manual entries
 *
 * A deal marked paid has BOTH, so one has to be dropped. The rule is derived from whether the deal
 * actually accrues rather than merely from whether the entry has a dealId: an entry is skipped only
 * when the deal it points at is genuinely contributing its own accrual. That is what makes the two
 * routes exhaustive — any deal that drops out of the accrual for any reason, now or later, hands
 * responsibility for its money to its ledger row instead of silently taking it with it.
 */
export function revenueEvents(
  deals: Array<BrandDeal>,
  ledger: Array<LedgerEntry>,
  convert: ConvertFn,
): Array<RevenueEvent> {
  const events: Array<RevenueEvent> = []

  const accruingDealIds = new Set<string>()
  for (const deal of deals) {
    const earnedDate = dealEarnedDate(deal)
    if (!earnedDate) continue
    accruingDealIds.add(deal.id)
    events.push({ date: earnedDate, amount: convert(deal.compensationAmount, deal.compensationCurrency) })
  }

  for (const entry of ledger) {
    if (entry.type !== 'income') continue
    // Skipped only because the deal is accruing this same money itself. A deal-linked entry whose
    // deal is archived, missing, or otherwise not accruing is real received income and counts.
    if (entry.dealId && accruingDealIds.has(entry.dealId)) continue
    events.push({ date: new Date(entry.date), amount: convert(entry.amount, entry.currency) })
  }

  return events
}

export interface DashboardMetrics {
  earningsThisMonth: number
  activeDeals: number
  dueThisWeek: number
  /** Stale negotiations (8+ days quiet) plus unpaid deals — see unpaidCount for the unpaid-only subset. */
  needsFollowUp: number
  unpaidCount: number
}

export function computeMetrics(
  deals: Array<BrandDeal>,
  ledger: Array<LedgerEntry>,
  convert: ConvertFn,
  now = new Date(),
): DashboardMetrics {
  const earningsThisMonth = revenueEvents(deals, ledger, convert)
    .filter((event) => isSameMonth(event.date, now))
    .reduce((sum, event) => sum + event.amount, 0)

  const activeDeals = deals.filter((d) => !d.archived && (d.stage === 'confirmed' || d.stage === 'live')).length

  const weekFromNow = new Date(now)
  weekFromNow.setDate(weekFromNow.getDate() + 7)

  const dueThisWeek = deals.filter((deal) => {
    if (deal.archived) return false
    const next = nextDeliverable(deal)
    if (!next) return false
    const due = new Date(next.dueDate)
    return isWithinInterval(due, { start: now, end: weekFromNow })
  }).length

  const ghostedCount = deals.filter((d) => isDealGhosted(d, now)).length
  const unpaidCount = deals.filter((d) => isDealUnpaidAlert(d, now)).length
  const needsFollowUp = ghostedCount + unpaidCount

  return { earningsThisMonth, activeDeals, dueThisWeek, needsFollowUp, unpaidCount }
}

export function monthlyRevenue(ledger: Array<LedgerEntry>, deals: Array<BrandDeal>, convert: ConvertFn, months = 6, now = new Date()) {
  const buckets: Array<{ label: string; total: number; key: string; date: Date }> = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      total: 0,
      key: `${d.getFullYear()}-${d.getMonth()}`,
      date: d,
    })
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]))
  const addToBucket = (date: Date, amount: number) => {
    const bucket = byKey.get(`${date.getFullYear()}-${date.getMonth()}`)
    if (bucket) bucket.total += amount
  }

  // Same event list the dashboard metric sums, just bucketed by month instead of filtered to one —
  // which is what keeps the chart and the dashboard total consistent by construction.
  revenueEvents(deals, ledger, convert).forEach((event) => addToBucket(event.date, event.amount))

  return buckets.map(({ label, total, key }) => ({ label, total, key }))
}
