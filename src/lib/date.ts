/** Local calendar date as "YYYY-MM-DD". Uses local time on purpose (never toISOString, which is UTC). */
export function toLocalDateString(date: Date = new Date()): string {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Local midnight of a "YYYY-MM-DD" date. Throws RangeError on malformed or impossible dates. */
export function parseLocalDate(s: string): Date {
  const match = DATE_RE.exec(s)
  if (!match) throw new RangeError(`Invalid local date: "${s}"`)
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  // setFullYear avoids the Date constructor mapping years 0-99 to 1900-1999
  const date = new Date(2000, 0, 1)
  date.setFullYear(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    throw new RangeError(`Invalid local date: "${s}"`)
  }
  return date
}

/** Local date `days` after `date` (negative or 0 allowed), as "YYYY-MM-DD". */
export function addDays(date: string, days: number): string {
  const base = parseLocalDate(date)
  return toLocalDateString(new Date(base.getFullYear(), base.getMonth(), base.getDate() + days))
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  // Local midnights can differ by 23h/25h across DST, so round to whole days
  return Math.round((parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) / MS_PER_DAY)
}

/** Today's local date as "YYYY-MM-DD". */
export function today(): string {
  return toLocalDateString(new Date())
}

/** Tomorrow's local date as "YYYY-MM-DD". */
export function tomorrow(): string {
  return addDays(today(), 1)
}
