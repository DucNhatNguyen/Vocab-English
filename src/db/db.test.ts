import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from './db.ts'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterAll(() => {
  db.close()
})

describe('database schema', () => {
  it('is named tu-ngay at version 1 with the expected tables', () => {
    expect(db.name).toBe('tu-ngay')
    expect(db.verno).toBe(1)
    expect(db.tables.map((t) => t.name).sort()).toEqual(['customWords', 'progress', 'settings', 'studyLogs'])
  })

  it('indexes level and dueDate on progress, and never booleans', () => {
    const { primKey, indexes } = db.progress.schema
    expect(primKey.name).toBe('wordId')
    expect(indexes.map((i) => i.name).sort()).toEqual(['dueDate', 'level'])
  })

  it('queries progress by level and dueDate', async () => {
    const base = { correctCount: 0, wrongCount: 0, favorite: false, ignored: false }
    await db.progress.bulkPut([
      { ...base, wordId: 'a', level: 1, dueDate: '2026-10-24' },
      { ...base, wordId: 'b', level: 2, dueDate: '2026-10-26' },
      { ...base, wordId: 'c', level: 0, favorite: true },
    ])
    expect((await db.progress.where('level').equals(2).toArray()).map((p) => p.wordId)).toEqual(['b'])
    expect((await db.progress.where('dueDate').belowOrEqual('2026-10-24').toArray()).map((p) => p.wordId)).toEqual(['a'])
    expect((await db.progress.toArray()).filter((p) => p.favorite).map((p) => p.wordId)).toEqual(['c'])
  })

  it('auto-increments studyLogs ids and enforces unique dates', async () => {
    const log = { date: '2026-10-24', newLearned: 5, reviewed: 0, correct: 0, wrong: 0 }
    const id = await db.studyLogs.add(log)
    expect(typeof id).toBe('number')
    await expect(db.studyLogs.add({ ...log })).rejects.toThrow()
    expect(await db.studyLogs.where('date').equals('2026-10-24').count()).toBe(1)
  })
})
