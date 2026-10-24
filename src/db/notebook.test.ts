import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { words } from '../data/index.ts'
import { createCustomWord } from './customWords.ts'
import { db } from './db.ts'
import { loadNotebookEntries } from './notebook.ts'
import type { CardProgress } from './types.ts'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterAll(() => {
  db.close()
})

const record = (over: Partial<CardProgress> & { wordId: string }): CardProgress => ({
  level: 1,
  dueDate: '2026-10-25',
  correctCount: 0,
  wrongCount: 0,
  favorite: false,
  ignored: false,
  ...over,
})

describe('loadNotebookEntries', () => {
  it('is empty without progress', async () => {
    expect(await loadNotebookEntries()).toEqual([])
  })

  it('returns learned and level-0 favorite words, built-in and custom', async () => {
    const [a, b, c] = words
    const mine = await createCustomWord({
      word: 'mango',
      ipa: '',
      pos: 'noun',
      meaningVi: 'quả xoài',
      exampleEn: '',
      exampleVi: '',
    })
    await db.progress.bulkPut([
      record({ wordId: a.id, level: 3 }),
      record({ wordId: b.id, level: 0, favorite: true, dueDate: undefined }),
      record({ wordId: mine.id, level: 1, ignored: true }),
      record({ wordId: c.id, level: 0, favorite: false, dueDate: undefined }), // neither
    ])

    const entries = await loadNotebookEntries()
    expect(entries.map((e) => e.word.id).sort()).toEqual([a.id, b.id, mine.id].sort())
    const own = entries.find((e) => e.word.id === mine.id)
    expect(own?.word.word).toBe('mango')
    expect(own?.progress.ignored).toBe(true)
  })

  it('skips records whose word no longer exists', async () => {
    await db.progress.put(record({ wordId: 'custom:gone' }))
    await db.progress.put(record({ wordId: 'not-a-built-in-word' }))
    expect(await loadNotebookEntries()).toEqual([])
  })
})
