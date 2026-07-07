import { differenceInCalendarDays, isSameMonth, isWithinInterval } from 'date-fns'
import type { Brand, BrandDeal, LedgerEntry } from './types'

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
    .filter((d) => d.stage !== 'completed')
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

export interface DashboardMetrics {
  earningsThisMonth: number
  activeDeals: number
  dueThisWeek: number
  needsFollowUp: number
}

export function computeMetrics(
  deals: Array<BrandDeal>,
  ledger: Array<LedgerEntry>,
  now = new Date(),
): DashboardMetrics {
  const earningsThisMonth = ledger
    .filter((entry) => entry.type === 'income' && isSameMonth(new Date(entry.date), now))
    .reduce((sum, entry) => sum + entry.amount, 0)

  const activeDeals = deals.filter((d) => d.stage === 'confirmed' || d.stage === 'live').length

  const weekFromNow = new Date(now)
  weekFromNow.setDate(weekFromNow.getDate() + 7)

  const dueThisWeek = deals.filter((deal) => {
    const next = nextDeliverable(deal)
    if (!next) return false
    const due = new Date(next.dueDate)
    return isWithinInterval(due, { start: now, end: weekFromNow })
  }).length

  const needsFollowUp = deals.filter(
    (d) => d.stage === 'negotiating' && differenceInCalendarDays(now, new Date(d.stageUpdatedAt)) > 7,
  ).length

  return { earningsThisMonth, activeDeals, dueThisWeek, needsFollowUp }
}

export function monthlyRevenue(ledger: Array<LedgerEntry>, months = 6, now = new Date()) {
  const buckets: Array<{ label: string; total: number; key: string }> = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), total: 0, key: `${d.getFullYear()}-${d.getMonth()}` })
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]))
  ledger
    .filter((e) => e.type === 'income')
    .forEach((entry) => {
      const d = new Date(entry.date)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const bucket = byKey.get(key)
      if (bucket) bucket.total += entry.amount
    })
  return buckets
}
