import type { Word } from '../data/types.ts'

export interface CardProgress {
  wordId: string // primary key
  level: 0 | 1 | 2 | 3 | 4 | 5 // 0 = not learned yet (record exists only because of favorite)
  dueDate?: string // local date "2026-10-25"; absent when level = 0
  learnedAt?: string // local date
  lastReviewedAt?: string
  correctCount: number
  wrongCount: number
  favorite: boolean
  ignored: boolean // unticked in the notebook -> excluded from review
}

// User-entered word. Same shape as Word; id is "custom:<uuid>" so it never clashes with
// built-in ids. CardProgress is shared between both kinds.
export interface CustomWord extends Word {
  createdAt: string // local date
  /** `Date.now()` at creation; breaks ties between words added on the same day. Absent on older words. */
  createdAtMs?: number
}

export interface StudyLog {
  id?: number
  date: string // "2026-10-24"
  newLearned: number
  reviewed: number
  correct: number
  wrong: number
}

export interface Settings {
  dailyGoal: number // 5 | 10 | 20
  voice: 'en-US' | 'en-GB'
  speechRate: number // 0.8 - 1.2
  soundEffects: boolean
  theme: 'system' | 'light' | 'dark'
  reminders: { morning: boolean; noon: boolean; evening: boolean }
  activeDeckIds: string[]
}

/** How Settings is stored: a single row under a fixed key. */
export type SettingsRecord = Settings & { key: 'app' }
