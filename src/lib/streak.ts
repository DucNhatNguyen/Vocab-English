import type { StudyLog } from '../db/types.ts'
import { addDays } from './date.ts'

/** A day counts for the streak when at least one lesson was finished or one review answered. */
export function isStudyDay(log: Pick<StudyLog, 'newLearned' | 'reviewed'>): boolean {
  return log.newLearned > 0 || log.reviewed > 0
}

export interface StreakInfo {
  /**
   * Consecutive study days ending today. When today has no study yet but yesterday does, the
   * streak is still alive and counts up to yesterday (the UI says "Học hôm nay để giữ chuỗi").
   */
  current: number
  /** Longest run of consecutive study days ever. */
  longest: number
  /** Whether today already counts. */
  todayDone: boolean
}

/** The set of local dates (<= `today`) with study activity. Logs dated in the future are ignored. */
export function studyDays(logs: Iterable<StudyLog>, today: string): Set<string> {
  const days = new Set<string>()
  for (const log of logs) if (log.date <= today && isStudyDay(log)) days.add(log.date)
  return days
}

/** Current and longest streak, from the StudyLogs and the local date `today`. */
export function computeStreak(logs: Iterable<StudyLog>, today: string): StreakInfo {
  const days = studyDays(logs, today)
  const todayDone = days.has(today)

  // Current: walk back from today, or from yesterday while today is still open
  let current = 0
  let cursor = todayDone ? today : addDays(today, -1)
  while (days.has(cursor)) {
    current += 1
    cursor = addDays(cursor, -1)
  }

  // Longest: a run starts at a day whose previous day is not a study day
  let longest = 0
  for (const day of days) {
    if (days.has(addDays(day, -1))) continue
    let length = 1
    for (let next = addDays(day, 1); days.has(next); next = addDays(next, 1)) length += 1
    longest = Math.max(longest, length)
  }

  return { current, longest, todayDone }
}

export interface RecentDay {
  date: string
  studied: boolean
}

/** The last `count` days ending today, oldest first, each marked studied or not. */
export function recentDays(logs: Iterable<StudyLog>, today: string, count = 7): RecentDay[] {
  const days = studyDays(logs, today)
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(today, i - (count - 1))
    return { date, studied: days.has(date) }
  })
}
