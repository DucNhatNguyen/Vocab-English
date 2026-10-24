import { describe, expect, it } from 'vitest'
import { compareCustomWordsNewestFirst, compareCustomWordsOldestFirst } from './customWordOrder.ts'

const w = (id: string, createdAt: string, createdAtMs?: number) => ({ id, createdAt, createdAtMs })

describe('custom word order', () => {
  it('orders by date first', () => {
    const list = [w('b', '2026-10-02', 1), w('a', '2026-10-01', 9)]
    expect(list.sort(compareCustomWordsOldestFirst).map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('orders words of the same day by creation time', () => {
    const list = [w('a', '2026-10-01', 300), w('b', '2026-10-01', 100), w('c', '2026-10-01', 200)]
    expect(list.sort(compareCustomWordsOldestFirst).map((x) => x.id)).toEqual(['b', 'c', 'a'])
    expect(list.sort(compareCustomWordsNewestFirst).map((x) => x.id)).toEqual(['a', 'c', 'b'])
  })

  it('treats a missing time as 0 (older than timestamped words of the same day)', () => {
    const list = [w('z', '2026-10-01', 5), w('y', '2026-10-01')]
    expect(list.sort(compareCustomWordsOldestFirst).map((x) => x.id)).toEqual(['y', 'z'])
  })

  it('falls back to id, giving a total order', () => {
    const list = [w('b', '2026-10-01'), w('a', '2026-10-01')]
    expect(list.sort(compareCustomWordsOldestFirst).map((x) => x.id)).toEqual(['a', 'b'])
    expect(list.sort(compareCustomWordsNewestFirst).map((x) => x.id)).toEqual(['b', 'a'])
    expect(compareCustomWordsOldestFirst(w('a', '2026-10-01'), w('a', '2026-10-01'))).toBe(0)
  })
})
