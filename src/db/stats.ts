import { today as localToday } from '../lib/date.ts'
import { getReviewOverview, type ReviewOverview } from '../lib/review.ts'
import { computeStats, countNewToday, type Stats } from '../lib/stats.ts'
import { db } from './db.ts'
import { loadLessonWords } from './lesson.ts'
import { loadReviewData } from './review.ts'
import { getSettings } from './settings.ts'

export interface StatsData {
  /** Local date the data was read on. */
  today: string
  stats: Stats
}

/**
 * Statistics over all progress and StudyLogs. Cards whose word no longer exists are left out
 * (like in the notebook). Reads `progress`, `customWords`, `studyLogs` and `settings`, so it
 * works as a `useLiveQuery` source.
 */
export async function loadStats(today: string = localToday()): Promise<StatsData> {
  const [review, logs, settings] = await Promise.all([
    loadReviewData(today),
    db.studyLogs.toArray(),
    getSettings(),
  ])
  return { today, stats: computeStats(review.learned, logs, today, settings.dailyGoal) }
}

export interface SelfStudyData extends StatsData {
  /** All of the user's own words. */
  totalCount: number
  /** Own words not learned yet (no progress, or level 0). */
  unlearnedCount: number
  /** Own words due for review today (ignored cards excluded, like the review). */
  dueCount: number
  /** Words in the next lesson (at most the daily goal); 0 when nothing is left to learn. */
  lessonCount: number
  /** Own words first learned today. */
  newToday: number
  /** Due / next reviews. */
  overview: ReviewOverview
}

/** Everything the own-words page shows. Live-query friendly (reads progress, customWords, studyLogs, settings). */
export async function loadSelfStudyData(today: string = localToday()): Promise<SelfStudyData> {
  const [review, logs, settings, lessonWords, customWords, progressRows] = await Promise.all([
    loadReviewData(today),
    db.studyLogs.toArray(),
    getSettings(),
    loadLessonWords(),
    db.customWords.toArray(),
    db.progress.toArray(),
  ])
  const learnedIds = new Set(review.learned.map((card) => card.wordId))
  const overview = getReviewOverview(review.learned, today)
  return {
    today,
    stats: computeStats(review.learned, logs, today, settings.dailyGoal),
    totalCount: customWords.length,
    unlearnedCount: customWords.filter((w) => !learnedIds.has(w.id)).length,
    dueCount: overview.dueCount,
    lessonCount: lessonWords.length,
    newToday: countNewToday(progressRows, today),
    overview,
  }
}
