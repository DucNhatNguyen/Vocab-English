import type { CardProgress, StudyLog } from '../db/types.ts'
import { isCustomWordId } from '../db/words.ts'
import { MAX_LEVEL } from './srs.ts'
import { computeStreak, recentDays, type RecentDay, type StreakInfo } from './streak.ts'

export type LevelCounts = [number, number, number, number, number]

export interface Stats {
  /** Learned cards per memory level 1-5 (index 0 = level 1); ignored cards count too. */
  levels: LevelCounts
  /** Learned cards (level >= 1), ignored included. */
  learned: number
  /** Learned cards that are unticked in the notebook (a subset of `learned`). */
  ignored: number
  /** Cards at the top level (5). */
  mastered: number
  /** Σcorrect / Σ(correct + wrong) over all StudyLogs, 0..1; null before the first answer. */
  accuracy: number | null
  correctTotal: number
  wrongTotal: number
  streak: StreakInfo
  /** Last 7 days, oldest first. */
  recent: RecentDay[]
  today: {
    newLearned: number
    reviewed: number
    /** The daily goal of new words. */
    goal: number
  }
}

/** Everything the Stats page and the Home summary show, from progress rows and StudyLogs. */
export function computeStats(
  progress: Iterable<CardProgress>,
  logs: readonly StudyLog[],
  today: string,
  dailyGoal: number,
): Stats {
  const levels: LevelCounts = [0, 0, 0, 0, 0]
  let learned = 0
  let ignored = 0
  for (const p of progress) {
    if (p.level < 1) continue
    learned += 1
    if (p.ignored) ignored += 1
    levels[p.level - 1] += 1
  }

  let correctTotal = 0
  let wrongTotal = 0
  let newLearnedToday = 0
  let reviewedToday = 0
  for (const log of logs) {
    correctTotal += log.correct
    wrongTotal += log.wrong
    if (log.date === today) {
      newLearnedToday += log.newLearned
      reviewedToday += log.reviewed
    }
  }
  const answers = correctTotal + wrongTotal

  return {
    levels,
    learned,
    ignored,
    mastered: levels[MAX_LEVEL - 1],
    accuracy: answers === 0 ? null : correctTotal / answers,
    correctTotal,
    wrongTotal,
    streak: computeStreak(logs, today),
    recent: recentDays(logs, today, 7),
    today: { newLearned: newLearnedToday, reviewed: reviewedToday, goal: dailyGoal },
  }
}

/** "83%", or "—" when there is no answer yet. */
export function formatAccuracy(accuracy: number | null): string {
  return accuracy === null ? '—' : `${Math.round(accuracy * 100)}%`
}

/** Own words first learned today ("Hôm nay: x/N từ mới"). */
export function countNewToday(cards: Iterable<CardProgress>, today: string): number {
  let count = 0
  for (const card of cards) {
    if (card.level >= 1 && card.learnedAt === today && isCustomWordId(card.wordId)) count += 1
  }
  return count
}
