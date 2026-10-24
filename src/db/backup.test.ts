import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { parseBackup, type BackupData } from '../lib/backup.ts'
import { exportBackup, restoreBackup } from './backup.ts'
import { db } from './db.ts'
import { DEFAULT_SETTINGS, getSettings, updateSettings } from './settings.ts'
import type { CardProgress, CustomWord } from './types.ts'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterAll(() => {
  db.close()
})

const customWord: CustomWord = {
  id: 'custom:11111111-1111-1111-1111-111111111111',
  word: 'serendipity',
  ipa: '',
  pos: 'noun',
  meaningVi: 'sự tình cờ may mắn',
  exampleEn: '',
  exampleVi: '',
  level: 'custom',
  topics: ['custom'],
  createdAt: '2026-10-22',
  createdAtMs: 1_790_000_000_000,
}

function card(wordId: string, patch: Partial<CardProgress> = {}): CardProgress {
  return {
    wordId,
    level: 2,
    dueDate: '2026-10-27',
    learnedAt: '2026-10-23',
    lastReviewedAt: '2026-10-24',
    correctCount: 3,
    wrongCount: 1,
    favorite: false,
    ignored: false,
    ...patch,
  }
}

async function seed() {
  await db.progress.bulkAdd([
    card('hello'),
    card('resilient', { level: 5, favorite: true }),
    card(customWord.id, { ignored: true }),
  ])
  await db.customWords.add(customWord)
  await db.studyLogs.bulkAdd([
    { date: '2026-10-23', newLearned: 5, reviewed: 0, correct: 4, wrong: 1 },
    { date: '2026-10-24', newLearned: 0, reviewed: 6, correct: 5, wrong: 1 },
  ])
  await updateSettings({ dailyGoal: 20, theme: 'dark', reminders: { morning: true, noon: false, evening: true } })
}

async function snapshot() {
  return {
    progress: await db.progress.orderBy('wordId').toArray(),
    customWords: await db.customWords.orderBy('id').toArray(),
    studyLogs: await db.studyLogs.orderBy('id').toArray(),
    settings: await db.settings.toArray(),
  }
}

async function exported(): Promise<BackupData> {
  const result = parseBackup(await exportBackup())
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.data
}

describe('exportBackup', () => {
  it('exports empty tables and default settings on a fresh database', async () => {
    const file = JSON.parse(await exportBackup())
    expect(file).toMatchObject({ app: 'tu-ngay', formatVersion: 1 })
    expect(typeof file.exportedAt).toBe('string')
    expect(file.data).toEqual({ progress: [], customWords: [], studyLogs: [], settings: DEFAULT_SETTINGS })
  })

  it('exports the stored records, settings without their key', async () => {
    await seed()
    const file = JSON.parse(await exportBackup())
    expect(file.data.progress).toHaveLength(3)
    expect(file.data.customWords).toEqual([customWord])
    expect(file.data.studyLogs).toHaveLength(2)
    expect(file.data.settings).toMatchObject({ dailyGoal: 20, theme: 'dark' })
    expect(file.data.settings).not.toHaveProperty('key')
  })
})

describe('round trip', () => {
  it('export, parse and restore gives identical tables', async () => {
    await seed()
    const before = await snapshot()
    const data = await exported()

    await db.progress.clear()
    await db.customWords.clear()
    await db.studyLogs.clear()
    await db.settings.clear()
    await restoreBackup(data)

    expect(await snapshot()).toEqual(before)
  })

  it('replaces data that was added after the backup', async () => {
    await seed()
    const data = await exported()

    await db.progress.put(card('extra'))
    await db.customWords.put({ ...customWord, id: 'custom:extra', word: 'extra' })
    await db.studyLogs.add({ date: '2026-10-25', newLearned: 1, reviewed: 1, correct: 1, wrong: 0 })
    await updateSettings({ dailyGoal: 5, theme: 'light' })
    await restoreBackup(data)

    expect(await db.progress.get('extra')).toBeUndefined()
    expect(await db.customWords.count()).toBe(1)
    expect(await db.studyLogs.count()).toBe(2)
    expect(await getSettings()).toMatchObject({ dailyGoal: 20, theme: 'dark' })
  })

  it('restores into an empty database, and new logs keep getting fresh ids', async () => {
    await seed()
    const data = await exported()
    await db.delete()
    await db.open()
    await restoreBackup(data)
    expect(await db.progress.count()).toBe(3)
    const id = await db.studyLogs.add({ date: '2026-10-26', newLearned: 0, reviewed: 0, correct: 0, wrong: 0 })
    expect(id).toBeGreaterThan(2)
  })

  it('restoring an empty backup clears everything', async () => {
    await seed()
    await restoreBackup({ progress: [], customWords: [], studyLogs: [], settings: { ...DEFAULT_SETTINGS } })
    expect(await db.progress.count()).toBe(0)
    expect(await db.customWords.count()).toBe(0)
    expect(await db.studyLogs.count()).toBe(0)
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS)
  })
})

describe('failures leave the database untouched', () => {
  it('rejected files never reach the database', async () => {
    await seed()
    const before = await snapshot()
    for (const text of ['nope', JSON.stringify({ app: 'x' }), JSON.stringify({ app: 'tu-ngay', formatVersion: 9 })]) {
      expect(parseBackup(text).ok).toBe(false)
    }
    expect(await snapshot()).toEqual(before)
  })

  it('rolls the whole restore back when a write fails midway', async () => {
    await seed()
    const before = await snapshot()
    const data = await exported()
    // Bypasses parseBackup on purpose: a duplicate log date violates the unique index, and by
    // then progress and customWords have already been cleared and refilled.
    const broken: BackupData = {
      ...data,
      progress: [card('only-new')],
      studyLogs: [
        { date: '2026-11-01', newLearned: 0, reviewed: 0, correct: 0, wrong: 0 },
        { date: '2026-11-01', newLearned: 1, reviewed: 0, correct: 0, wrong: 0 },
      ],
    }
    await expect(restoreBackup(broken)).rejects.toThrow()
    expect(await snapshot()).toEqual(before)
  })
})
