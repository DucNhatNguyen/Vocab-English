import { EXERCISE_CATALOG, isExerciseSetId } from '../data/exercises/catalog.ts'
import type { ExerciseSet } from '../data/exercises/types.ts'
import { db } from './db.ts'
import type { ExerciseAnswer, ExerciseAttempt, ExerciseResult } from './types.ts'

/**
 * Exercise progress: attempts (runs through a whole set or one section) and the latest result
 * of every question. Spec section 4.3. Timestamps are ISO instants; callers may pass `now` in tests.
 */

const isOpen = (attempt: ExerciseAttempt) => attempt.finishedAt === undefined
const isFull = (attempt: ExerciseAttempt) => attempt.sectionId === undefined
const answeredCount = (attempt: ExerciseAttempt) => Object.keys(attempt.answers).length
const correctCount = (attempt: ExerciseAttempt) => Object.values(attempt.answers).filter((a) => a.correct).length

/** An attempt that has no answer yet is only a started screen; lists do not show it as "in progress". */
const isInProgress = (attempt: ExerciseAttempt) => isOpen(attempt) && answeredCount(attempt) > 0

function latestUpdated(attempts: ExerciseAttempt[]): ExerciseAttempt | undefined {
  return attempts.reduce<ExerciseAttempt | undefined>(
    (best, a) => (best === undefined || a.updatedAt >= best.updatedAt ? a : best),
    undefined,
  )
}

async function openAttemptsInScope(setId: string, sectionId: string | undefined): Promise<ExerciseAttempt[]> {
  return db.exerciseAttempts
    .where('setId')
    .equals(setId)
    .filter((a) => isOpen(a) && a.sectionId === sectionId)
    .toArray()
}

/** The unfinished attempt of this scope (a whole set when `sectionId` is absent), if any. */
export async function getOpenAttempt(setId: string, sectionId?: string): Promise<ExerciseAttempt | undefined> {
  return latestUpdated(await openAttemptsInScope(setId, sectionId))
}

async function createAttempt(setId: string, sectionId: string | undefined, now: Date): Promise<ExerciseAttempt> {
  const at = now.toISOString()
  const attempt: ExerciseAttempt = { setId, startedAt: at, updatedAt: at, answers: {} }
  if (sectionId !== undefined) attempt.sectionId = sectionId
  attempt.id = await db.exerciseAttempts.add(attempt)
  return attempt
}

/** Resumes the open attempt of this scope, or starts a new one. */
export async function startOrResumeAttempt(
  setId: string,
  sectionId?: string,
  now: Date = new Date(),
): Promise<ExerciseAttempt> {
  return db.transaction('rw', db.exerciseAttempts, async () => {
    return (await getOpenAttempt(setId, sectionId)) ?? createAttempt(setId, sectionId, now)
  })
}

/** "Làm lại từ đầu": throws away the open attempt of this scope and starts a fresh one. */
export async function restartAttempt(setId: string, sectionId?: string, now: Date = new Date()): Promise<ExerciseAttempt> {
  return db.transaction('rw', db.exerciseAttempts, async () => {
    const stale = await openAttemptsInScope(setId, sectionId)
    await db.exerciseAttempts.bulkDelete(stale.map((a) => a.id!))
    return createAttempt(setId, sectionId, now)
  })
}

/**
 * Saves one answer. The latest result of the question is always written (it feeds "câu sai");
 * the attempt is updated too when `attemptId` is given (a "Làm lại câu sai" run passes null).
 * Answering the same question again overwrites the earlier answer.
 */
export async function recordAnswer(
  attemptId: number | null,
  setId: string,
  questionId: string,
  answer: ExerciseAnswer,
  now: Date = new Date(),
): Promise<void> {
  const at = now.toISOString()
  const clean: ExerciseAnswer = { value: answer.value, correct: answer.correct }
  if (answer.selfMarked) clean.selfMarked = true

  await db.transaction('rw', db.exerciseAttempts, db.exerciseResults, async () => {
    if (attemptId !== null) {
      const attempt = await db.exerciseAttempts.get(attemptId)
      if (attempt) {
        await db.exerciseAttempts.put({ ...attempt, updatedAt: at, answers: { ...attempt.answers, [questionId]: clean } })
      }
    }
    await db.exerciseResults.put({ ...clean, questionId, setId, answeredAt: at })
  })
}

/** Marks an attempt as finished; resolves to it, or undefined when it no longer exists. */
export async function finishAttempt(id: number, now: Date = new Date()): Promise<ExerciseAttempt | undefined> {
  return db.transaction('rw', db.exerciseAttempts, async () => {
    const attempt = await db.exerciseAttempts.get(id)
    if (!attempt) return undefined
    if (attempt.finishedAt !== undefined) return attempt
    const finished = { ...attempt, finishedAt: now.toISOString() }
    await db.exerciseAttempts.put(finished)
    return finished
  })
}

// ---------------------------------------------------------------------------
// Reads for the screens

export type SetStatus =
  /** An unfinished attempt with at least one answer. `total` is known for a whole-set attempt only. */
  | { kind: 'open'; answered: number; total?: number; sectionId?: string }
  /** A finished whole-set attempt exists: its best score. */
  | { kind: 'finished'; best: number; total: number }
  /** Some questions answered through section runs only. */
  | { kind: 'partial'; answered: number; total: number }
  | { kind: 'new' }

