import { describe, expect, it } from 'vitest'
import { toLocalDateString } from './date.ts'

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
