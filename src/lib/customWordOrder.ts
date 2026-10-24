import type { CustomWord } from '../db/types.ts'

/**
 * Oldest-first order of custom words: `createdAt` (a date only), then `createdAtMs` (words
 * saved before it existed count as 0), then id, so the order is total and stable.
 */
export function compareCustomWordsOldestFirst(
  a: Pick<CustomWord, 'id' | 'createdAt' | 'createdAtMs'>,
  b: Pick<CustomWord, 'id' | 'createdAt' | 'createdAtMs'>,
): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
  const am = a.createdAtMs ?? 0
  const bm = b.createdAtMs ?? 0
  if (am !== bm) return am - bm
  if (a.id !== b.id) return a.id < b.id ? -1 : 1
  return 0
}

export function compareCustomWordsNewestFirst(
  a: Pick<CustomWord, 'id' | 'createdAt' | 'createdAtMs'>,
  b: Pick<CustomWord, 'id' | 'createdAt' | 'createdAtMs'>,
): number {
  return compareCustomWordsOldestFirst(b, a)
}
