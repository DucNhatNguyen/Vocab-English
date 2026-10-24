import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCustomWord } from './customWords.ts'
import { db } from './db.ts'
import { loadReviewData, recordReviewAnswer } from './review.ts'
import type { CardProgress } from './types.ts'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterAll(() => {
  db.close()
})

const TODAY = '2026-10-24'

const record = (over: Partial<CardProgress> & { wordId: string }): CardProgress => ({
  level: 1,
  dueDate: TODAY,
  learnedAt: '2026-10-01',
  correctCount: 0,
  wrongCount: 0,
  favorite: false,
  ignored: false,
  ...over,
})

describe('recordReviewAnswer', () => {
  it('moves a correct card up a level and schedules it by the new level', async () => {
    await db.progress.put(record({ wordId: 'hello', level: 2, favorite: true }))

    const outcome = await recordReviewAnswer('hello', true, TODAY)

    expect(outcome?.before.level).toBe(2)
    expect(outcome?.after.level).toBe(3)
    expect(await db.progress.get('hello')).toEqual({
      wordId: 'hello',
      level: 3,
      dueDate: '2026-10-31', // +7 days
      learnedAt: '2026-10-01',
      lastReviewedAt: TODAY,
      correctCount: 1,
      wrongCount: 0,
      favorite: true,
      ignored: false,
    })
  })

  it('resets a wrong card to level 1, due tomorrow', async () => {
    await db.progress.put(record({ wordId: 'hello', level: 4, dueDate: '2026-10-20' }))

    const outcome = await recordReviewAnswer('hello', false, TODAY)

    expect(outcome?.after.level).toBe(1)
    expect(await db.progress.get('hello')).toMatchObject({
      level: 1,
      dueDate: '2026-10-25',
      lastReviewedAt: TODAY,
      correctCount: 0,
      wrongCount: 1,
    })
  })

  it('keeps a level-5 card at 5 and reviews it again in 30 days', async () => {
    await db.progress.put(record({ wordId: 'hello', level: 5 }))
    await recordReviewAnswer('hello', true, TODAY)
    expect(await db.progress.get('hello')).toMatchObject({ level: 5, dueDate: '2026-11-23' })
  })

  it('creates the StudyLog of the day on the first answer', async () => {
    await db.progress.put(record({ wordId: 'hello' }))
    await recordReviewAnswer('hello', true, TODAY)

    const logs = await db.studyLogs.toArray()
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ date: TODAY, newLearned: 0, reviewed: 1, correct: 1, wrong: 0 })
  })

  it('counts a wrong first answer in the log', async () => {
    await db.progress.put(record({ wordId: 'hello' }))
    await recordReviewAnswer('hello', false, TODAY)
    expect((await db.studyLogs.toArray())[0]).toMatchObject({ reviewed: 1, correct: 0, wrong: 1 })
  })

  it('increments the existing log of the day and leaves newLearned alone', async () => {
    await db.studyLogs.add({ date: TODAY, newLearned: 5, reviewed: 3, correct: 2, wrong: 1 })
    await db.progress.put(record({ wordId: 'a' }))
    await db.progress.put(record({ wordId: 'b' }))

    await recordReviewAnswer('a', true, TODAY)
    await recordReviewAnswer('b', false, TODAY)

    const logs = await db.studyLogs.toArray()
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ newLearned: 5, reviewed: 5, correct: 3, wrong: 2 })
  })

  it('starts a separate log on another day', async () => {
    await db.progress.put(record({ wordId: 'a', dueDate: '2026-10-20' }))
    await db.progress.put(record({ wordId: 'b', dueDate: '2026-10-20' }))
    await recordReviewAnswer('a', true, TODAY)
    await recordReviewAnswer('b', true, '2026-10-25')
    const logs = await db.studyLogs.orderBy('date').toArray()
    expect(logs.map((l) => [l.date, l.reviewed])).toEqual([
      [TODAY, 1],
      ['2026-10-25', 1],
    ])
  })

  it('persists concurrent first answers of different words without losing log counts', async () => {
    const ids = ['a', 'b', 'c', 'd', 'e']
    for (const wordId of ids) await db.progress.put(record({ wordId }))

    await Promise.all(ids.map((id, i) => recordReviewAnswer(id, i % 2 === 0, TODAY)))

    expect(await db.studyLogs.count()).toBe(1)
    expect((await db.studyLogs.toArray())[0]).toMatchObject({ reviewed: 5, correct: 3, wrong: 2 })
  })

  it('writes nothing for an unlearned (level 0), ignored or missing card', async () => {
    await db.progress.put(record({ wordId: 'fav', level: 0, dueDate: undefined, favorite: true }))
    await db.progress.put(record({ wordId: 'off', level: 3, ignored: true }))
    const before = await db.progress.toArray()

    expect(await recordReviewAnswer('fav', true, TODAY)).toBeNull()
    expect(await recordReviewAnswer('off', false, TODAY)).toBeNull()
    expect(await recordReviewAnswer('nope', true, TODAY)).toBeNull()

    expect(await db.progress.toArray()).toEqual(before)
    expect(await db.studyLogs.count()).toBe(0)
  })

  it('rolls back the card when the log update fails', async () => {
    await db.progress.put(record({ wordId: 'hello', level: 2 }))
    await db.studyLogs.add({ date: TODAY, newLearned: 0, reviewed: 0, correct: 0, wrong: 0 })
    const spy = vi.spyOn(db.studyLogs, 'update').mockRejectedValue(new Error('boom'))
    try {
      await expect(recordReviewAnswer('hello', true, TODAY)).rejects.toThrow('boom')
    } finally {
      spy.mockRestore()
    }
    expect(await db.progress.get('hello')).toMatchObject({ level: 2, correctCount: 0 })
  })

  it('works for custom words', async () => {
    const mine = await createCustomWord({
      word: 'serendipity',
      ipa: '',
      pos: 'noun',
      meaningVi: 'sự tình cờ may mắn',
      exampleEn: '',
      exampleVi: '',
    })
    await db.progress.put(record({ wordId: mine.id }))
    await recordReviewAnswer(mine.id, true, TODAY)
    expect((await db.progress.get(mine.id))?.level).toBe(2)
  })

  it('only the first answer is recorded: a re-ask makes no call, so nothing changes again', async () => {
    // The round calls recordReviewAnswer for the first answer of a word only; the re-ask of a
    // wrong word (answered correctly later) never reaches the database.
    await db.progress.put(record({ wordId: 'hello', level: 2 }))
    await recordReviewAnswer('hello', false, TODAY) // first answer: wrong -> level 1
    expect(await db.progress.get('hello')).toMatchObject({
      level: 1,
      dueDate: '2026-10-25',
      correctCount: 0,
      wrongCount: 1,
    })
    expect((await db.studyLogs.toArray())[0]).toMatchObject({ reviewed: 1, wrong: 1, correct: 0 })
  })
})

