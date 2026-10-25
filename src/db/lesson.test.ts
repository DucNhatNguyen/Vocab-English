import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { completeLesson, loadLessonWords } from './lesson.ts'
import { createCustomWord } from './customWords.ts'
import { db } from './db.ts'
import { updateSettings } from './settings.ts'
import type { CardProgress } from './types.ts'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterAll(() => {
  db.close()
})

const TODAY = '2026-10-24'
const TOMORROW = '2026-10-25'

const record = (over: Partial<CardProgress> & { wordId: string }): CardProgress => ({
  level: 0,
  correctCount: 0,
  wrongCount: 0,
  favorite: false,
  ignored: false,
  ...over,
})

describe('completeLesson', () => {
  it('moves new words to level 1, due tomorrow, and creates the StudyLog', async () => {
    expect(await completeLesson(['hello', 'goodbye'], TODAY)).toBe(2)

    for (const wordId of ['hello', 'goodbye']) {
      expect(await db.progress.get(wordId)).toEqual({
        wordId,
        level: 1,
        dueDate: TOMORROW,
        learnedAt: TODAY,
        correctCount: 0,
        wrongCount: 0,
        favorite: false,
        ignored: false,
      })
    }
    const logs = await db.studyLogs.toArray()
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ date: TODAY, newLearned: 2, reviewed: 0, correct: 0, wrong: 0 })
  })

  it('keeps the favorite flag of level-0 records', async () => {
    await db.progress.put(record({ wordId: 'hello', favorite: true }))
    await completeLesson(['hello', 'goodbye'], TODAY)

    expect((await db.progress.get('hello'))?.favorite).toBe(true)
    expect((await db.progress.get('hello'))?.level).toBe(1)
    expect((await db.progress.get('goodbye'))?.favorite).toBe(false)
  })

  it('does not reset words that are already learned, and does not count them', async () => {
    const learned = record({
      wordId: 'hello',
      level: 4,
      dueDate: '2026-11-07',
      learnedAt: '2026-10-01',
      lastReviewedAt: '2026-10-24',
      correctCount: 5,
      wrongCount: 1,
      favorite: true,
    })
    await db.progress.put(learned)

    expect(await completeLesson(['hello', 'goodbye'], TODAY)).toBe(1)

    expect(await db.progress.get('hello')).toEqual(learned)
    expect((await db.studyLogs.toArray())[0].newLearned).toBe(1)
  })

  it('creates the StudyLog once per day and increments it on a second lesson', async () => {
    await completeLesson(['hello', 'goodbye'], TODAY)
    await completeLesson(['please', 'sorry', 'yes'], TODAY)

    const logs = await db.studyLogs.toArray()
    expect(logs).toHaveLength(1)
    expect(logs[0].newLearned).toBe(5)
    expect(logs[0].date).toBe(TODAY)
  })

  it('keeps review counters of an existing log untouched', async () => {
    await db.studyLogs.add({ date: TODAY, newLearned: 0, reviewed: 7, correct: 5, wrong: 2 })
    await completeLesson(['hello'], TODAY)
    expect((await db.studyLogs.toArray())[0]).toMatchObject({
      newLearned: 1,
      reviewed: 7,
      correct: 5,
      wrong: 2,
    })
  })

  it('starts a separate log on another day', async () => {
    await completeLesson(['hello'], TODAY)
    await completeLesson(['goodbye'], TOMORROW)
    const logs = await db.studyLogs.orderBy('date').toArray()
    expect(logs.map((l) => [l.date, l.newLearned])).toEqual([
      [TODAY, 1],
      [TOMORROW, 1],
    ])
  })

  it('is safe to repeat: a second call for the same words changes nothing', async () => {
    await completeLesson(['hello', 'goodbye'], TODAY)
    expect(await completeLesson(['hello', 'goodbye'], TODAY)).toBe(0)
    expect((await db.studyLogs.toArray())[0].newLearned).toBe(2)
  })

  it('ignores duplicate ids and writes no log for an empty lesson', async () => {
    expect(await completeLesson(['hello', 'hello'], TODAY)).toBe(1)
    await db.studyLogs.clear()
    expect(await completeLesson([], TODAY)).toBe(0)
    expect(await db.studyLogs.count()).toBe(0)
  })

  it('works for custom words too', async () => {
    const mine = await createCustomWord({
      word: 'serendipity',
      ipa: '',
      pos: 'noun',
      meaningVi: 'sự tình cờ may mắn',
      exampleEn: '',
      exampleVi: '',
    })
    await completeLesson([mine.id], TODAY)
    expect((await db.progress.get(mine.id))?.level).toBe(1)
  })

  it('rolls back everything when the log update fails', async () => {
    // Make the StudyLog write fail after the progress writes: the whole transaction must abort
    await db.studyLogs.add({ date: TODAY, newLearned: 0, reviewed: 0, correct: 0, wrong: 0 })
    const spy = vi.spyOn(db.studyLogs, 'update').mockRejectedValue(new Error('boom'))
    try {
      await expect(completeLesson(['hello'], TODAY)).rejects.toThrow('boom')
    } finally {
      spy.mockRestore()
    }
    expect(await db.progress.get('hello')).toBeUndefined()
  })
})

describe('loadLessonWords', () => {
  const input = { ipa: '', pos: 'noun' as const, exampleEn: '', exampleVi: '' }

  it('returns only own unlearned words, up to dailyGoal', async () => {
    await updateSettings({ dailyGoal: 2, activeDeckIds: ['giao-tiep-hang-ngay'] })
    for (const word of ['alpha', 'beta', 'gamma']) {
      await createCustomWord({ ...input, word, meaningVi: word })
    }

    const lesson = await loadLessonWords()
    expect(lesson).toHaveLength(2)
    expect(lesson.every((w) => w.id.startsWith('custom:'))).toBe(true)
  })

  it('is empty without own words, even with active decks', async () => {
    await updateSettings({ dailyGoal: 5, activeDeckIds: ['giao-tiep-hang-ngay'] })
    expect(await loadLessonWords()).toEqual([])
  })

  it('skips learned words and keeps favorites', async () => {
    await updateSettings({ dailyGoal: 5 })
    const a = await createCustomWord({ ...input, word: 'alpha', meaningVi: 'a' })
    const b = await createCustomWord({ ...input, word: 'beta', meaningVi: 'b' })
    await db.progress.put(record({ wordId: a.id, level: 2, dueDate: TODAY }))
    await db.progress.put(record({ wordId: b.id, favorite: true }))
    await db.progress.put(record({ wordId: 'hello', favorite: true }))

    expect((await loadLessonWords()).map((w) => w.id)).toEqual([b.id])
  })
})
