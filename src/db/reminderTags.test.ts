import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createCustomWord } from './customWords.ts'
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

const own = (word: string) =>
  createCustomWord({ word, ipa: '', pos: 'noun', meaningVi: word, exampleEn: '', exampleVi: '' })

describe('loadReminderTags', () => {
  it('for a new database: no next word, nothing to review, no streak, no reminders', async () => {
    expect(await loadReminderTags(TODAY)).toEqual({
      nhac_sang: '0',
      nhac_trua: '0',
      nhac_toi: '0',
      tu_moi: '',
      so_tu_on: '0',
      streak: '0',
    })
  })

  it('follows the settings, the next lesson, cards due by tomorrow and the streak', async () => {
    await updateSettings({ reminders: { morning: true, noon: false, evening: true } })
    const words = []
    for (const w of ['w0', 'w1', 'w2', 'w3', 'w4']) words.push(await own(w))
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
    // The next lesson skips learned words -> the only unlearned own word
    expect(tags.tu_moi).toBe('w4')
  })

  it('does not count built-in due cards in so_tu_on', async () => {
    const mine = await own('mine')
    await db.progress.bulkPut([
      card('hello', { dueDate: '2026-10-25' }),
      card('goodbye', { dueDate: '2026-10-20' }),
      card(mine.id, { dueDate: '2026-10-25' }),
    ])
    expect((await loadReminderTags(TODAY)).so_tu_on).toBe('1')
  })

  it('has an empty tu_moi when every own word is learned', async () => {
    const mine = await own('mine')
    await db.progress.put(card(mine.id))
    expect((await loadReminderTags(TODAY)).tu_moi).toBe('')
  })
})
