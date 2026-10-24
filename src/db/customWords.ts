import { toLocalDateString } from '../lib/date.ts'
import { db } from './db.ts'
import type { CustomWord } from './types.ts'

export type CustomWordInput = Omit<CustomWord, 'id' | 'createdAt' | 'createdAtMs' | 'level' | 'topics'> &
  Partial<Pick<CustomWord, 'level' | 'topics'>>

export type CustomWordChanges = Partial<Omit<CustomWord, 'id' | 'createdAt' | 'createdAtMs'>>

export const CUSTOM_WORD_ID_PREFIX = 'custom:'

export async function createCustomWord(input: CustomWordInput): Promise<CustomWord> {
  const word: CustomWord = {
    ...input,
    word: input.word.trim(),
    level: input.level ?? 'custom',
    topics: input.topics ?? ['custom'],
    id: `${CUSTOM_WORD_ID_PREFIX}${crypto.randomUUID()}`,
    createdAt: toLocalDateString(),
    createdAtMs: Date.now(),
  }
  await db.customWords.add(word)
  return word
}

/** Updates fields of a custom word; resolves to the updated word, or undefined if it does not exist. */
export async function updateCustomWord(
  id: string,
  changes: CustomWordChanges,
): Promise<CustomWord | undefined> {
  const patch = changes.word === undefined ? changes : { ...changes, word: changes.word.trim() }
  return db.transaction('rw', db.customWords, async () => {
    const updated = await db.customWords.update(id, patch)
    return updated ? db.customWords.get(id) : undefined
  })
}

/** Deletes a custom word together with its progress record. */
export async function deleteCustomWord(id: string): Promise<void> {
  await db.transaction('rw', db.customWords, db.progress, async () => {
    await db.customWords.delete(id)
    await db.progress.delete(id)
  })
}

/** Case-insensitive, trimmed lookup by headword; used to prevent duplicates. */
export async function findCustomWordByHeadword(word: string): Promise<CustomWord | undefined> {
  const trimmed = word.trim()
  if (!trimmed) return undefined
  return db.customWords.where('word').equalsIgnoreCase(trimmed).first()
}
