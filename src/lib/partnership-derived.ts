import {
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
import type { Partnership, PartnershipDeliverableLog, RetainerCadence } from './types'

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

/** Steps a date forward by one retainer cadence unit — the one place cadence-specific logic lives, so cycle-window computation stays generic instead of branching per cadence value. */
function stepRetainerCadence(cadence: RetainerCadence, date: Date): Date {
  if (cadence === 'weekly') return addWeeks(date, 1)
  if (cadence === 'biweekly') return addWeeks(date, 2)
  return addMonths(date, 1)
}

export interface RetainerCycleWindow {
  start: Date
  /** Exclusive — a cycle covers [start, end). */
  end: Date
}

/**
 * The [start, end) window of the retainer cycle containing `now`, walking forward from
 * the partnership's startDate in cadence-sized steps. Generic across weekly/biweekly/
 * monthly (or any cadence added to stepRetainerCadence) rather than one branch per value.
 * Returns undefined for non-retainer partnerships or if the partnership hasn't started yet.
 */
export function computeCurrentRetainerCycleWindow(
  partnership: Partnership,
  now = new Date(),
): RetainerCycleWindow | undefined {
  if (partnership.paymentType !== 'retainer' || !partnership.retainerCadence) return undefined
  const start = new Date(partnership.startDate)
  if (start > now) return undefined

  let cycleStart = start
  let guard = 0
  while (guard < 1000) {
    const cycleEnd = stepRetainerCadence(partnership.retainerCadence, cycleStart)
    if (now < cycleEnd) return { start: cycleStart, end: cycleEnd }
    cycleStart = cycleEnd
    guard += 1
  }
  return undefined
}

/** Whether a persisted cycle's stored period exactly matches a computed window — the basis for "is there already a cycle for this period" checks. */
export function cycleMatchesWindow(
  cycle: { periodStart: string; periodEnd: string },
  window: RetainerCycleWindow,
): boolean {
  return new Date(cycle.periodStart).getTime() === window.start.getTime() && new Date(cycle.periodEnd).getTime() === window.end.getTime()
}

/** The next scheduled retainer payment date, or undefined for per-deliverable partnerships (paid on output, not a schedule) or while paused (no payment is scheduled to resume until unpausedAt is set). Informational display only — see PartnershipPaymentCycle for what actually counts toward revenue. */
export function getNextPaymentDate(partnership: Partnership, now = new Date()): Date | undefined {
  if (partnership.paymentType !== 'retainer') return undefined
  if (partnership.status === 'paused') return undefined
  return computeCurrentRetainerCycleWindow(partnership, now)?.end
}
