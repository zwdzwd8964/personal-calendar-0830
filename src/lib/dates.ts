import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns'
import type { ISODate } from '@/types'

const ISO_FORMAT = 'yyyy-MM-dd'

/** Format a Date as 'YYYY-MM-DD' in local time. Defaults to now. */
export function todayISO(now: Date = new Date()): ISODate {
  return format(now, ISO_FORMAT)
}

/** Add (or subtract, with negative days) calendar days to an ISO date. */
export function addDaysISO(date: ISODate, days: number): ISODate {
  return format(addDays(parseISO(date), days), ISO_FORMAT)
}

/** The 7 ISO dates of the Monday-started week containing `date` (Monday first, Sunday last). */
export function weekOf(date: ISODate): ISODate[] {
  const monday = startOfWeek(parseISO(date), { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), ISO_FORMAT))
}

/** Integer calendar-day difference (deadline − today). 0 = due today, negative = overdue. */
export function daysUntil(deadline: ISODate, today: ISODate): number {
  return differenceInCalendarDays(parseISO(deadline), parseISO(today))
}

/**
 * Latest day work can start and still finish by deadline:
 * deadline − ceil(estimateDays) + 1 (starting that day counts as a full day).
 * estimateDays undefined → null.
 */
export function latestStartDate(deadline: ISODate, estimateDays?: number): ISODate | null {
  if (estimateDays === undefined) return null
  return addDaysISO(deadline, -Math.ceil(estimateDays) + 1)
}
