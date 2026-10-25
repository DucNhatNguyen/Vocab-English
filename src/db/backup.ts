import { buildBackup, serializeBackup, type BackupData } from '../lib/backup.ts'
import { db } from './db.ts'
import { getSettings, SETTINGS_KEY } from './settings.ts'

/** Reads all six tables in one consistent snapshot. */
async function readAll(): Promise<BackupData> {
  const tables = [db.progress, db.customWords, db.studyLogs, db.exerciseAttempts, db.exerciseResults, db.settings]
  return db.transaction('r', tables, async () => ({
    progress: await db.progress.toArray(),
    customWords: await db.customWords.toArray(),
    studyLogs: await db.studyLogs.toArray(),
    exerciseAttempts: await db.exerciseAttempts.toArray(),
    exerciseResults: await db.exerciseResults.toArray(),
    settings: await getSettings(),
  }))
}

/** The whole user database as the text of a backup file. */
export async function exportBackup(): Promise<string> {
  return serializeBackup(buildBackup(await readAll()))
}

/**
 * Replaces everything on this device with `data` (already validated by `parseBackup`).
 * All-or-nothing: if any write fails the transaction aborts and the old data stays.
 */
export async function restoreBackup(data: BackupData): Promise<void> {
  const tables = [db.progress, db.customWords, db.studyLogs, db.exerciseAttempts, db.exerciseResults, db.settings]
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((table) => table.clear()))
    await db.progress.bulkAdd(data.progress)
    await db.customWords.bulkAdd(data.customWords)
    await db.studyLogs.bulkAdd(data.studyLogs)
    await db.exerciseAttempts.bulkAdd(data.exerciseAttempts)
    await db.exerciseResults.bulkAdd(data.exerciseResults)
    await db.settings.put({ ...data.settings, key: SETTINGS_KEY })
  })
}
