import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createCustomWord } from './customWords.ts'
import { db } from './db.ts'
import { updateSettings } from './settings.ts'
import { loadSelfStudyData, loadStats } from './stats.ts'
import type { CardProgress, StudyLog } from './types.ts'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterAll(() => {
  db.close()
})

const TODAY = '2026-10-24'

const card = (wordId: string, level: CardProgress['level'], over: Partial<CardProgress> = {}): CardProgress => ({
  wordId,
  level,
  dueDate: level === 0 ? undefined : TODAY,
  learnedAt: '2026-10-01',
  correctCount: 0,
  wrongCount: 0,
  favorite: false,
  ignored: false,
  ...over,
})
const log = (date: string, over: Partial<StudyLog> = {}): StudyLog => ({
  date,
  newLearned: 0,
  reviewed: 0,
  correct: 0,
  wrong: 0,
  ...over,
})

describe('loadStats', () => {
  it('is empty for a new database', async () => {
    const { stats, today } = await loadStats(TODAY)
    expect(today).toBe(TODAY)
    expect(stats.learned).toBe(0)
    expect(stats.accuracy).toBeNull()
    expect(stats.today.goal).toBe(10)
  })

  it('aggregates progress, logs and the daily goal, skipping built-in cards and cards of deleted words', async () => {
    await updateSettings({ dailyGoal: 5 })
    const mine = await createCustomWord({
      word: 'mine',
      ipa: '',
      pos: 'noun',
      meaningVi: 'của tôi',
      exampleEn: '',
      exampleVi: '',
    })
    const other = await createCustomWord({
      word: 'other',
      ipa: '',
      pos: 'noun',
      meaningVi: 'khác',
      exampleEn: '',
      exampleVi: '',
    })
    await db.progress.bulkPut([
      card('hello', 4), // built-in: hidden
      card(other.id, 3, { ignored: true }),
      card(mine.id, 5),
      card('custom:deleted', 2), // word no longer exists
      card('custom:fav', 0, { favorite: true }),
    ])
    await db.studyLogs.bulkAdd([
      log('2026-10-23', { newLearned: 4, reviewed: 4, correct: 3, wrong: 1 }),
      log(TODAY, { newLearned: 2, reviewed: 1, correct: 1 }),
    ])

    const { stats } = await loadStats(TODAY)
    expect(stats.levels).toEqual([0, 0, 1, 0, 1])
    expect(stats.learned).toBe(2)
    expect(stats.ignored).toBe(1)
    expect(stats.mastered).toBe(1)
    expect(stats.accuracy).toBeCloseTo(0.8)
    expect(stats.streak).toEqual({ current: 2, longest: 2, todayDone: true })
    expect(stats.today).toEqual({ newLearned: 2, reviewed: 1, goal: 5 })
  })
})

const input = { ipa: '', pos: 'noun' as const, exampleEn: '', exampleVi: '' }

describe('loadSelfStudyData', () => {
  it('counts own words: total, unlearned, due today, next lesson, learned today', async () => {
    await updateSettings({ dailyGoal: 5 })
    const a = await createCustomWord({ ...input, word: 'alpha', meaningVi: 'a' })
    const b = await createCustomWord({ ...input, word: 'beta', meaningVi: 'b' })
    await createCustomWord({ ...input, word: 'gamma', meaningVi: 'c' })
    await db.progress.bulkPut([
      card(a.id, 1, { dueDate: TODAY, learnedAt: TODAY }),
      card(b.id, 2, { dueDate: '2026-10-30' }),
      card('hello', 1, { dueDate: TODAY, learnedAt: TODAY }), // built-in: not counted
    ])

    const data = await loadSelfStudyData(TODAY)
    expect(data).toMatchObject({
      today: TODAY,
      totalCount: 3,
      unlearnedCount: 1,
      dueCount: 1,
      lessonCount: 1,
      newToday: 1,
    })
    expect(data.overview.dueCount).toBe(1)
    expect(data.overview.next).toEqual({ date: '2026-10-30', count: 1 })
    expect(data.stats.learned).toBe(2)
    expect(data.stats.today.goal).toBe(5)
  })

  it('caps the next lesson at the daily goal and is empty without own words', async () => {
    expect(await loadSelfStudyData(TODAY)).toMatchObject({
      totalCount: 0,
      unlearnedCount: 0,
      dueCount: 0,
      lessonCount: 0,
      newToday: 0,
    })

    await updateSettings({ dailyGoal: 2 })
    for (const word of ['alpha', 'beta', 'gamma']) {
      await createCustomWord({ ...input, word, meaningVi: word })
    }
    expect(await loadSelfStudyData(TODAY)).toMatchObject({ unlearnedCount: 3, lessonCount: 2 })
  })

  it('does not count ignored cards as due', async () => {
    const a = await createCustomWord({ ...input, word: 'alpha', meaningVi: 'a' })
    await db.progress.put(card(a.id, 2, { dueDate: TODAY, ignored: true }))
    expect((await loadSelfStudyData(TODAY)).dueCount).toBe(0)
  })

  it('leaves built-in progress out of stats and levels', async () => {
    const a = await createCustomWord({ ...input, word: 'alpha', meaningVi: 'a' })
    await db.progress.bulkPut([card(a.id, 3), card('hello', 5), card('goodbye', 1)])
    const { stats } = await loadSelfStudyData(TODAY)
    expect(stats.learned).toBe(1)
    expect(stats.levels).toEqual([0, 0, 1, 0, 0])
    expect(stats.mastered).toBe(0)
  })
})
