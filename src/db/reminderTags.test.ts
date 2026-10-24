import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { getDeckWords } from '../data/index.ts'
import { db } from './db.ts'
import { loadReminderTags } from './reminderTags.ts'
import { updateSettings } from './settings.ts'
import type { CardProgress, StudyLog } from './types.ts'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterAll(() => {
  db.close()
})

const TODAY = '2026-10-24'
const DECK = 'giao-tiep-hang-ngay'

const card = (wordId: string, over: Partial<CardProgress> = {}): CardProgress => ({
  wordId,
  level: 1,
  dueDate: '2026-10-25',
  learnedAt: '2026-10-20',
  correctCount: 0,
  wrongCount: 0,
  favorite: false,
  ignored: false,
  ...over,
})
const log = (date: string, over: Partial<StudyLog> = {}): StudyLog => ({
  date,
  newLearned: 0,
  reviewed: 0,
  correct: 0,
  wrong: 0,
  ...over,
})

describe('loadReminderTags', () => {
  it('for a new database: first word of the deck, nothing to review, no streak, no reminders', async () => {
    const [first] = getDeckWords(DECK)
    expect(await loadReminderTags(TODAY)).toEqual({
      nhac_sang: '0',
      nhac_trua: '0',
      nhac_toi: '0',
      tu_moi: first.word,
      so_tu_on: '0',
      streak: '0',
    })
  })

  it('follows the settings, the next lesson, cards due by tomorrow and the streak', async () => {
    const words = getDeckWords(DECK)
    await updateSettings({ reminders: { morning: true, noon: false, evening: true } })
    await db.progress.bulkPut([
      card(words[0].id, { dueDate: '2026-10-25' }), // due tomorrow
      card(words[1].id, { dueDate: '2026-10-23' }), // overdue: still in tomorrow's review
      card(words[2].id, { dueDate: '2026-10-26' }), // later
      card(words[3].id, { dueDate: '2026-10-25', ignored: true }), // ignored: never reviewed
    ])
    await db.studyLogs.bulkAdd([
      log('2026-10-23', { reviewed: 4 }),
      log('2026-10-24', { newLearned: 5 }),
    ])

    const tags = await loadReminderTags(TODAY)
    expect(tags.nhac_sang).toBe('1')
    expect(tags.nhac_trua).toBe('0')
    expect(tags.nhac_toi).toBe('1')
    expect(tags.so_tu_on).toBe('2')
    expect(tags.streak).toBe('2')
    // The next lesson skips learned words (indexes 0-3 have progress) -> the first unlearned one
    expect(tags.tu_moi).toBe(words[4].word)
  })

  it('has an empty tu_moi when no deck is active', async () => {
    await updateSettings({ activeDeckIds: [] })
    expect((await loadReminderTags(TODAY)).tu_moi).toBe('')
  })
})
