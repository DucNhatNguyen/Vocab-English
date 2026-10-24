import { describe, expect, it } from 'vitest'
import type { Word } from '../data/types.ts'
import type { CardProgress } from '../db/types.ts'
import {
  buildNotebook,
  countNotebook,
  filterToParam,
  parseFilter,
  reviewStatusLabel,
  type NotebookEntry,
} from './notebook.ts'

const TODAY = '2026-10-24'

const word = (id: string, headword: string, meaningVi: string): Word => ({
  id,
  word: headword,
  ipa: '',
  pos: 'noun',
  level: 'A1',
  topics: [],
  meaningVi,
  exampleEn: '',
  exampleVi: '',
})

const progress = (wordId: string, over: Partial<CardProgress> = {}): CardProgress => ({
  wordId,
  level: 1,
  dueDate: '2026-10-25',
  correctCount: 0,
  wrongCount: 0,
  favorite: false,
  ignored: false,
  ...over,
})

const entry = (
  id: string,
  headword: string,
  meaningVi: string,
  over: Partial<CardProgress> = {},
): NotebookEntry => ({ word: word(id, headword, meaningVi), progress: progress(id, over) })

const entries: NotebookEntry[] = [
  entry('zebra', 'zebra', 'ngựa vằn', { level: 1 }),
  entry('apple', 'apple', 'quả táo', { level: 3, favorite: true }),
  entry('resilient', 'resilient', 'kiên cường', { level: 5 }),
  entry('bird', 'bird', 'con chim', { level: 1, ignored: true }),
  entry('egal', 'égal', 'công bằng', { level: 3 }),
  entry('custom:1', 'Mango', 'quả xoài', { level: 1, favorite: true }),
  entry('wish', 'wish', 'điều ước', { level: 0, favorite: true, dueDate: undefined }),
]

const ids = (view: { items: NotebookEntry[] }) => view.items.map((e) => e.word.id)

describe('buildNotebook', () => {
  it('lists learned words only under "all", sorted by level then headword', () => {
    expect(ids(buildNotebook(entries, 'all', ''))).toEqual([
      'bird',
      'custom:1',
      'zebra',
      'apple',
      'egal',
      'resilient',
    ])
  })

  it('sorts headwords without regard to case or accents', () => {
    const view = buildNotebook(
      [entry('b', 'Banana', 'chuối'), entry('e', 'éclair', 'bánh'), entry('a', 'apple', 'táo')],
      'all',
      '',
    )
    expect(ids(view)).toEqual(['a', 'b', 'e'])
  })

  it('keeps ignored words in the list', () => {
    expect(ids(buildNotebook(entries, 'all', ''))).toContain('bird')
  })

  it('filters by level', () => {
    expect(ids(buildNotebook(entries, 3, ''))).toEqual(['apple', 'egal'])
    expect(ids(buildNotebook(entries, 2, ''))).toEqual([])
  })

  it('shows level-0 favorites only under the favorites filter', () => {
    expect(ids(buildNotebook(entries, 'favorites', ''))).toEqual(['wish', 'custom:1', 'apple'])
    for (const f of ['all', 1, 3, 5] as const) {
      expect(ids(buildNotebook(entries, f, ''))).not.toContain('wish')
    }
  })

  it('combines the filter with an accent-insensitive search', () => {
    expect(ids(buildNotebook(entries, 'all', 'QUA'))).toEqual(['custom:1', 'apple'])
    expect(ids(buildNotebook(entries, 3, 'qua'))).toEqual(['apple'])
    expect(ids(buildNotebook(entries, 'favorites', 'dieu uoc'))).toEqual(['wish'])
    expect(ids(buildNotebook(entries, 5, 'qua'))).toEqual([])
  })

  it('treats a blank query as no search', () => {
    expect(buildNotebook(entries, 'all', '   ').items).toHaveLength(6)
  })

  it('returns counts over the whole notebook, whatever the filter or query', () => {
    const view = buildNotebook(entries, 5, 'zzz')
    expect(view.items).toEqual([])
    expect(view.counts).toEqual({
      all: 6,
      levels: { 1: 3, 2: 0, 3: 2, 4: 0, 5: 1 },
      favorites: 3,
    })
  })

  it('does not mutate its input', () => {
    const copy = [...entries]
    buildNotebook(entries, 'all', '')
    expect(entries).toEqual(copy)
  })
})

describe('countNotebook', () => {
  it('is all zero for an empty notebook', () => {
    expect(countNotebook([])).toEqual({
      all: 0,
      levels: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      favorites: 0,
    })
  })
})

describe('filter URL param', () => {
  it('parses known values and falls back to "all"', () => {
    expect(parseFilter(null)).toBe('all')
    expect(parseFilter('favorites')).toBe('favorites')
    expect(parseFilter('1')).toBe(1)
    expect(parseFilter('5')).toBe(5)
    for (const bad of ['0', '6', '2.5', 'abc', '', '-1']) expect(parseFilter(bad)).toBe('all')
  })

  it('round-trips through filterToParam', () => {
    for (const f of ['all', 'favorites', 1, 2, 3, 4, 5] as const) {
      expect(parseFilter(filterToParam(f))).toBe(f)
    }
    expect(filterToParam('all')).toBeNull()
  })
})

describe('reviewStatusLabel', () => {
  it('shows the next review date in Vietnamese', () => {
    expect(reviewStatusLabel(progress('x', { dueDate: '2026-10-25' }), TODAY)).toBe('Ôn: ngày mai')
    expect(reviewStatusLabel(progress('x', { dueDate: TODAY }), TODAY)).toBe('Ôn: hôm nay')
    expect(reviewStatusLabel(progress('x', { dueDate: '2026-10-27' }), TODAY)).toBe(
      'Ôn: Thứ Ba, 27/10',
    )
  })

  it('treats an overdue card as due today', () => {
    expect(reviewStatusLabel(progress('x', { dueDate: '2026-10-01' }), TODAY)).toBe('Ôn: hôm nay')
  })

  it('says "Không ôn" for an unticked word, whatever its due date', () => {
    expect(reviewStatusLabel(progress('x', { ignored: true }), TODAY)).toBe('Không ôn')
  })

  it('is null at level 0 or without a due date', () => {
    expect(reviewStatusLabel(progress('x', { level: 0, dueDate: undefined }), TODAY)).toBeNull()
    expect(reviewStatusLabel(progress('x', { dueDate: undefined }), TODAY)).toBeNull()
  })
})
