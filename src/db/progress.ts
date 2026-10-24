import { db } from './db.ts'
import type { CardProgress } from './types.ts'

/**
 * Flips the favorite flag of a word and resolves to the new value.
 * A word never studied gets a level-0 record that exists only for the favorite; when such a
 * record is un-favorited it is deleted again.
 */
export async function toggleFavorite(wordId: string): Promise<boolean> {
  return db.transaction('rw', db.progress, async () => {
    const existing = await db.progress.get(wordId)

    if (!existing) {
      const created: CardProgress = {
        wordId,
        level: 0,
        correctCount: 0,
        wrongCount: 0,
        favorite: true,
        ignored: false,
      }
      await db.progress.put(created)
      return true
    }

    const favorite = !existing.favorite
    if (existing.level === 0 && !favorite) {
      await db.progress.delete(wordId)
    } else {
      await db.progress.put({ ...existing, favorite })
    }
    return favorite
  })
}

/** A word counts as learned once it has reached memory level 1 (level 0 = favorite only). */
export function isLearned(progress: CardProgress | undefined): boolean {
  return progress !== undefined && progress.level >= 1
}
