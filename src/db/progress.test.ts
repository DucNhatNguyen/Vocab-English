import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from './db.ts'
import { isLearned, toggleFavorite } from './progress.ts'
import type { CardProgress } from './types.ts'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterAll(() => {
  db.close()
})

describe('toggleFavorite', () => {
  it('creates a level-0 favorite record for a word never studied', async () => {
    expect(await toggleFavorite('hello')).toBe(true)
    expect(await db.progress.get('hello')).toEqual({
      wordId: 'hello',
      level: 0,
      correctCount: 0,
      wrongCount: 0,
      favorite: true,
      ignored: false,
    })
  })

  it('deletes a level-0 record when un-favorited', async () => {
    await toggleFavorite('hello')
    expect(await toggleFavorite('hello')).toBe(false)
    expect(await db.progress.get('hello')).toBeUndefined()
    expect(await db.progress.count()).toBe(0)
  })

  it('flips favorite on a learned word and keeps everything else', async () => {
    const learned: CardProgress = {
      wordId: 'resilient',
      level: 3,
      dueDate: '2026-11-01',
      learnedAt: '2026-10-20',
      lastReviewedAt: '2026-10-24',
      correctCount: 4,
      wrongCount: 1,
      favorite: false,
      ignored: true,
    }
    await db.progress.put(learned)

    expect(await toggleFavorite('resilient')).toBe(true)
    expect(await db.progress.get('resilient')).toEqual({ ...learned, favorite: true })

    expect(await toggleFavorite('resilient')).toBe(false)
    expect(await db.progress.get('resilient')).toEqual({ ...learned, favorite: false })
  })

  it('works for custom word ids', async () => {
    expect(await toggleFavorite('custom:abc-123')).toBe(true)
    expect((await db.progress.get('custom:abc-123'))?.favorite).toBe(true)
  })
})

describe('isLearned', () => {
  const base = { wordId: 'x', correctCount: 0, wrongCount: 0, favorite: false, ignored: false }

  it('is false without a record or at level 0', () => {
    expect(isLearned(undefined)).toBe(false)
    expect(isLearned({ ...base, level: 0, favorite: true })).toBe(false)
  })

  it('is true from level 1 up', () => {
    expect(isLearned({ ...base, level: 1 })).toBe(true)
    expect(isLearned({ ...base, level: 5 })).toBe(true)
  })
})
