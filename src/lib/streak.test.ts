import { describe, expect, it } from 'vitest'
import type { StudyLog } from '../db/types.ts'
import { computeStreak, isStudyDay, recentDays } from './streak.ts'

const log = (date: string, newLearned = 0, reviewed = 0): StudyLog => ({
  date,
  newLearned,
  reviewed,
  correct: reviewed,
  wrong: 0,
})
const study = (...dates: string[]) => dates.map((d) => log(d, 1))

describe('isStudyDay', () => {
  it('counts a lesson or a review answer, not an empty log', () => {
    expect(isStudyDay({ newLearned: 5, reviewed: 0 })).toBe(true)
    expect(isStudyDay({ newLearned: 0, reviewed: 1 })).toBe(true)
    expect(isStudyDay({ newLearned: 0, reviewed: 0 })).toBe(false)
  })

  it('counts a day with only exercise answers', () => {
    expect(isStudyDay({ newLearned: 0, reviewed: 0, exercises: 3 })).toBe(true)
    expect(isStudyDay({ newLearned: 0, reviewed: 0, exercises: 0 })).toBe(false)
    expect(isStudyDay({ newLearned: 0, reviewed: 0 })).toBe(false)
  })
})

describe('computeStreak', () => {
  it('is zero without logs', () => {
    expect(computeStreak([], '2026-10-24')).toEqual({ current: 0, longest: 0, todayDone: false })
  })

  it('counts consecutive days ending today', () => {
    const logs = study('2026-10-22', '2026-10-23', '2026-10-24')
    expect(computeStreak(logs, '2026-10-24')).toEqual({ current: 3, longest: 3, todayDone: true })
  })

  it('keeps the streak alive through yesterday when today is not studied yet', () => {
    const logs = study('2026-10-22', '2026-10-23')
    expect(computeStreak(logs, '2026-10-24')).toEqual({ current: 2, longest: 2, todayDone: false })
  })

  it('breaks when the last study day is two or more days ago, keeping the longest', () => {
    const logs = study('2026-10-18', '2026-10-19', '2026-10-20', '2026-10-22')
    expect(computeStreak(logs, '2026-10-24')).toEqual({ current: 0, longest: 3, todayDone: false })
  })

  it('stops at a gap and tracks the longest run separately', () => {
    const logs = study('2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-23', '2026-10-24')
    expect(computeStreak(logs, '2026-10-24')).toEqual({ current: 2, longest: 4, todayDone: true })
  })

  it('ignores logs with no activity', () => {
    const logs = [log('2026-10-22', 1), log('2026-10-23'), log('2026-10-24', 0, 3)]
    expect(computeStreak(logs, '2026-10-24')).toEqual({ current: 1, longest: 1, todayDone: true })
  })

  it('counts a review-only day', () => {
    const logs = [log('2026-10-23', 0, 4), log('2026-10-24', 0, 2)]
    expect(computeStreak(logs, '2026-10-24').current).toBe(2)
  })

  it('works across a month boundary', () => {
    const logs = study('2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02')
    expect(computeStreak(logs, '2026-11-02')).toMatchObject({ current: 4, longest: 4 })
  })

  it('works across a year boundary and a leap day', () => {
    const logs = study('2025-12-30', '2025-12-31', '2026-01-01')
    expect(computeStreak(logs, '2026-01-01')).toMatchObject({ current: 3, longest: 3 })
    const leap = study('2028-02-28', '2028-02-29', '2028-03-01')
    expect(computeStreak(leap, '2028-03-02')).toMatchObject({ current: 3, longest: 3, todayDone: false })
  })

  it('does not depend on log order and ignores future logs', () => {
    const logs = study('2026-10-24', '2026-10-22', '2026-10-23', '2026-10-30')
    expect(computeStreak(logs, '2026-10-24')).toEqual({ current: 3, longest: 3, todayDone: true })
  })

  it('tolerates duplicate dates', () => {
    const logs = [log('2026-10-24', 1), log('2026-10-24', 0, 2)]
    expect(computeStreak(logs, '2026-10-24').current).toBe(1)
  })
})

describe('recentDays', () => {
  it('lists the last 7 days oldest first, marking study days', () => {
    const days = recentDays(study('2026-10-18', '2026-10-24'), '2026-10-24')
    expect(days.map((d) => d.date)).toEqual([
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
    ])
    expect(days.map((d) => d.studied)).toEqual([true, false, false, false, false, false, true])
  })

  it('crosses a month boundary', () => {
    const days = recentDays([], '2026-11-02', 4)
    expect(days.map((d) => d.date)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'])
  })
})
