import { getWord } from '../data/index.ts'
import type { Word } from '../data/types.ts'
import { CUSTOM_WORD_ID_PREFIX } from './customWords.ts'
import { db } from './db.ts'

export function isCustomWordId(wordId: string): boolean {
  return wordId.startsWith(CUSTOM_WORD_ID_PREFIX)
}

/** One word, built-in or custom ("custom:" prefix). undefined when it does not exist. */
export async function getWordById(wordId: string): Promise<Word | undefined> {
  return isCustomWordId(wordId) ? db.customWords.get(wordId) : getWord(wordId)
}

/** Words for `wordIds`, keeping their order. Ids that no longer exist are skipped. */
export async function getWordsByIds(wordIds: readonly string[]): Promise<Word[]> {
  const found = await Promise.all(wordIds.map(getWordById))
  return found.filter((w): w is Word => w !== undefined)
}
