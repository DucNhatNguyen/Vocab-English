import Dexie, { type Table } from 'dexie'
import type { CardProgress, CustomWord, SettingsRecord, StudyLog } from './types.ts'

export class TuNgayDB extends Dexie {
  // `declare` (not `!`): class fields would otherwise shadow the tables Dexie creates.
  declare progress: Table<CardProgress, string>
  declare customWords: Table<CustomWord, string>
  declare studyLogs: Table<StudyLog, number>
  declare settings: Table<SettingsRecord, string>

  constructor(name = 'tu-ngay') {
    super(name)
    // IndexedDB cannot index booleans, so `favorite` / `ignored` are intentionally not indexed;
    // they are filtered in memory.
    this.version(1).stores({
      progress: 'wordId, level, dueDate',
      customWords: 'id, word, createdAt',
      studyLogs: '++id, &date',
      settings: 'key',
    })
  }
}

export const db = new TuNgayDB()
