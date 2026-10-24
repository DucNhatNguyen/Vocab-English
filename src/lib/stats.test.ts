import { describe, expect, it } from 'vitest'
import type { CardProgress, StudyLog } from '../db/types.ts'
import { computeStats, formatAccuracy } from './stats.ts'

const TODAY = '2026-10-24'

const card = (wordId: string, level: CardProgress['level'], ignored = false): CardProgress => ({
  wordId,
  level,
  correctCount: 0,
  wrongCount: 0,
  favorite: false,
  ignored,
})
const log = (date: string, over: Partial<StudyLog> = {}): StudyLog => ({
  date,
  newLearned: 0,
  reviewed: 0,
  correct: 0,
  wrong: 0,
  ...over,
})

describe('computeStats', () => {
  it('is all zero for a brand-new user', () => {
    const s = computeStats([], [], TODAY, 10)
    expect(s.levels).toEqual([0, 0, 0, 0, 0])
    expect(s.learned).toBe(0)
    expect(s.mastered).toBe(0)
    expect(s.accuracy).toBeNull()
    expect(s.streak).toEqual({ current: 0, longest: 0, todayDone: false })
    expect(s.today).toEqual({ newLearned: 0, reviewed: 0, goal: 10 })
    expect(s.recent).toHaveLength(7)
  })

  it('counts learned cards per level, ignored ones included, and skips level 0', () => {
    const progress = [
      card('a', 1),
      card('b', 1),
      card('c', 2, true),
      card('d', 3),
      card('e', 5),
      card('f', 5, true),
      card('g', 0),
    ]
    const s = computeStats(progress, [], TODAY, 5)
    expect(s.levels).toEqual([2, 1, 1, 0, 2])
    expect(s.learned).toBe(6)
    expect(s.ignored).toBe(2)
    expect(s.mastered).toBe(2)
  })

  it('computes accuracy over all logs', () => {
    const logs = [log('2026-10-22', { correct: 6, wrong: 2 }), log(TODAY, { correct: 1, wrong: 1 })]
    const s = computeStats([], logs, TODAY, 10)
    expect(s.correctTotal).toBe(7)
    expect(s.wrongTotal).toBe(3)
    expect(s.accuracy).toBeCloseTo(0.7)
  })

  it('has no accuracy while only lessons (no review answers) were done', () => {
    expect(computeStats([], [log(TODAY, { newLearned: 10 })], TODAY, 10).accuracy).toBeNull()
  })

  it('reports today progress from today log only', () => {
    const logs = [
      log('2026-10-23', { newLearned: 10, reviewed: 20 }),
      log(TODAY, { newLearned: 5, reviewed: 3, correct: 2, wrong: 1 }),
    ]
    const s = computeStats([], logs, TODAY, 20)
    expect(s.today).toEqual({ newLearned: 5, reviewed: 3, goal: 20 })
    expect(s.streak).toEqual({ current: 2, longest: 2, todayDone: true })
    expect(s.recent.at(-1)).toEqual({ date: TODAY, studied: true })
  })
})

describe('formatAccuracy', () => {
  it('rounds to a percent and shows a dash when unknown', () => {
    expect(formatAccuracy(null)).toBe('—')
    expect(formatAccuracy(0)).toBe('0%')
    expect(formatAccuracy(0.8333)).toBe('83%')
    expect(formatAccuracy(1)).toBe('100%')
  })
})
