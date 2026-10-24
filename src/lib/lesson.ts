import { getDeckWords as getBuiltInDeckWords } from '../data/index.ts'
import type { Word } from '../data/types.ts'
import type { CardProgress, CustomWord } from '../db/types.ts'
import { compareCustomWordsOldestFirst } from './customWordOrder.ts'

export interface LessonSelectionInput {
  /** Words per lesson (the daily goal). */
  count: number
  /** All of the user's own words, in any order. */
  customWords: readonly CustomWord[]
  /** Deck ids to draw from, in priority order. */
  activeDeckIds: readonly string[]
  progress: ReadonlyMap<string, CardProgress>
  /** Words of a deck in deck order; unknown deck -> []. Injectable for tests. */
  getDeckWords?: (deckId: string) => readonly Word[]
}

/** A word is new when it has no progress, or only a level-0 record (favorite without learning). */
export function isUnlearned(progress: CardProgress | undefined): boolean {
  return progress === undefined || progress.level === 0
}

/**
 * Words for the next new-word lesson: unlearned custom words first (oldest first: `createdAt`,
 * then `createdAtMs`, then id), then unlearned words of each active deck in the order the ids are
 * listed, each deck in its own order. Unknown decks are skipped, duplicates dropped. May return
 * fewer than `count` words, or none.
 */
export function selectLessonWords({
  count,
  customWords,
  activeDeckIds,
  progress,
  getDeckWords = getBuiltInDeckWords,
}: LessonSelectionInput): Word[] {
  const limit = Math.floor(count)
  if (!(limit > 0)) return []

  const picked: Word[] = []
  const seen = new Set<string>()
  // Returns true once the lesson is full.
  const add = (word: Word): boolean => {
    if (!seen.has(word.id) && isUnlearned(progress.get(word.id))) {
      seen.add(word.id)
      picked.push(word)
    }
    return picked.length >= limit
  }

  const ownWords = [...customWords].sort(compareCustomWordsOldestFirst)
  for (const word of ownWords) if (add(word)) return picked

  for (const deckId of activeDeckIds) {
    for (const word of getDeckWords(deckId)) if (add(word)) return picked
  }
  return picked
}
