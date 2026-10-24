import { addDays, today as localToday } from '../lib/date.ts'
import { isDue } from '../lib/srs.ts'
import { computeStreak } from '../lib/streak.ts'
import { buildAllTags, type ReminderTags } from '../lib/reminderTags.ts'
import { db } from './db.ts'
import { loadLessonWords } from './lesson.ts'
import { loadReviewData } from './review.ts'
import { getSettings } from './settings.ts'

/**
 * Reads the local data behind the six push tags: reminder switches, the first word of the next
 * lesson, cards due tomorrow (overdue ones included) and the current streak.
 */
export async function loadReminderTags(today: string = localToday()): Promise<ReminderTags> {
  const tomorrow = addDays(today, 1)
  const [settings, lessonWords, review, logs] = await Promise.all([
    getSettings(),
    loadLessonWords(),
    loadReviewData(today),
    db.studyLogs.toArray(),
  ])
  return buildAllTags({
    reminders: settings.reminders,
    nextWord: lessonWords[0]?.word ?? null,
    dueTomorrow: review.learned.filter((card) => isDue(card, tomorrow)).length,
    streak: computeStreak(logs, today).current,
  })
}
