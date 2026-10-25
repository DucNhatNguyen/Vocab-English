import { describe, expect, it } from 'vitest'
import type { CardProgress } from '../db/types.ts'
import { countNewToday, filterCardsBySource, isSelfStudySearch } from './studySource.ts'

const card = (wordId: string, over: Partial<CardProgress> = {}): CardProgress => ({
  wordId,
  level: 1,
  correctCount: 0,
  wrongCount: 0,
  favorite: false,
  ignored: false,
  ...over,
})

describe('isSelfStudySearch', () => {
  it('detects ?nguon=tu-hoc among other params', () => {
    expect(isSelfStudySearch('?nguon=tu-hoc')).toBe(true)
    expect(isSelfStudySearch('?a=1&nguon=tu-hoc')).toBe(true)
  })
  it('is false without it or with another value', () => {
    expect(isSelfStudySearch('')).toBe(false)
    expect(isSelfStudySearch('?nguon=bo-tu')).toBe(false)
  })
})

describe('filterCardsBySource', () => {
  const cards = [card('hello'), card('custom:a'), card('please'), card('custom:b')]
  it('keeps only own words for mine, only built-in words for decks, everything for all', () => {
    expect(filterCardsBySource(cards, 'mine').map((c) => c.wordId)).toEqual(['custom:a', 'custom:b'])
    expect(filterCardsBySource(cards, 'decks').map((c) => c.wordId)).toEqual(['hello', 'please'])
    expect(filterCardsBySource(cards, 'all')).toHaveLength(4)
  })
})

describe('countNewToday', () => {
  const today = '2026-10-25'
  const cards = [
    card('hello', { learnedAt: today }),
    card('custom:a', { learnedAt: today }),
    card('please', { learnedAt: '2026-10-24' }),
    card('thanks', { level: 0 }),
  ]
  it('counts cards first learned today, by source', () => {
    expect(countNewToday(cards, today, 'decks')).toBe(1)
    expect(countNewToday(cards, today, 'mine')).toBe(1)
    expect(countNewToday(cards, today, 'all')).toBe(2)
  })
})
