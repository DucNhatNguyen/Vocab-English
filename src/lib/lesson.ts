import type { Word } from '../data/types.ts'
import type { CardProgress, CustomWord } from '../db/types.ts'
import { compareCustomWordsOldestFirst } from './customWordOrder.ts'

export interface LessonSelectionInput {
  /** Words per lesson (Settings "Số từ mỗi bài học"). */
  count: number
  /** All of the user's own words, in any order. */
  customWords: readonly CustomWord[]
  progress: ReadonlyMap<string, CardProgress>
}

/** A word is new when it has no progress, or only a level-0 record (favorite without learning). */
export function isUnlearned(progress: CardProgress | undefined): boolean {
  return progress === undefined || progress.level === 0
}

/** Unlearned own words for the next lesson, oldest first (`createdAt`, `createdAtMs`, id). May be fewer than `count`. */
export function selectLessonWords({ count, customWords, progress }: LessonSelectionInput): Word[] {
  const limit = Math.floor(count)
  if (!(limit > 0)) return []
  return [...customWords]
    .sort(compareCustomWordsOldestFirst)
    .filter((word) => isUnlearned(progress.get(word.id)))
    .slice(0, limit)
}
