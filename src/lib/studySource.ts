import type { CardProgress } from '../db/types.ts'
import { isCustomWordId } from '../db/words.ts'

/**
 * Where a lesson or a review round takes its words from. `decks`: the active built-in decks
 * (the daily lesson). `mine`: the user's own words (Tự học). `all`: both (the shared review).
 */
export type StudySource = 'decks' | 'mine' | 'all'

/** Query parameter that selects the self-study variant of Learn / Review: `/learn?nguon=tu-hoc`. */
export const SOURCE_PARAM = 'nguon'
export const SELF_STUDY_VALUE = 'tu-hoc'

/** True when a location search string asks for the self-study variant. */
export function isSelfStudySearch(search: string): boolean {
  return new URLSearchParams(search).get(SOURCE_PARAM) === SELF_STUDY_VALUE
}

function matches(wordId: string, source: StudySource): boolean {
  if (source === 'all') return true
  return isCustomWordId(wordId) === (source === 'mine')
}

/** Cards (or any rows with a `wordId`) that belong to a source, order kept. */
export function filterCardsBySource<T extends { wordId: string }>(
  cards: readonly T[],
  source: StudySource,
): T[] {
  return cards.filter((card) => matches(card.wordId, source))
}

/** Learned cards of a source whose first lesson was today ("Hôm nay: x/N từ mới"). */
export function countNewToday(
  cards: Iterable<CardProgress>,
  today: string,
  source: StudySource,
): number {
  let count = 0
  for (const card of cards) {
    if (card.level >= 1 && card.learnedAt === today && matches(card.wordId, source)) count += 1
  }
  return count
}
