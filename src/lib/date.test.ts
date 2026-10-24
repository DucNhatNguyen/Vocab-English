import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addDays,
  daysBetween,
  parseLocalDate,
  today,
  toLocalDateString,
  tomorrow,
} from './date.ts'

describe('toLocalDateString', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(toLocalDateString(new Date(2026, 9, 24, 1, 30))).toBe('2026-10-24')
  })

  it('zero-pads month and day', () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05')
  })

  it('keeps the local day just before and just after midnight', () => {
    expect(toLocalDateString(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31')
    expect(toLocalDateString(new Date(2027, 0, 1, 0, 0, 1))).toBe('2027-01-01')
  })

  it('defaults to today', () => {
    expect(toLocalDateString()).toBe(toLocalDateString(new Date()))
  })
})

describe('parseLocalDate', () => {
  it('returns local midnight of the day', () => {
    const d = parseLocalDate('2026-10-24')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 24])
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([0, 0, 0])
  })

  it('accepts a leap day only in leap years', () => {
    expect(toLocalDateString(parseLocalDate('2028-02-29'))).toBe('2028-02-29')
    expect(() => parseLocalDate('2026-02-29')).toThrow(RangeError)
  })

  it.each([
    '2026-02-30',
    '2026-13-01',
    '2026-00-10',
    '2026-04-31',
    '2026-1-5',
    '2026-01-05T00:00',
    '',
    'abc',
    ' 2026-01-05',
  ])('throws RangeError for %j', (input) => {
    expect(() => parseLocalDate(input)).toThrow(RangeError)
  })
})

describe('addDays', () => {
  it('adds within a month and with 0 days', () => {
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25')
    expect(addDays('2026-10-24', 0)).toBe('2026-10-24')
  })

  it('crosses month ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-04-30', 1)).toBe('2026-05-01')
  })

  it('crosses year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
  })

  it('handles leap years', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('handles negative days', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-10-24', -30)).toBe('2026-09-24')
  })

  it('handles the SRS intervals up to 30 days', () => {
    expect(addDays('2026-10-24', 30)).toBe('2026-11-23')
    expect(addDays('2026-12-15', 30)).toBe('2027-01-14')
  })

  it('has no off-by-one across US DST switches', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08')
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
    expect(addDays('2026-03-09', -1)).toBe('2026-03-08')
    expect(addDays('2026-03-01', 14)).toBe('2026-03-15')
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
    expect(addDays('2026-11-02', -1)).toBe('2026-11-01')
    expect(addDays('2026-10-25', 14)).toBe('2026-11-08')
  })

  it('throws on invalid input', () => {
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError)
  })
})

describe('daysBetween', () => {
  it('is 0 for the same day and signed otherwise', () => {
    expect(daysBetween('2026-10-24', '2026-10-24')).toBe(0)
    expect(daysBetween('2026-10-24', '2026-10-25')).toBe(1)
    expect(daysBetween('2026-10-25', '2026-10-24')).toBe(-1)
  })

  it('counts across month and year boundaries', () => {
    expect(daysBetween('2026-01-31', '2026-03-01')).toBe(29)
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365)
    expect(daysBetween('2028-01-01', '2029-01-01')).toBe(366)
  })

  it('counts whole days across DST switches', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2)
    expect(daysBetween('2026-03-01', '2026-11-30')).toBe(274)
  })

  it('is the inverse of addDays', () => {
    for (const n of [-400, -31, -1, 0, 1, 30, 366]) {
      expect(daysBetween('2026-10-24', addDays('2026-10-24', n))).toBe(n)
    }
  })

  it('throws on invalid input', () => {
    expect(() => daysBetween('2026-1-5', '2026-01-06')).toThrow(RangeError)
    expect(() => daysBetween('2026-01-05', 'nope')).toThrow(RangeError)
  })
})

describe('today / tomorrow', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('use the local calendar date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59))
    expect(today()).toBe('2026-12-31')
    expect(tomorrow()).toBe('2027-01-01')
  })

  it('match toLocalDateString of now', () => {
    expect(today()).toBe(toLocalDateString(new Date()))
  })
})