describe('loadReviewData', () => {
  it('returns learned cards with their words and a pool of built-in plus custom words', async () => {
    const mine = await createCustomWord({
      word: 'serendipity',
      ipa: '',
      pos: 'noun',
      meaningVi: 'sự tình cờ may mắn',
      exampleEn: '',
      exampleVi: '',
    })
    await db.progress.put(record({ wordId: 'hello' }))
    await db.progress.put(record({ wordId: mine.id, level: 3 }))
    await db.progress.put(
      record({ wordId: 'goodbye', level: 0, dueDate: undefined, favorite: true }),
    )

    const data = await loadReviewData(TODAY)

    expect(data.today).toBe(TODAY)
    expect(data.learned.map((p) => p.wordId).sort()).toEqual(['hello', mine.id].sort())
    expect(data.words.get('hello')?.word).toBe('hello')
    expect(data.words.get(mine.id)?.word).toBe('serendipity')
    expect(data.pool.some((w) => w.id === mine.id)).toBe(true)
    expect(data.pool.some((w) => w.id === 'hello')).toBe(true)
  })

  it('keeps ignored cards (for counts) and drops cards whose word no longer exists', async () => {
    await db.progress.put(record({ wordId: 'hello', ignored: true }))
    await db.progress.put(record({ wordId: 'not-a-real-word' }))
    await db.progress.put(record({ wordId: 'custom:deleted' }))

    const data = await loadReviewData(TODAY)

    expect(data.learned.map((p) => p.wordId)).toEqual(['hello'])
    expect(data.words.has('not-a-real-word')).toBe(false)
  })
})
