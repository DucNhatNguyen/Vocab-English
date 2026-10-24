import type { Word } from '../data/types.ts'
import type { CardProgress } from '../db/types.ts'
import { formatDateVi } from './date.ts'
import { normalizeText, searchWords } from './search.ts'
import { MAX_LEVEL } from './srs.ts'

/** One notebook row: a word with its progress record (learned, or a level-0 favorite). */
export interface NotebookEntry {
  word: Word
  progress: CardProgress
}

export type NotebookLevel = 1 | 2 | 3 | 4 | 5
export type NotebookFilter = 'all' | 'favorites' | NotebookLevel

export const NOTEBOOK_LEVELS: readonly NotebookLevel[] = [1, 2, 3, 4, 5]

/** Value of the `f` URL param for a filter ("all" is the absence of the param). */
export function filterToParam(filter: NotebookFilter): string | null {
  return filter === 'all' ? null : String(filter)
}

/** Reads the `f` URL param; anything unknown means "all". */
export function parseFilter(raw: string | null): NotebookFilter {
  if (raw === 'favorites') return 'favorites'
  const n = Number(raw)
  return raw !== null && Number.isInteger(n) && n >= 1 && n <= MAX_LEVEL
    ? (n as NotebookLevel)
    : 'all'
}

export interface NotebookCounts {
  /** Learned words (level >= 1). Level-0 favorites are not included. */
  all: number
  /** Learned words per level. */
  levels: Record<NotebookLevel, number>
  /** Every favorite word, learned or not. */
  favorites: number
}

export interface NotebookView {
  /** Rows to show: filtered, searched and sorted. */
  items: NotebookEntry[]
  /** Counts over the whole notebook; they ignore the filter and the search query. */
  counts: NotebookCounts
}

export function countNotebook(entries: readonly NotebookEntry[]): NotebookCounts {
  const counts: NotebookCounts = {
    all: 0,
    levels: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    favorites: 0,
  }
  for (const { progress } of entries) {
    if (progress.level !== 0) {
      counts.all += 1
      counts.levels[progress.level] += 1
    }
    if (progress.favorite) counts.favorites += 1
  }
  return counts
}

function matchesFilter({ progress }: NotebookEntry, filter: NotebookFilter): boolean {
  if (filter === 'favorites') return progress.favorite
  // Level-0 records are only shown under the favorites filter
  if (progress.level === 0) return false
  return filter === 'all' || progress.level === filter
}

/** Level ascending, then headword alphabetically (accent-insensitive). */
function compareEntries(a: NotebookEntry, b: NotebookEntry): number {
  return (
    a.progress.level - b.progress.level ||
    normalizeText(a.word.word).localeCompare(normalizeText(b.word.word)) ||
    a.word.id.localeCompare(b.word.id)
  )
}

/**
 * The notebook list: entries kept by `filter`, then by the accent-insensitive `query` over
 * headword and meaning (blank query = no search), sorted by level then headword.
 */
export function buildNotebook(
  entries: readonly NotebookEntry[],
  filter: NotebookFilter,
  query: string,
): NotebookView {
  let items = entries.filter((e) => matchesFilter(e, filter))

  if (normalizeText(query) !== '') {
    const matched = new Set(
      searchWords(
        query,
        items.map((e) => e.word),
      ),
    )
    items = items.filter((e) => matched.has(e.word))
  }

  return { items: items.sort(compareEntries), counts: countNotebook(entries) }
}

/** "Ôn: ngày mai" for a ticked learned word, "Không ôn" when unticked, null at level 0. */
export function reviewStatusLabel(progress: CardProgress, today: string): string | null {
  if (progress.level === 0) return null
  if (progress.ignored) return 'Không ôn'
  if (!progress.dueDate) return null
  // An overdue card is simply due today
  const due = progress.dueDate < today ? today : progress.dueDate
  return `Ôn: ${formatDateVi(due, today)}`
}
