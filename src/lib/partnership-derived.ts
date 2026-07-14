import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import type { ConvertFn } from './derived'
import type { Partnership, PartnershipDeliverableLog } from './types'

export interface PeriodWindow {
  start: Date
  end: Date
  label: string
}

/** The current tracking period for a partnership's deliverable cadence — used to compute "N of M this period" by filtering the completion log, rather than a fragile mutable counter. */
export function getCurrentPeriodWindow(cadence: Partnership['deliverableCadence'], now = new Date()): PeriodWindow {
  if (cadence === 'day') return { start: startOfDay(now), end: endOfDay(now), label: 'today' }
  if (cadence === 'week') return { start: startOfWeek(now), end: endOfWeek(now), label: 'this week' }
  return { start: startOfMonth(now), end: endOfMonth(now), label: 'this month' }
}

export function countDeliverablesInWindow(
  logs: Array<PartnershipDeliverableLog>,
  partnershipId: string,
  window: PeriodWindow,
): number {
  return logs.filter(
    (log) => log.partnershipId === partnershipId && isWithinInterval(new Date(log.completedAt), window),
  ).length
}

/** Whether a partnership's contract end/renewal date falls within the next `thresholdDays`. Deliberately not wired into the dashboard's due-soon/upcoming-deadlines widgets — surfaced only within the Partnerships tab itself. */
export function isPartnershipRenewalDueSoon(partnership: Partnership, now = new Date(), thresholdDays = 14): boolean {
  if (partnership.status === 'ended' || !partnership.endDate) return false
  const days = differenceInCalendarDays(new Date(partnership.endDate), now)
  return days >= 0 && days <= thresholdDays
}

/** The next scheduled retainer payment date, or undefined for per-deliverable partnerships (paid on output, not a schedule). */
export function getNextPaymentDate(partnership: Partnership, now = new Date()): Date | undefined {
  if (partnership.paymentType !== 'retainer') return undefined
  const step = partnership.retainerCadence === 'weekly' ? addWeeks : addMonths
  let next = new Date(partnership.startDate)
  while (next < now) next = step(next, 1)
  return next
}

/**
 * A partnership's earnings contribution for a given calendar month —
 * schedule-based for retainers (so recurring payments count automatically
 * without re-entry), completion-log-based for per-deliverable. Uses date
 * overlap against start/end dates rather than the live `status` field, so
 * historical months stay accurate even after a partnership is later paused
 * or ended.
 */
export function partnershipEarningsInMonth(
  partnership: Partnership,
  logs: Array<PartnershipDeliverableLog>,
  monthDate: Date,
  convert: ConvertFn,
): number {
  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)
  const start = new Date(partnership.startDate)
  const end = partnership.endDate ? new Date(partnership.endDate) : undefined
  if (start > monthEnd || (end && end < monthStart)) return 0

  if (partnership.paymentType === 'retainer') {
    if (!partnership.retainerAmount) return 0
    if (partnership.retainerCadence === 'monthly') {
      return convert(partnership.retainerAmount, partnership.currency)
    }
    // Weekly: count how many 7-day occurrences from startDate land inside this month.
    let occurrences = 0
    let occurrence = start
    let guard = 0
    while (occurrence <= monthEnd && guard < 520) {
      if (occurrence >= monthStart && (!end || occurrence <= end)) occurrences += 1
      occurrence = addDays(occurrence, 7)
      guard += 1
    }
    return convert(partnership.retainerAmount * occurrences, partnership.currency)
  }

  if (!partnership.perDeliverableRate) return 0
  const completedThisMonth = logs.filter(
    (log) => log.partnershipId === partnership.id && isWithinInterval(new Date(log.completedAt), { start: monthStart, end: monthEnd }),
  ).length
  return convert(partnership.perDeliverableRate * completedThisMonth, partnership.currency)
}
