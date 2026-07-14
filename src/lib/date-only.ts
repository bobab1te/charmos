import { format } from 'date-fns'

/**
 * Converts a date-only "YYYY-MM-DD" string (e.g. from a native `<input type="date">`)
 * into an ISO timestamp for storage. Uses LOCAL midnight, not UTC midnight — a bare
 * "YYYY-MM-DD" passed straight to `new Date(...)` is parsed as UTC per the JS spec,
 * which shifts the displayed calendar day back by a day for anyone west of UTC once
 * that timestamp is read back through timezone-aware display/comparison (`format`,
 * `toLocaleDateString`, `differenceInCalendarDays`, etc.).
 */
export function dateOnlyToISOString(dateOnly: string): string {
  return new Date(`${dateOnly}T00:00:00`).toISOString()
}

/**
 * Converts a stored ISO timestamp (written via `dateOnlyToISOString`) back into its
 * "YYYY-MM-DD" calendar date for populating a date input. Uses local timezone via
 * date-fns `format`, not a naive string slice — slicing an ISO string reads the UTC
 * date, which only matches the local date for timezones at or behind UTC.
 */
export function isoStringToDateOnly(iso: string): string {
  return format(new Date(iso), 'yyyy-MM-dd')
}

/** Today's date as "YYYY-MM-DD" in the local timezone (not UTC — see dateOnlyToISOString). */
export function todayDateOnly(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
