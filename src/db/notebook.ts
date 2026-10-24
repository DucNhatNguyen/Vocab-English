import { getWord } from '../data/index.ts'
import type { NotebookEntry } from '../lib/notebook.ts'
import { CUSTOM_WORD_ID_PREFIX } from './customWords.ts'
import { db } from './db.ts'

/**
 * Every notebook row: learned words (level >= 1) plus favorites not learned yet (level 0),
 * built-in and custom. Records whose word no longer exists (deleted custom word) are skipped.
 * Reads `progress` and `customWords`, so it works as a `useLiveQuery` source.
 */
export async function loadNotebookEntries(): Promise<NotebookEntry[]> {
  const [rows, customWords] = await Promise.all([
    db.progress.filter((p) => p.level >= 1 || p.favorite).toArray(),
    db.customWords.toArray(),
  ])
  const custom = new Map(customWords.map((w) => [w.id, w]))

  const entries: NotebookEntry[] = []
  for (const progress of rows) {
    const word = progress.wordId.startsWith(CUSTOM_WORD_ID_PREFIX)
      ? custom.get(progress.wordId)
      : getWord(progress.wordId)
    if (word) entries.push({ word, progress })
  }
  return entries
}