export interface ExerciseOverview {
  /** One entry per catalog set, by set id. */
  statuses: Record<string, SetStatus>
  /** The most recently updated unfinished attempt across all sets ("Đang làm dở" card). */
  openAttempt?: ExerciseAttempt
  /** Questions whose latest result is wrong. */
  wrongCount: number
  /** Number of sets that have at least one such question. */
  wrongSetCount: number
}

/** Everything the Bài tập tab needs, in one consistent read. */
export async function getExerciseOverview(): Promise<ExerciseOverview> {
  const [attempts, results] = await db.transaction('r', db.exerciseAttempts, db.exerciseResults, () =>
    Promise.all([db.exerciseAttempts.toArray(), db.exerciseResults.toArray()]),
  )
  const known = attempts.filter((a) => isExerciseSetId(a.setId))
  const knownResults = results.filter((r) => isExerciseSetId(r.setId))

  const statuses: Record<string, SetStatus> = {}
  for (const entry of EXERCISE_CATALOG) {
    const mine = known.filter((a) => a.setId === entry.id)
    const open = latestUpdated(mine.filter(isInProgress))
    const finishedScores = mine.filter((a) => isFull(a) && !isOpen(a)).map(correctCount)
    const answered = knownResults.filter((r) => r.setId === entry.id).length

    if (open) {
      statuses[entry.id] = {
        kind: 'open',
        answered: answeredCount(open),
        ...(isFull(open) ? { total: entry.questionCount } : { sectionId: open.sectionId }),
      }
    } else if (finishedScores.length > 0) {
      statuses[entry.id] = { kind: 'finished', best: Math.max(...finishedScores), total: entry.questionCount }
    } else if (answered > 0) {
      statuses[entry.id] = { kind: 'partial', answered, total: entry.questionCount }
    } else {
      statuses[entry.id] = { kind: 'new' }
    }
  }

  const wrong = knownResults.filter((r) => !r.correct)
  return {
    statuses,
    openAttempt: latestUpdated(known.filter(isInProgress)),
    wrongCount: wrong.length,
    wrongSetCount: new Set(wrong.map((r) => r.setId)).size,
  }
}

export interface SectionProgress {
  total: number
  /** Questions of this section with a stored result. */
  answered: number
  /** Of those, how many are currently right. 0 with `answered` 0 means "Chưa làm". */
  correct: number
}

export interface SetProgress {
  /** Highest correct count over finished whole-set attempts. */
  bestFull?: number
  /** Correct count of the most recently finished whole-set attempt. */
  lastFull?: number
  finishedFullCount: number
  /** Unfinished whole-set attempt with answers: the detail screen offers "Làm tiếp". */
  openFull?: ExerciseAttempt
  /** Sections that have an unfinished single-section attempt with answers. */
  openSectionIds: string[]
  /** Latest-result score of each section, by section id. */
  sections: Record<string, SectionProgress>
}

/** Scores for the set detail screen. Takes the loaded set because results only know question ids. */
export async function getSetProgress(set: ExerciseSet): Promise<SetProgress> {
  const [attempts, results] = await db.transaction('r', db.exerciseAttempts, db.exerciseResults, () =>
    Promise.all([
      db.exerciseAttempts.where('setId').equals(set.id).toArray(),
      db.exerciseResults.where('setId').equals(set.id).toArray(),
    ]),
  )

  const finishedFull = attempts.filter((a) => isFull(a) && !isOpen(a))
  const lastFinished = finishedFull.reduce<ExerciseAttempt | undefined>(
    (best, a) => (best === undefined || a.finishedAt! >= best.finishedAt! ? a : best),
    undefined,
  )
  const byQuestion = new Map(results.map((r) => [r.questionId, r]))
  const sections: Record<string, SectionProgress> = {}
  for (const section of set.sections) {
    const mine = section.questions.map((q) => byQuestion.get(q.id)).filter((r): r is ExerciseResult => r !== undefined)
    sections[section.id] = {
      total: section.questions.length,
      answered: mine.length,
      correct: mine.filter((r) => r.correct).length,
    }
  }

  const inProgress = attempts.filter(isInProgress)
  return {
    bestFull: finishedFull.length > 0 ? Math.max(...finishedFull.map(correctCount)) : undefined,
    lastFull: lastFinished ? correctCount(lastFinished) : undefined,
    finishedFullCount: finishedFull.length,
    openFull: latestUpdated(inProgress.filter(isFull)),
    openSectionIds: [...new Set(inProgress.filter((a) => !isFull(a)).map((a) => a.sectionId!))],
    sections,
  }
}

/** A question whose latest result is wrong, with the set it belongs to (question ids do not say). */
export interface WrongQuestion {
  setId: string
  questionId: string
}

/**
 * The questions whose latest result is wrong, for "Làm lại câu sai". All sets when  is
 * omitted. Ordered by catalog position of the set, then by question id (numeric-aware).
 */
export async function getWrongQuestions(setId?: string): Promise<WrongQuestion[]> {
  const rows = await db.exerciseResults.filter((r) => !r.correct && (setId === undefined || r.setId === setId)).toArray()
  const rank = (id: string) => EXERCISE_CATALOG.findIndex((e) => e.id === id)
  return rows
    .filter((r) => rank(r.setId) !== -1)
    .sort((a, b) => rank(a.setId) - rank(b.setId) || a.questionId.localeCompare(b.questionId, 'en', { numeric: true }))
    .map((r) => ({ setId: r.setId, questionId: r.questionId }))
}

/** Ids only; see {@link getWrongQuestions}. */
export async function getWrongQuestionIds(setId?: string): Promise<string[]> {
  return (await getWrongQuestions(setId)).map((q) => q.questionId)
}
