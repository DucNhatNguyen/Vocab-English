import { buildBackup, serializeBackup, type BackupData } from '../lib/backup.ts'
import { db } from './db.ts'
import { getSettings, SETTINGS_KEY } from './settings.ts'

/** Reads all four tables in one consistent snapshot. */
async function readAll(): Promise<BackupData> {
  return db.transaction('r', db.progress, db.customWords, db.studyLogs, db.settings, async () => ({
    progress: await db.progress.toArray(),
    customWords: await db.customWords.toArray(),
    studyLogs: await db.studyLogs.toArray(),
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
  await db.transaction('rw', db.progress, db.customWords, db.studyLogs, db.settings, async () => {
    await Promise.all([db.progress.clear(), db.customWords.clear(), db.studyLogs.clear(), db.settings.clear()])
    await db.progress.bulkAdd(data.progress)
    await db.customWords.bulkAdd(data.customWords)
    await db.studyLogs.bulkAdd(data.studyLogs)
    await db.settings.put({ ...data.settings, key: SETTINGS_KEY })
  })
}
