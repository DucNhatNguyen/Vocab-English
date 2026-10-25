import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { db, TuNgayDB } from './db.ts'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterAll(() => {
  db.close()
})

describe('database schema', () => {
  it('is named tu-ngay at version 2 with the expected tables', () => {
    expect(db.name).toBe('tu-ngay')
    expect(db.verno).toBe(2)
    expect(db.tables.map((t) => t.name).sort()).toEqual([
      'customWords',
      'exerciseAttempts',
      'exerciseResults',
      'progress',
      'settings',
      'studyLogs',
    ])
  })

  it('upgrades a version-1 database to version 2 and keeps its data', async () => {
    const name = 'tu-ngay-upgrade-test'
    await Dexie.delete(name)
    const v1 = new Dexie(name)
    v1.version(1).stores({
      progress: 'wordId, level, dueDate',
      customWords: 'id, word, createdAt',
      studyLogs: '++id, &date',
      settings: 'key',
    })
    await v1.open()
    const base = { correctCount: 2, wrongCount: 1, favorite: true, ignored: false }
    await v1.table('progress').put({ ...base, wordId: 'hello', level: 2, dueDate: '2026-10-27' })
    await v1.table('studyLogs').add({ date: '2026-10-24', newLearned: 5, reviewed: 0, correct: 4, wrong: 1 })
    await v1.table('settings').put({ key: 'app', dailyGoal: 20 })
    v1.close()

    const upgraded = new TuNgayDB(name)
    try {
      await upgraded.open()
      expect(upgraded.verno).toBe(2)
      expect(await upgraded.progress.get('hello')).toMatchObject({ level: 2, dueDate: '2026-10-27', favorite: true })
      expect(await upgraded.progress.where('level').equals(2).count()).toBe(1)
      expect(await upgraded.studyLogs.count()).toBe(1)
      expect(await upgraded.settings.get('app')).toMatchObject({ dailyGoal: 20 })
      expect(await upgraded.exerciseAttempts.count()).toBe(0)
      expect(await upgraded.exerciseResults.count()).toBe(0)

      await upgraded.exerciseResults.put({
        questionId: 'pt01-q1',
        setId: 'practice-test-01',
        value: 1,
        correct: true,
        answeredAt: '2026-10-25T08:00:00.000Z',
      })
      expect(await upgraded.exerciseResults.where('setId').equals('practice-test-01').count()).toBe(1)
    } finally {
      upgraded.close()
      await Dexie.delete(name)
    }
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
