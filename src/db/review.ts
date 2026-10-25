import { words as builtInWords } from '../data/index.ts'
import type { Word } from '../data/types.ts'
import { reviewCard } from '../lib/srs.ts'
import { today as localToday } from '../lib/date.ts'
import { CUSTOM_WORD_ID_PREFIX } from './customWords.ts'
import { db } from './db.ts'
import type { CardProgress } from './types.ts'

export interface ReviewOutcome {
  /** Progress before the answer. */
  before: CardProgress
  /** Progress after the answer (new level and due date). */
  after: CardProgress
}

/**
 * Persists the FIRST answer of a word in a review round, in one transaction: the card moves
 * up a level (correct) or back to level 1 (wrong) through `reviewCard`, and today's StudyLog
 * gets `reviewed += 1` and `correct` / `wrong += 1`. Re-asks of a wrong word must not call this.
 *
 * Resolves to null, writing nothing, when the word is not reviewable (no record, not learned
 * yet, or unticked in the notebook), e.g. because it changed while the round was open.
 */
export async function recordReviewAnswer(
  wordId: string,
  correct: boolean,
  today: string,
): Promise<ReviewOutcome | null> {
  return db.transaction('rw', db.progress, db.studyLogs, async () => {
    const before = await db.progress.get(wordId)
    if (!before || before.level === 0 || before.ignored) return null

    const after = reviewCard(before, correct, today)
    await db.progress.put(after)

    const log = await db.studyLogs.where('date').equals(today).first()
    if (log) {
      await db.studyLogs.update(log.id!, {
        reviewed: log.reviewed + 1,
        correct: log.correct + (correct ? 1 : 0),
        wrong: log.wrong + (correct ? 0 : 1),
      })
    } else {
      await db.studyLogs.add({
        date: today,
        newLearned: 0,
        reviewed: 1,
        correct: correct ? 1 : 0,
        wrong: correct ? 0 : 1,
      })
    }
    return { before, after }
  })
}

export interface ReviewData {
  /** Local date the data was read on. */
  today: string
  /** Learned cards (level >= 1) of the user's own words that still exist, ignored ones included. */
  learned: CardProgress[]
  /** Words of the learned cards, by id. */
  words: Map<string, Word>
  /** Every word that can be a distractor: built-in plus the user's own (only own words are asked). */
  pool: Word[]
}

/**
 * Everything the review screens need, read together. Reads `progress` and `customWords`, so it
 * works as a `useLiveQuery` source and follows answers and edits.
 */
export async function loadReviewData(today: string = localToday()): Promise<ReviewData> {
  const [rows, customWords] = await Promise.all([
    db.progress.where('level').above(0).toArray(),
    db.customWords.toArray(),
  ])
  const custom = new Map(customWords.map((w) => [w.id, w]))

  const words = new Map<string, Word>()
  const learned: CardProgress[] = []
  for (const row of rows) {
    // Only the user's own words are studied; built-in progress stays stored but hidden
    if (!row.wordId.startsWith(CUSTOM_WORD_ID_PREFIX)) continue
    const word = custom.get(row.wordId)
    // A card whose word was deleted cannot be asked
    if (!word) continue
    words.set(row.wordId, word)
    learned.push(row)
  }
  return { today, learned, words, pool: [...builtInWords, ...customWords] }
}
