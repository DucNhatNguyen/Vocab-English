import type { Word } from '../data/types.ts'
import { selectLessonWords } from '../lib/lesson.ts'
import { learnCard } from '../lib/srs.ts'
import { db } from './db.ts'
import { getSettings } from './settings.ts'
import type { CardProgress } from './types.ts'

/**
 * Words of the next new-word lesson of a source (`decks`: the daily lesson, `mine`: Tự học) for
 * the current settings and progress. Reads several tables, so it works as a `useLiveQuery` source.
 */
export async function loadLessonWords(source: 'decks' | 'mine' = 'decks'): Promise<Word[]> {
  const [settings, customWords, progressRows] = await Promise.all([
    getSettings(),
    db.customWords.toArray(),
    db.progress.toArray(),
  ])
  return selectLessonWords({
    count: settings.dailyGoal,
    customWords,
    activeDeckIds: settings.activeDeckIds,
    progress: new Map(progressRows.map((p: CardProgress) => [p.wordId, p])),
    source,
  })
}

/**
 * Finishes a new-word lesson in one transaction: every word not yet learned enters level 1
 * (due tomorrow, favorite flag kept) and today's StudyLog gets `newLearned += count`.
 * Words that are already learned are left alone and not counted, so repeating the call is
 * harmless. Quick-check answers are deliberately not recorded: `correct` / `wrong` of the log
 * belong to review answers. Resolves to the number of words newly learned.
 */
export async function completeLesson(wordIds: readonly string[], today: string): Promise<number> {
  return db.transaction('rw', db.progress, db.studyLogs, async () => {
    let learned = 0
    for (const wordId of new Set(wordIds)) {
      const existing = await db.progress.get(wordId)
      if (existing && existing.level >= 1) continue
      await db.progress.put(learnCard(existing, wordId, today))
      learned += 1
    }
    if (learned === 0) return 0

    const log = await db.studyLogs.where('date').equals(today).first()
    if (log) {
      await db.studyLogs.update(log.id!, { newLearned: log.newLearned + learned })
    } else {
      await db.studyLogs.add({ date: today, newLearned: learned, reviewed: 0, correct: 0, wrong: 0 })
    }
    return learned
  })
}
