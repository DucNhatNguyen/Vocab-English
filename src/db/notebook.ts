import type { NotebookEntry } from '../lib/notebook.ts'
import { CUSTOM_WORD_ID_PREFIX } from './customWords.ts'
import { db } from './db.ts'

/**
 * Every notebook row: learned own words (level >= 1) plus favorites not learned yet (level 0).
 * Built-in words are not part of the notebook (their progress stays stored); records whose word no
 * longer exists (deleted custom word) are skipped.
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
    if (!progress.wordId.startsWith(CUSTOM_WORD_ID_PREFIX)) continue
    const word = custom.get(progress.wordId)
    if (word) entries.push({ word, progress })
  }
  return entries
}
