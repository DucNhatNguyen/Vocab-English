import { describe, expect, it } from 'vitest'
import type { CardProgress } from '../db/types.ts'
import {
  INTERVAL_DAYS,
  MAX_LEVEL,
  dueDateFor,
  isDue,
  learnCard,
  nextLevel,
  reviewCard,
} from './srs.ts'
import type { SrsLevel } from './srs.ts'

const TODAY = '2026-10-24'
const LEVELS: SrsLevel[] = [1, 2, 3, 4, 5]

function card(overrides: Partial<CardProgress> = {}): CardProgress {
  return {
    wordId: 'w1',
    level: 2,
    dueDate: '2026-10-24',
    learnedAt: '2026-10-10',
    lastReviewedAt: '2026-10-21',
    correctCount: 3,
    wrongCount: 1,
    favorite: false,
    ignored: false,
    ...overrides,
  }
}

describe('constants', () => {
  it('matches the spec', () => {
    expect(INTERVAL_DAYS).toEqual({ 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 })
    expect(MAX_LEVEL).toBe(5)
  })
})

describe('nextLevel', () => {
  it.each([
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 5],
  ] as const)('correct answer: level %i -> %i', (from, to) => {
    expect(nextLevel(from, true)).toBe(to)
  })

  it.each(LEVELS)('wrong answer from level %i -> 1', (level) => {
    expect(nextLevel(level, false)).toBe(1)
  })
})

describe('dueDateFor', () => {
  it.each([
    [1, '2026-10-25'],
    [2, '2026-10-27'],
    [3, '2026-10-31'],
    [4, '2026-11-07'],
    [5, '2026-11-23'],
  ] as const)('level %i is due on %s', (level, due) => {
    expect(dueDateFor(level, TODAY)).toBe(due)
  })

  it('crosses the year end and leap day', () => {
    expect(dueDateFor(5, '2026-12-15')).toBe('2027-01-14')
    expect(dueDateFor(1, '2028-02-28')).toBe('2028-02-29')
  })
})

describe('learnCard', () => {
  it('creates a level 1 record from nothing', () => {
    expect(learnCard(undefined, 'w1', TODAY)).toEqual({
      wordId: 'w1',
      level: 1,
      dueDate: '2026-10-25',
      learnedAt: TODAY,
      correctCount: 0,
      wrongCount: 0,
      favorite: false,
      ignored: false,
    })
  })

  it('keeps favorite/ignored/counts of an existing level 0 record', () => {
    const existing = card({
      level: 0,
      dueDate: undefined,
      learnedAt: undefined,
      lastReviewedAt: undefined,
      correctCount: 0,
      wrongCount: 0,
      favorite: true,
      ignored: true,
    })
    const result = learnCard(existing, 'w1', TODAY)
    expect(result).toMatchObject({
      wordId: 'w1',
      level: 1,
      dueDate: '2026-10-25',
      learnedAt: TODAY,
      favorite: true,
      ignored: true,
      correctCount: 0,
      wrongCount: 0,
    })
    expect(existing.level).toBe(0)
  })

  it('returns an already learned record unchanged', () => {
    const learned = card({ level: 3 })
    expect(learnCard(learned, 'w1', '2026-12-01')).toBe(learned)
    expect(learned).toEqual(card({ level: 3 }))
  })
})

describe('reviewCard', () => {
  it.each([
    [1, 2, '2026-10-27'],
    [2, 3, '2026-10-31'],
    [3, 4, '2026-11-07'],
    [4, 5, '2026-11-23'],
    [5, 5, '2026-11-23'],
  ] as const)('correct from level %i -> level %i due %s', (from, to, due) => {
    const result = reviewCard(card({ level: from }), true, TODAY)
    expect(result.level).toBe(to)
    expect(result.dueDate).toBe(due)
  })

  it.each(LEVELS)('wrong from level %i -> level 1 due tomorrow', (level) => {
    const result = reviewCard(card({ level }), false, TODAY)
    expect(result.level).toBe(1)
    expect(result.dueDate).toBe('2026-10-25')
  })

  it('updates lastReviewedAt and increments only the matching counter', () => {
    const right = reviewCard(card(), true, TODAY)
    expect(right.lastReviewedAt).toBe(TODAY)
    expect(right.correctCount).toBe(4)
    expect(right.wrongCount).toBe(1)

    const wrong = reviewCard(card(), false, TODAY)
    expect(wrong.lastReviewedAt).toBe(TODAY)
    expect(wrong.correctCount).toBe(3)
    expect(wrong.wrongCount).toBe(2)
  })

  it('preserves wordId, learnedAt, favorite and ignored', () => {
    const result = reviewCard(card({ favorite: true, ignored: true }), true, TODAY)
    expect(result.wordId).toBe('w1')
    expect(result.learnedAt).toBe('2026-10-10')
    expect(result.favorite).toBe(true)
    expect(result.ignored).toBe(true)
  })

  it('does not penalise overdue reviews', () => {
    const onTime = reviewCard(card({ level: 3, dueDate: TODAY }), true, TODAY)
    const veryLate = reviewCard(card({ level: 3, dueDate: '2026-06-01' }), true, TODAY)
    expect(veryLate).toEqual(onTime)
    expect(veryLate.level).toBe(4)
    expect(veryLate.dueDate).toBe('2026-11-07')
  })

  it('throws RangeError for an unlearned (level 0) card', () => {
    expect(() => reviewCard(card({ level: 0, dueDate: undefined }), true, TODAY)).toThrow(
      RangeError,
    )
  })
})

describe('isDue', () => {
  it('is due today', () => {
    expect(isDue(card({ dueDate: TODAY }), TODAY)).toBe(true)
  })

  it('is due when overdue', () => {
    expect(isDue(card({ dueDate: '2026-10-01' }), TODAY)).toBe(true)
  })

  it('is not due in the future', () => {
    expect(isDue(card({ dueDate: '2026-10-25' }), TODAY)).toBe(false)
  })

  it('is never due when ignored', () => {
    expect(isDue(card({ dueDate: '2026-10-01', ignored: true }), TODAY)).toBe(false)
  })

  it('is never due at level 0', () => {
    expect(isDue(card({ level: 0, dueDate: undefined }), TODAY)).toBe(false)
    expect(isDue(card({ level: 0, dueDate: '2026-10-01' }), TODAY)).toBe(false)
  })

  it('is not due without a dueDate', () => {
    expect(isDue(card({ dueDate: undefined }), TODAY)).toBe(false)
  })
})

describe('immutability', () => {
  it('never mutates its inputs', () => {
    const original = card({ level: 2 })
    const snapshot = structuredClone(original)
    reviewCard(original, true, TODAY)
    reviewCard(original, false, TODAY)
    isDue(original, TODAY)
    expect(original).toEqual(snapshot)

    const level0 = card({ level: 0, dueDate: undefined, favorite: true })
    const level0Snapshot = structuredClone(level0)
    const learned = learnCard(level0, 'w1', TODAY)
    expect(level0).toEqual(level0Snapshot)
    expect(learned).not.toBe(level0)
  })

  it('returns new objects from reviewCard', () => {
    const original = card()
    expect(reviewCard(original, true, TODAY)).not.toBe(original)
  })
})
