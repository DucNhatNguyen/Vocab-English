import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createCustomWord } from './customWords.ts'
import { db } from './db.ts'
import { getWordById, getWordsByIds, isCustomWordId } from './words.ts'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterAll(() => {
  db.close()
})

const newCustom = () =>
  createCustomWord({
    word: 'serendipity',
    ipa: '',
    pos: 'noun',
    meaningVi: 'sự tình cờ may mắn',
    exampleEn: '',
    exampleVi: '',
  })

describe('word resolver', () => {
  it('recognises custom ids by prefix', () => {
    expect(isCustomWordId('custom:abc')).toBe(true)
    expect(isCustomWordId('hello')).toBe(false)
  })

  it('resolves built-in and custom words', async () => {
    const mine = await newCustom()
    expect((await getWordById('hello'))?.word).toBe('hello')
    expect((await getWordById(mine.id))?.word).toBe('serendipity')
  })

  it('resolves to undefined for unknown ids', async () => {
    expect(await getWordById('no-such-word')).toBeUndefined()
    expect(await getWordById('custom:missing')).toBeUndefined()
  })

  it('resolves many ids in order and drops missing ones', async () => {
    const mine = await newCustom()
    const result = await getWordsByIds([mine.id, 'gone', 'hello', 'custom:gone'])
    expect(result.map((w) => w.word)).toEqual(['serendipity', 'hello'])
  })
})
