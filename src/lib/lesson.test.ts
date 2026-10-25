import { describe, expect, it } from 'vitest'
import type { Word } from '../data/types.ts'
import type { CardProgress, CustomWord } from '../db/types.ts'
import { isUnlearned, selectLessonWords } from './lesson.ts'

const word = (id: string): Word => ({
  id,
  word: id,
  ipa: '',
  pos: 'noun',
  meaningVi: `nghĩa ${id}`,
  exampleEn: '',
  exampleVi: '',
  level: 'A1',
  topics: [],
})
const custom = (id: string, createdAt: string, createdAtMs?: number): CustomWord => ({
  ...word(`custom:${id}`),
  level: 'custom',
  createdAt,
  ...(createdAtMs === undefined ? {} : { createdAtMs }),
})
const prog = (wordId: string, level: CardProgress['level'], favorite = false): CardProgress => ({
  wordId,
  level,
  correctCount: 0,
  wrongCount: 0,
  favorite,
  ignored: false,
})

const select = (over: Partial<Parameters<typeof selectLessonWords>[0]> = {}) =>
  selectLessonWords({
    count: 10,
    customWords: [],
    progress: new Map(),
    ...over,
  }).map((w) => w.id)

describe('isUnlearned', () => {
  it('treats a missing or level-0 record as unlearned', () => {
    expect(isUnlearned(undefined)).toBe(true)
    expect(isUnlearned(prog('x', 0, true))).toBe(true)
    expect(isUnlearned(prog('x', 1))).toBe(false)
    expect(isUnlearned(prog('x', 5))).toBe(false)
  })
})

describe('selectLessonWords', () => {
  it('returns unlearned own words, oldest first', () => {
    const customWords = [custom('x', '2026-10-02'), custom('y', '2026-10-01')]
    expect(select({ customWords })).toEqual(['custom:y', 'custom:x'])
  })

  it('respects the count and skips learned own words', () => {
    const customWords = [custom('x', '2026-10-01'), custom('y', '2026-10-02'), custom('z', '2026-10-03')]
    const progress = new Map([['custom:x', prog('custom:x', 1)]])
    expect(select({ customWords, progress, count: 1 })).toEqual(['custom:y'])
  })

  it('keeps level-0 (favorite only) words as unlearned', () => {
    const customWords = [custom('k', '2026-10-01'), custom('m', '2026-10-02')]
    const progress = new Map([['custom:k', prog('custom:k', 0, true)]])
    expect(select({ customWords, progress })).toEqual(['custom:k', 'custom:m'])
  })

  it('orders custom words created on the same day by creation time, then id', () => {
    const customWords = [
      custom('late', '2026-10-01', 2000),
      custom('early', '2026-10-01', 1000),
      custom('old-b', '2026-10-01'),
      custom('old-a', '2026-10-01'),
    ]
    expect(select({ customWords })).toEqual([
      'custom:old-a',
      'custom:old-b',
      'custom:early',
      'custom:late',
    ])
  })

  it('returns a shorter lesson when fewer words are available', () => {
    expect(select({ count: 20, customWords: [custom('a', '2026-10-01')] })).toEqual(['custom:a'])
  })

  it('returns nothing without own words, when all are learned, or when count is not positive', () => {
    const customWords = [custom('a', '2026-10-01')]
    expect(select()).toEqual([])
    expect(select({ customWords, progress: new Map([['custom:a', prog('custom:a', 2)]]) })).toEqual([])
    expect(select({ customWords, count: 0 })).toEqual([])
    expect(select({ customWords, count: -3 })).toEqual([])
  })

  it('does not mutate its inputs', () => {
    const customWords = [custom('b', '2026-10-05'), custom('a', '2026-10-01')]
    select({ customWords })
    expect(customWords.map((w) => w.id)).toEqual(['custom:b', 'custom:a'])
  })
})
