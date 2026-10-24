import { describe, expect, it } from 'vitest'
import type { Word } from '../data/types.ts'
import { normalizeText, searchWords } from './search.ts'

const w = (word: string, meaningVi: string): Word => ({
  id: word,
  word,
  ipa: '',
  pos: 'noun',
  meaningVi,
  exampleEn: '',
  exampleVi: '',
  level: 'A1',
  topics: [],
})

describe('normalizeText', () => {
  it('strips diacritics and lowercases', () => {
    expect(normalizeText('Kiên Cường')).toBe('kien cuong')
  })

  it('maps đ / Đ explicitly', () => {
    expect(normalizeText('đường')).toBe('duong')
    expect(normalizeText('ĐẸP')).toBe('dep')
    expect(normalizeText('Đà Nẵng')).toBe('da nang')
  })

  it('collapses whitespace and trims', () => {
    expect(normalizeText('  xin   chào \n bạn ')).toBe('xin chao ban')
  })

  it('handles precomposed and decomposed input the same way', () => {
    expect(normalizeText('ế')).toBe('e')
    expect(normalizeText('ế')).toBe('e')
  })

  it('returns an empty string for blank input', () => {
    expect(normalizeText('   ')).toBe('')
  })
})

describe('searchWords', () => {
  const list = [
    w('resilient', 'kiên cường, mau phục hồi'),
    w('cat', 'con mèo'),
    w('category', 'loại, hạng mục'),
    w('educate', 'giáo dục'),
    w('cattle', 'gia súc'),
    w('road', 'con đường'),
    w('bobcat', 'mèo rừng'),
  ]

  it('returns [] for an empty or whitespace query', () => {
    expect(searchWords('', list)).toEqual([])
    expect(searchWords('   ', list)).toEqual([])
  })

  it('finds English -> Vietnamese by headword, case-insensitively', () => {
    expect(searchWords('RESILIENT', list).map((x) => x.id)).toEqual(['resilient'])
  })

  it('finds Vietnamese -> English, ignoring accents', () => {
    expect(searchWords('kien cuong', list).map((x) => x.id)).toEqual(['resilient'])
    expect(searchWords('Kiên Cường', list).map((x) => x.id)).toEqual(['resilient'])
    expect(searchWords('giao duc', list).map((x) => x.id)).toEqual(['educate'])
  })

  it('handles đ in queries and meanings', () => {
    expect(searchWords('duong', list).map((x) => x.id)).toEqual(['road'])
    expect(searchWords('đường', list).map((x) => x.id)).toEqual(['road'])
  })

  it('ranks exact, then prefix, then contains, then meaning matches', () => {
    // "cat": exact cat; prefix category, cattle; contains educate, bobcat (list order)
    expect(searchWords('cat', list).map((x) => x.id)).toEqual([
      'cat',
      'category',
      'cattle',
      'educate',
      'bobcat',
    ])
    // "con": no headword hits; meaning hits cat, road in list order
    expect(searchWords('con', list).map((x) => x.id)).toEqual(['cat', 'road'])
  })

  it('keeps list order within a group', () => {
    const items = [w('apple pie', 'bánh'), w('apple', 'táo'), w('apply', 'nộp đơn')]
    // "apple" is exact for the second item, prefix for the first
    expect(searchWords('app', items).map((x) => x.id)).toEqual(['apple pie', 'apple', 'apply'])
    expect(searchWords('apple', items).map((x) => x.id)).toEqual(['apple', 'apple pie'])
  })

  it('lists headword matches before meaning matches', () => {
    const items = [w('mouse', 'con chuột, con cat'), w('cat', 'con mèo')]
    expect(searchWords('cat', items).map((x) => x.id)).toEqual(['cat', 'mouse'])
  })

  it('finds nothing when nothing matches', () => {
    expect(searchWords('zzz', list)).toEqual([])
  })
})
