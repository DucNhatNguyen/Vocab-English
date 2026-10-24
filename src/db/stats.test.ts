import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createCustomWord } from './customWords.ts'
import { db } from './db.ts'
import { updateSettings } from './settings.ts'
import { loadHomeData, loadStats } from './stats.ts'
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

  it('aggregates progress, logs and the daily goal, skipping cards of deleted words', async () => {
    await updateSettings({ dailyGoal: 5 })
    const mine = await createCustomWord({
      word: 'mine',
      ipa: '',
      pos: 'noun',
      meaningVi: 'của tôi',
      exampleEn: '',
      exampleVi: '',
    })
    await db.progress.bulkPut([
      card('hello', 1),
      card('goodbye', 3, { ignored: true }),
      card('airport', 5),
      card('not-a-word', 2), // word no longer exists
      card('ticket', 0, { favorite: true }),
      card(mine.id, 5),
    ])
    await db.studyLogs.bulkAdd([
      log('2026-10-23', { newLearned: 4, reviewed: 4, correct: 3, wrong: 1 }),
      log(TODAY, { newLearned: 2, reviewed: 1, correct: 1 }),
    ])

    const { stats } = await loadStats(TODAY)
    expect(stats.levels).toEqual([1, 0, 1, 0, 2])
    expect(stats.learned).toBe(4)
    expect(stats.ignored).toBe(1)
    expect(stats.mastered).toBe(2)
    expect(stats.accuracy).toBeCloseTo(0.8)
    expect(stats.streak).toEqual({ current: 2, longest: 2, todayDone: true })
    expect(stats.today).toEqual({ newLearned: 2, reviewed: 1, goal: 5 })
  })
})

describe('loadHomeData', () => {
  it('reports the next lesson size, due reviews and the next review day', async () => {
    await updateSettings({ dailyGoal: 5, activeDeckIds: ['giao-tiep-hang-ngay'] })
    await db.progress.bulkPut([
      card('hello', 1, { dueDate: TODAY }),
      card('goodbye', 2, { dueDate: '2026-10-27' }),
      card('please', 2, { dueDate: '2026-10-27' }),
    ])
    const data = await loadHomeData(TODAY)
    expect(data.lessonCount).toBe(5)
    expect(data.hasActiveDecks).toBe(true)
    expect(data.overview.dueCount).toBe(1)
    expect(data.overview.next).toEqual({ date: '2026-10-27', count: 2 })
    expect(data.stats.learned).toBe(3)
  })

  it('has no lesson when no deck is active, or when everything is learned', async () => {
    await updateSettings({ activeDeckIds: [] })
    expect(await loadHomeData(TODAY)).toMatchObject({ lessonCount: 0, hasActiveDecks: false })

    await updateSettings({ activeDeckIds: ['giao-tiep-hang-ngay'], dailyGoal: 20 })
    const all = (await import('../data/index.ts')).getDeckWords('giao-tiep-hang-ngay')
    await db.progress.bulkPut(all.map((w) => card(w.id, 1, { dueDate: '2026-10-30' })))
    const data = await loadHomeData(TODAY)
    expect(data).toMatchObject({ lessonCount: 0, hasActiveDecks: true })
    expect(data.overview.dueCount).toBe(0)
  })
})
