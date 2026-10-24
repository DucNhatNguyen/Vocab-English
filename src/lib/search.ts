import type { Word } from '../data/types.ts'

/**
 * Lowercase, strip Vietnamese diacritics, collapse whitespace, trim.
 * "Kiên Cường" -> "kien cuong". `đ` does not decompose under NFD, so it is mapped explicitly.
 */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

interface SearchKey {
  headword: string
  meaning: string
}

// Words are treated as immutable; cache normalised keys so typing does not re-normalise everything.
const keyCache = new WeakMap<Word, SearchKey>()

function keyOf(w: Word): SearchKey {
  let key = keyCache.get(w)
  if (!key) {
    key = { headword: normalizeText(w.word), meaning: normalizeText(w.meaningVi) }
    keyCache.set(w, key)
  }
  return key
}

/**
 * Accent-insensitive search over the English headword and the Vietnamese meaning.
 * Ranking: exact headword, headword prefix, headword contains, meaning contains.
 * Order is stable within each group. Empty / whitespace query -> [].
 */
export function searchWords<T extends Word>(query: string, words: readonly T[]): T[] {
  const q = normalizeText(query)
  if (!q) return []

  const exact: T[] = []
  const prefix: T[] = []
  const contains: T[] = []
  const meaning: T[] = []

  for (const w of words) {
    const key = keyOf(w)
    if (key.headword === q) exact.push(w)
    else if (key.headword.startsWith(q)) prefix.push(w)
    else if (key.headword.includes(q)) contains.push(w)
    else if (key.meaning.includes(q)) meaning.push(w)
  }

  return [...exact, ...prefix, ...contains, ...meaning]
}
