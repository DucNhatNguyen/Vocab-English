import Dexie, { type Table } from 'dexie'
import type {
  CardProgress,
  CustomWord,
  ExerciseAttempt,
  ExerciseResult,
  SettingsRecord,
  StudyLog,
} from './types.ts'

export class TuNgayDB extends Dexie {
  // `declare` (not `!`): class fields would otherwise shadow the tables Dexie creates.
  declare progress: Table<CardProgress, string>
  declare customWords: Table<CustomWord, string>
  declare studyLogs: Table<StudyLog, number>
  declare settings: Table<SettingsRecord, string>
  declare exerciseAttempts: Table<ExerciseAttempt, number>
  declare exerciseResults: Table<ExerciseResult, string>

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
    // Version 2 adds the exercise tables; Dexie keeps the version-1 tables and their data as they are.
    this.version(2).stores({
      exerciseAttempts: '++id, setId, updatedAt',
      exerciseResults: 'questionId, setId',
    })
  }
}

export const db = new TuNgayDB()
