import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { getWord } from '../data/index.ts'
import type { Word } from '../data/types.ts'
import { db } from '../db/db.ts'
import type { CardProgress, CustomWord } from '../db/types.ts'
import { compareCustomWordsNewestFirst } from '../lib/customWordOrder.ts'
import { getWordById, isCustomWordId } from '../db/words.ts'

const NO_PROGRESS: CardProgress[] = []
const EMPTY_PROGRESS = new Map<string, CardProgress>()

/** Live progress of every word, keyed by wordId. Empty until loaded. */
export function useProgressMap(): ReadonlyMap<string, CardProgress> {
  const rows = useLiveQuery(() => db.progress.toArray(), [], NO_PROGRESS)
  return useMemo(
    () => (rows.length === 0 ? EMPTY_PROGRESS : new Map(rows.map((p) => [p.wordId, p]))),
    [rows],
  )
}

/** Live progress of one word: undefined while loading, null when the word has no record. */
export function useCardProgress(wordId: string): CardProgress | null | undefined {
  return useLiveQuery(async () => (await db.progress.get(wordId)) ?? null, [wordId])
}

/** Live custom words (newest first). Empty until loaded. */
export function useCustomWords(): CustomWord[] {
  return useLiveQuery(async () => (await db.customWords.toArray()).sort(compareCustomWordsNewestFirst), [], [])
}

/**
 * Built-in or custom ("custom:" prefix) word by id.
 * undefined while loading, null when it does not exist.
 */
export function useWord(wordId: string): Word | null | undefined {
  const isCustom = isCustomWordId(wordId)
  const custom = useLiveQuery(
    async () => (isCustom ? ((await getWordById(wordId)) ?? null) : null),
    [wordId, isCustom],
  )
  if (!isCustom) return getWord(wordId) ?? null
  return custom
}
