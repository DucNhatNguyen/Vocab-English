import { today as localToday } from '../lib/date.ts'
import { getReviewOverview, type ReviewOverview } from '../lib/review.ts'
import { computeStats, type Stats } from '../lib/stats.ts'
import { countNewToday, filterCardsBySource } from '../lib/studySource.ts'
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

export interface HomeData extends StatsData {
  /** Due / next reviews. */
  overview: ReviewOverview
  /** Words in the next new-word lesson (at most the daily goal); 0 when nothing is left to learn. */
  lessonCount: number
  /** Whether any deck is selected for learning. */
  hasActiveDecks: boolean
  /** Deck words first learned today (Tự học words are not part of the daily goal). */
  newToday: number
}

/** Everything the Home dashboard shows. Live-query source, like `loadStats`. */
export async function loadHomeData(today: string = localToday()): Promise<HomeData> {
  const [review, logs, settings, lessonWords, progressRows] = await Promise.all([
    loadReviewData(today),
    db.studyLogs.toArray(),
    getSettings(),
    loadLessonWords(),
    db.progress.toArray(),
  ])
  return {
    today,
    stats: computeStats(review.learned, logs, today, settings.dailyGoal),
    overview: getReviewOverview(review.learned, today),
    lessonCount: lessonWords.length,
    hasActiveDecks: settings.activeDeckIds.length > 0,
    newToday: countNewToday(progressRows, today, 'decks'),
  }
}

export interface SelfStudyData {
  /** All of the user's own words. */
  totalCount: number
  /** Own words not learned yet (no progress, or level 0). */
  unlearnedCount: number
  /** Own words due for review today (ignored cards excluded, like the shared review). */
  dueCount: number
}

/** Numbers of the Tự học tab. Live-query friendly (reads progress and customWords). */
export async function loadSelfStudyData(today: string = localToday()): Promise<SelfStudyData> {
  const [review, customWords] = await Promise.all([loadReviewData(today), db.customWords.toArray()])
  const mine = filterCardsBySource(review.learned, 'mine')
  const learnedIds = new Set(mine.map((card) => card.wordId))
  return {
    totalCount: customWords.length,
    unlearnedCount: customWords.filter((w) => !learnedIds.has(w.id)).length,
    dueCount: getReviewOverview(mine, today).dueCount,
  }
}
