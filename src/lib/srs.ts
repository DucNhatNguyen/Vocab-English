import type { CardProgress } from '../db/types.ts'
import { addDays } from './date.ts'

/** Days until the next review for each memory level. */
export const INTERVAL_DAYS = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 } as const
export const MAX_LEVEL = 5

export type SrsLevel = 1 | 2 | 3 | 4 | 5

/** Level after the first answer of a review round: correct moves up (max 5), wrong resets to 1. */
export function nextLevel(level: SrsLevel, correct: boolean): SrsLevel {
  if (!correct) return 1
  return Math.min(level + 1, MAX_LEVEL) as SrsLevel
}

/** Due date (local "YYYY-MM-DD") for a card that just reached `level` on `today`. */
export function dueDateFor(level: SrsLevel, today: string): string {
  return addDays(today, INTERVAL_DAYS[level])
}

/**
 * Finish a new-word lesson: card enters level 1, due tomorrow.
 * Keeps favorite/ignored/counts of an existing level-0 record; an already-learned card is returned unchanged.
 */
export function learnCard(
  progress: CardProgress | undefined,
  wordId: string,
  today: string,
): CardProgress {
  if (progress && progress.level >= 1) return progress
  return {
    wordId,
    correctCount: 0,
    wrongCount: 0,
    favorite: false,
    ignored: false,
    ...progress,
    level: 1,
    dueDate: dueDateFor(1, today),
    learnedAt: today,
  }
}

/**
 * Apply the FIRST answer of a review round. Late reviews are not penalised:
 * the result depends only on `today`, not on how overdue the card was.
 */
export function reviewCard(progress: CardProgress, correct: boolean, today: string): CardProgress {
  if (progress.level === 0) {
    throw new RangeError(`Cannot review an unlearned card: ${progress.wordId}`)
  }
  const level = nextLevel(progress.level, correct)
  return {
    ...progress,
    level,
    dueDate: dueDateFor(level, today),
    lastReviewedAt: today,
    correctCount: progress.correctCount + (correct ? 1 : 0),
    wrongCount: progress.wrongCount + (correct ? 0 : 1),
  }
}

/** True when a learned, non-ignored card is due on or before `today`. */
export function isDue(progress: CardProgress, today: string): boolean {
  return (
    progress.level >= 1 &&
    !progress.ignored &&
    progress.dueDate !== undefined &&
    progress.dueDate <= today
  )
}
