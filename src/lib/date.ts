/** Local calendar date as "YYYY-MM-DD". Uses local time on purpose (never toISOString, which is UTC). */
export function toLocalDateString(date: Date = new Date()): string {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
