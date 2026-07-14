import { differenceInCalendarDays, isSameMonth, isWithinInterval } from 'date-fns'
import { partnershipEarningsInMonth } from './partnership-derived'
import type { Brand, BrandDeal, LedgerEntry, Partnership, PartnershipDeliverableLog } from './types'

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
  if (deal.archived) return false
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
 * Whether a deal looks possibly ghosted: no stage change (the only "last
 * update" signal the data model tracks) in 7+ days, and it's still in an
 * active, non-terminal stage.
 */
export function isDealGhosted(deal: BrandDeal, now = new Date()): boolean {
  if (deal.archived || deal.stage === 'completed') return false
  return differenceInCalendarDays(now, new Date(deal.stageUpdatedAt)) >= 7
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

function dealEarningsInMonth(deals: Array<BrandDeal>, convert: ConvertFn, now: Date): number {
  return deals.reduce((sum, deal) => {
    const earnedDate = dealEarnedDate(deal)
    if (!earnedDate || !isSameMonth(earnedDate, now)) return sum
    return sum + convert(deal.compensationAmount, deal.compensationCurrency)
  }, 0)
}

export interface DashboardMetrics {
  earningsThisMonth: number
  activeDeals: number
  dueThisWeek: number
  /** Stale negotiations (7+ days quiet) plus unpaid deals — see unpaidCount for the unpaid-only subset. */
  needsFollowUp: number
  unpaidCount: number
}

export function computeMetrics(
  deals: Array<BrandDeal>,
  ledger: Array<LedgerEntry>,
  convert: ConvertFn,
  now = new Date(),
  partnerships: Array<Partnership> = [],
  partnershipLogs: Array<PartnershipDeliverableLog> = [],
): DashboardMetrics {
  const ledgerEarningsThisMonth = ledger
    .filter((entry) => entry.type === 'income' && isSameMonth(new Date(entry.date), now))
    .reduce((sum, entry) => sum + convert(entry.amount, entry.currency), 0)
  const partnershipEarningsThisMonth = partnerships.reduce(
    (sum, p) => sum + partnershipEarningsInMonth(p, partnershipLogs, now, convert),
    0,
  )
  const earningsThisMonth =
    ledgerEarningsThisMonth + dealEarningsInMonth(deals, convert, now) + partnershipEarningsThisMonth

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

export function monthlyRevenue(
  ledger: Array<LedgerEntry>,
  deals: Array<BrandDeal>,
  convert: ConvertFn,
  months = 6,
  now = new Date(),
  partnerships: Array<Partnership> = [],
  partnershipLogs: Array<PartnershipDeliverableLog> = [],
) {
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

  ledger
    .filter((e) => e.type === 'income')
    .forEach((entry) => addToBucket(new Date(entry.date), convert(entry.amount, entry.currency)))
  deals.forEach((deal) => {
    const earnedDate = dealEarnedDate(deal)
    if (earnedDate) addToBucket(earnedDate, convert(deal.compensationAmount, deal.compensationCurrency))
  })
  buckets.forEach((bucket) => {
    partnerships.forEach((p) => {
      bucket.total += partnershipEarningsInMonth(p, partnershipLogs, bucket.date, convert)
    })
  })

  return buckets.map(({ label, total, key }) => ({ label, total, key }))
}
