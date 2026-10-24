import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  createCustomWord,
  deleteCustomWord,
  findCustomWordByHeadword,
  updateCustomWord,
  type CustomWordInput,
} from './customWords.ts'
import { db } from './db.ts'
import { toLocalDateString } from '../lib/date.ts'

const input: CustomWordInput = {
  word: '  Serendipity ',
  ipa: '/ˌserənˈdɪpət̬i/',
  pos: 'noun',
  meaningVi: 'sự tình cờ may mắn',
  exampleEn: 'Finding this cafe was pure serendipity.',
  exampleVi: 'Tìm thấy quán cà phê này hoàn toàn là sự tình cờ may mắn.',
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterAll(() => {
  db.close()
})

describe('custom words', () => {
  it('creates a word with a custom: id and a local createdAt', async () => {
    const created = await createCustomWord(input)
    expect(created.id).toMatch(/^custom:[0-9a-f-]{36}$/)
    expect(created.word).toBe('Serendipity')
    expect(created.createdAt).toBe(toLocalDateString())
    expect(created.createdAtMs).toBeTypeOf('number')
    expect(await db.customWords.get(created.id)).toEqual(created)
  })

  it('keeps createdAtMs when a word is updated', async () => {
    const created = await createCustomWord(input)
    const updated = await updateCustomWord(created.id, { meaningVi: 'x' })
    expect(updated?.createdAtMs).toBe(created.createdAtMs)
  })

  it('generates distinct ids', async () => {
    const a = await createCustomWord(input)
    const b = await createCustomWord({ ...input, word: 'other' })
    expect(a.id).not.toBe(b.id)
  })

  it('finds duplicates by headword, case-insensitively and trimmed', async () => {
    const created = await createCustomWord(input)
    expect((await findCustomWordByHeadword('serendipity'))?.id).toBe(created.id)
    expect((await findCustomWordByHeadword('  SERENDIPITY  '))?.id).toBe(created.id)
    expect(await findCustomWordByHeadword('serendipitous')).toBeUndefined()
    expect(await findCustomWordByHeadword('   ')).toBeUndefined()
  })

  it('updates fields and returns the updated word', async () => {
    const created = await createCustomWord(input)
    const updated = await updateCustomWord(created.id, { meaningVi: 'tình cờ may mắn', word: ' Serendipity2 ' })
    expect(updated?.meaningVi).toBe('tình cờ may mắn')
    expect(updated?.word).toBe('Serendipity2')
    expect(updated?.id).toBe(created.id)
    expect(updated?.createdAt).toBe(created.createdAt)
    expect((await findCustomWordByHeadword('serendipity2'))?.id).toBe(created.id)
    expect(await findCustomWordByHeadword('serendipity')).toBeUndefined()
  })

  it('removes the emoji when it is updated to undefined (edit form clears it)', async () => {
    const created = await createCustomWord({ ...input, emoji: '🥭' })
    const updated = await updateCustomWord(created.id, { emoji: undefined })
    expect(updated?.emoji).toBeUndefined()
    expect(updated).not.toHaveProperty('emoji')
    expect((await db.customWords.get(created.id))?.emoji).toBeUndefined()
  })

  it('returns undefined when updating a missing word', async () => {
    expect(await updateCustomWord('custom:missing', { meaningVi: 'x' })).toBeUndefined()
  })

  it('deletes the word together with its progress record', async () => {
    const created = await createCustomWord(input)
    const keep = await createCustomWord({ ...input, word: 'keep' })
    for (const id of [created.id, keep.id]) {
      await db.progress.put({
        wordId: id,
        level: 1,
        dueDate: '2026-10-25',
        correctCount: 0,
        wrongCount: 0,
        favorite: false,
        ignored: false,
      })
    }

    await deleteCustomWord(created.id)

    expect(await db.customWords.get(created.id)).toBeUndefined()
    expect(await db.progress.get(created.id)).toBeUndefined()
    expect(await db.customWords.get(keep.id)).toBeDefined()
    expect(await db.progress.get(keep.id)).toBeDefined()
  })

  it('deleting a word without progress does not throw', async () => {
    const created = await createCustomWord(input)
    await expect(deleteCustomWord(created.id)).resolves.toBeUndefined()
  })
})
