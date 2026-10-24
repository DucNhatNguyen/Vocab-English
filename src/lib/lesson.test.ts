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
const custom = (id: string, createdAt: string): CustomWord => ({
  ...word(`custom:${id}`),
  level: 'custom',
  createdAt,
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
  it('puts custom words first, oldest first, then decks in active order', () => {
    const customWords = [custom('new', '2026-10-20'), custom('old', '2026-10-01')]
    expect(select({ customWords })).toEqual([
      'custom:old',
      'custom:new',
      'a1',
      'a2',
      'a3',
      'b1',
      'b2',
    ])
  })

  it('keeps input order for custom words created on the same day', () => {
    const customWords = [custom('x', '2026-10-01'), custom('y', '2026-10-01')]
    expect(select({ customWords, activeDeckIds: [] })).toEqual(['custom:x', 'custom:y'])
  })

  it('stops at the lesson size', () => {
    expect(select({ count: 2 })).toEqual(['a1', 'a2'])
    expect(select({ count: 4, customWords: [custom('c', '2026-10-01')] })).toEqual([
      'custom:c',
      'a1',
      'a2',
      'a3',
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
    expect(select({ progress, customWords, count: 4 })).toEqual([
      'custom:m',
      'a2',
      'a3',
      'b1',
    ])
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
    })
    expect(result).toHaveLength(5)
    expect(result[0].id).toBe('hello')
  })
})
