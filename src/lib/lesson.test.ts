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

const DECKS: Record<string, Word[]> = {
  a: ['a1', 'a2', 'a3'].map(word),
  b: ['b1', 'b2', 'a2'].map(word), // a2 is in both decks
}
const getDeckWords = (id: string) => DECKS[id] ?? []

const select = (over: Partial<Parameters<typeof selectLessonWords>[0]> = {}) =>
  selectLessonWords({
    count: 10,
    customWords: [],
    activeDeckIds: ['a', 'b'],
    progress: new Map(),
    source: 'decks',
    getDeckWords,
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
  it('decks: only deck words, in active order, never own words', () => {
    const customWords = [custom('x', '2026-10-02'), custom('y', '2026-10-01')]
    expect(select({ customWords })).toEqual(['a1', 'a2', 'a3', 'b1', 'b2'])
  })

  it('mine: only own words, oldest first, never deck words', () => {
    const customWords = [custom('x', '2026-10-02'), custom('y', '2026-10-01')]
    expect(select({ source: 'mine', customWords })).toEqual(['custom:y', 'custom:x'])
  })

  it('mine: respects the count and skips learned own words', () => {
    const customWords = [custom('x', '2026-10-01'), custom('y', '2026-10-02'), custom('z', '2026-10-03')]
    const progress = new Map([['custom:x', prog('custom:x', 1)]])
    expect(select({ source: 'mine', customWords, progress, count: 1 })).toEqual(['custom:y'])
  })

  it('orders custom words created on the same day by creation time, then id', () => {
    const customWords = [
      custom('late', '2026-10-01', 2000),
      custom('early', '2026-10-01', 1000),
      custom('old-b', '2026-10-01'),
      custom('old-a', '2026-10-01'),
    ]
    expect(select({ source: 'mine', customWords })).toEqual([
      'custom:old-a',
      'custom:old-b',
      'custom:early',
      'custom:late',
    ])
  })

  it('stops at the lesson size', () => {
    expect(select({ count: 2 })).toEqual(['a1', 'a2'])
    expect(select({ count: 4, customWords: [custom('c', '2026-10-01')] })).toEqual([
      'a1',
      'a2',
      'a3',
      'b1',
    ])
  })

  it('fills from the next deck when the first has too few unlearned words', () => {
    const progress = new Map([prog('a1', 2), prog('a2', 1)].map((p) => [p.wordId, p]))
    expect(select({ count: 3, progress })).toEqual(['a3', 'b1', 'b2'])
  })

  it('skips learned words but keeps level-0 (favorite only) ones', () => {
    const progress = new Map(
      [prog('a1', 3), prog('a2', 0, true), prog('custom:k', 1)].map((p) => [p.wordId, p]),
    )
    const customWords = [custom('k', '2026-10-01'), custom('m', '2026-10-02')]
    expect(select({ progress, customWords, count: 4 })).toEqual(['a2', 'a3', 'b1', 'b2'])
    expect(select({ progress, customWords, source: 'mine' })).toEqual(['custom:m'])
  })

  it('skips unknown deck ids and dedupes words shared by decks', () => {
    expect(select({ activeDeckIds: ['nope', 'b', 'a', 'b'] })).toEqual([
      'b1',
      'b2',
      'a2',
      'a1',
      'a3',
    ])
  })

  it('returns a shorter lesson when fewer words are available', () => {
    expect(select({ count: 20 })).toHaveLength(5)
  })

  it('returns nothing when everything is learned, no deck is active, or count is not positive', () => {
    const all = new Map(['a1', 'a2', 'a3', 'b1', 'b2'].map((id) => [id, prog(id, 1)]))
    expect(select({ progress: all })).toEqual([])
    expect(select({ activeDeckIds: [] })).toEqual([])
    expect(select({ count: 0 })).toEqual([])
    expect(select({ count: -3 })).toEqual([])
  })

  it('does not mutate its inputs', () => {
    const customWords = [custom('b', '2026-10-05'), custom('a', '2026-10-01')]
    select({ customWords })
    expect(customWords.map((w) => w.id)).toEqual(['custom:b', 'custom:a'])
  })

  it('works with the built-in data by default', () => {
    const result = selectLessonWords({
      count: 5,
      customWords: [],
      activeDeckIds: ['giao-tiep-hang-ngay'],
      progress: new Map(),
      source: 'decks',
    })
    expect(result).toHaveLength(5)
    expect(result[0].id).toBe('hello')
  })
})
