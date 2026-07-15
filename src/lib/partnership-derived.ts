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
import type { LedgerEntry, Partnership, PartnershipDeliverableLog } from './types'

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

/** The current tracking period for a retainer's payment cadence — same idea as getCurrentPeriodWindow, but keyed off retainerCadence ('weekly'/'monthly') rather than deliverableCadence, since the two can differ for the same partnership. */
export function getCurrentRetainerPeriodWindow(cadence: Partnership['retainerCadence'], now = new Date()): PeriodWindow {
  if (cadence === 'weekly') return { start: startOfWeek(now), end: endOfWeek(now), label: 'this week' }
  return { start: startOfMonth(now), end: endOfMonth(now), label: 'this month' }
}

/** How many retainer-cycle payments have been manually confirmed (see markPartnershipCyclePaid) for this partnership within the given window. */
export function countPartnershipPaymentsInWindow(
  ledger: Array<LedgerEntry>,
  partnershipId: string,
  window: PeriodWindow,
): number {
  return ledger.filter(
    (entry) => entry.partnershipId === partnershipId && isWithinInterval(new Date(entry.date), window),
  ).length
}

/** The next scheduled retainer payment date, or undefined for per-deliverable partnerships (paid on output, not a schedule) or while paused (no payment is scheduled to resume until unpausedAt is set). */
export function getNextPaymentDate(partnership: Partnership, now = new Date()): Date | undefined {
  if (partnership.paymentType !== 'retainer') return undefined
  if (partnership.status === 'paused') return undefined
  const step = partnership.retainerCadence === 'weekly' ? addWeeks : addMonths
  let next = new Date(partnership.startDate)
  while (next < now) next = step(next, 1)
  return next
}

/**
 * Whether a given calendar day falls inside the partnership's most recent pause window.
 * The live `status` field is authoritative for "currently paused" — a partnership whose
 * status is "paused" is excluded from `pausedAt` onward, or unconditionally if `pausedAt`
 * was never recorded (e.g. one paused before this date tracking existed — better to
 * exclude too much than to keep silently accruing revenue for something the user marked
 * paused). Once resumed, only the specific recorded [pausedAt, unpausedAt) window is
 * excluded, so days before the pause and after the resume both count normally.
 */
export function isPartnershipPausedOn(partnership: Partnership, date: Date): boolean {
  if (partnership.status === 'paused') {
    return !partnership.pausedAt || date >= new Date(partnership.pausedAt)
  }
  if (!partnership.pausedAt || !partnership.unpausedAt) return false
  return date >= new Date(partnership.pausedAt) && date < new Date(partnership.unpausedAt)
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
      // Prorate by the fraction of the month that wasn't paused, so a mid-month pause or
      // unpause only counts the active portion instead of the full flat amount — and a
      // partnership that was never paused still gets 100% (activeDays === daysInMonth),
      // unchanged from before.
      const daysInMonth = differenceInCalendarDays(monthEnd, monthStart) + 1
      let activeDays = 0
      for (let i = 0; i < daysInMonth; i++) {
        if (!isPartnershipPausedOn(partnership, addDays(monthStart, i))) activeDays += 1
      }
      if (activeDays === 0) return 0
      return convert(partnership.retainerAmount * (activeDays / daysInMonth), partnership.currency)
    }
    // Weekly: count how many 7-day occurrences from startDate land inside this month,
    // skipping any occurrence that falls within a paused window.
    let occurrences = 0
    let occurrence = start
    let guard = 0
    while (occurrence <= monthEnd && guard < 520) {
      if (occurrence >= monthStart && (!end || occurrence <= end) && !isPartnershipPausedOn(partnership, occurrence)) {
        occurrences += 1
      }
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
