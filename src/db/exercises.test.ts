import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import type { ExerciseSet } from '../data/exercises/types.ts'
import { db } from './db.ts'
import {
  finishAttempt,
  getExerciseOverview,
  getOpenAttempt,
  getSetProgress,
  getWrongQuestionIds,
  getWrongQuestions,
  recordAnswer,
  restartAttempt,
  startOrResumeAttempt,
} from './exercises.ts'
import type { ExerciseAnswer } from './types.ts'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterAll(() => {
  db.close()
})

const at = (minute: number) => new Date(Date.UTC(2026, 9, 25, 8, minute))
const right: ExerciseAnswer = { value: 1, correct: true }
const wrong: ExerciseAnswer = { value: 0, correct: false }

/** Answers `n` questions of a set in one go: the first `rightCount` of them correctly. */
async function answerMany(attemptId: number | null, setId: string, n: number, rightCount: number, minute = 0) {
  for (let i = 1; i <= n; i++) {
    await recordAnswer(attemptId, setId, `${setId}-q${i}`, i <= rightCount ? right : wrong, at(minute + i))
  }
}

// A tiny set for getSetProgress: two sections of 2 and 3 questions.
const tiny: ExerciseSet = {
  id: 'practice-test-01',
  title: 'Practice Test 1',
  kind: 'practice-test',
  sourcePages: [1, 2],
  answerSource: 'ai',
  sections: [
    { id: 's1', title: 'a', instruction: 'x', questions: ['a1', 'a2'].map(choice) },
    { id: 's2', title: 'b', instruction: 'x', questions: ['b1', 'b2', 'b3'].map(choice) },
  ],
}

function choice(id: string): ExerciseSet['sections'][number]['questions'][number] {
  return { type: 'choice', id, number: 1, prompt: 'p', options: ['a', 'b'], answer: 1, explanation: 'e', optionNotes: ['n', ''] }
}

describe('schema version 2', () => {
  it('indexes the exercise tables as in the spec', () => {
    expect(db.verno).toBe(2)
    expect(db.exerciseAttempts.schema.primKey.name).toBe('id')
    expect(db.exerciseAttempts.schema.primKey.auto).toBe(true)
    expect(db.exerciseAttempts.schema.indexes.map((i) => i.name).sort()).toEqual(['setId', 'updatedAt'])
    expect(db.exerciseResults.schema.primKey.name).toBe('questionId')
    expect(db.exerciseResults.schema.indexes.map((i) => i.name)).toEqual(['setId'])
  })
})

describe('attempts', () => {
  it('starts an attempt, then resumes the same one', async () => {
    const first = await startOrResumeAttempt('practice-test-01', undefined, at(0))
    expect(first).toMatchObject({ setId: 'practice-test-01', startedAt: at(0).toISOString(), answers: {} })
    expect(first.sectionId).toBeUndefined()
    expect(typeof first.id).toBe('number')

    const again = await startOrResumeAttempt('practice-test-01', undefined, at(5))
    expect(again.id).toBe(first.id)
    expect(await db.exerciseAttempts.count()).toBe(1)
  })

  it('keeps whole-set and per-section scopes apart', async () => {
    const full = await startOrResumeAttempt('practice-test-01')
    const part = await startOrResumeAttempt('practice-test-01', 'pt01-p1a')
    const other = await startOrResumeAttempt('practice-test-01', 'pt01-p2a')
    expect(new Set([full.id, part.id, other.id]).size).toBe(3)
    expect((await getOpenAttempt('practice-test-01'))?.id).toBe(full.id)
    expect((await getOpenAttempt('practice-test-01', 'pt01-p1a'))?.id).toBe(part.id)
    expect(await getOpenAttempt('practice-test-02')).toBeUndefined()
    expect(await getOpenAttempt('practice-test-01', 'pt01-p1b-1')).toBeUndefined()
  })

  it('restart discards the open attempt of that scope only', async () => {
    const full = await startOrResumeAttempt('practice-test-01')
    const part = await startOrResumeAttempt('practice-test-01', 'pt01-p1a')
    await recordAnswer(full.id!, 'practice-test-01', 'pt01-q1', right)

    const fresh = await restartAttempt('practice-test-01')
    expect(fresh.id).not.toBe(full.id)
    expect(fresh.answers).toEqual({})
    expect(await db.exerciseAttempts.get(full.id!)).toBeUndefined()
    expect((await getOpenAttempt('practice-test-01', 'pt01-p1a'))?.id).toBe(part.id)
    // The latest result of the answered question survives a restart.
    expect(await db.exerciseResults.get('pt01-q1')).toMatchObject({ correct: true })
  })

  it('restart without an open attempt just starts one', async () => {
    const attempt = await restartAttempt('grammar-practice-01', undefined, at(0))
    expect(attempt.startedAt).toBe(at(0).toISOString())
    expect(await db.exerciseAttempts.count()).toBe(1)
  })

  it('finishing closes the attempt, so the scope can start again', async () => {
    const first = await startOrResumeAttempt('practice-test-01')
    const done = await finishAttempt(first.id!, at(9))
    expect(done?.finishedAt).toBe(at(9).toISOString())
    expect(await getOpenAttempt('practice-test-01')).toBeUndefined()

    const next = await startOrResumeAttempt('practice-test-01')
    expect(next.id).not.toBe(first.id)
    // Finishing twice keeps the first finish time; an unknown id is ignored.
    expect((await finishAttempt(first.id!, at(30)))?.finishedAt).toBe(at(9).toISOString())
    expect(await finishAttempt(9999)).toBeUndefined()
  })
})

describe('recordAnswer', () => {
  it('writes the attempt and the latest result', async () => {
    const attempt = await startOrResumeAttempt('practice-test-01', undefined, at(0))
    await recordAnswer(attempt.id!, 'practice-test-01', 'pt01-q1', { value: 2, correct: false }, at(3))

    expect(await db.exerciseAttempts.get(attempt.id!)).toMatchObject({
      updatedAt: at(3).toISOString(),
      answers: { 'pt01-q1': { value: 2, correct: false } },
    })
    expect(await db.exerciseResults.get('pt01-q1')).toEqual({
      questionId: 'pt01-q1',
      setId: 'practice-test-01',
      value: 2,
      correct: false,
      answeredAt: at(3).toISOString(),
    })
  })

  it('overwrites an earlier answer to the same question, including a self-marked one', async () => {
    const attempt = await startOrResumeAttempt('writing-practice')
    await recordAnswer(attempt.id!, 'writing-practice', 'wp01-q1', { value: 'of trying', correct: false }, at(1))
    await recordAnswer(
      attempt.id!,
      'writing-practice',
      'wp01-q1',
      { value: 'of trying', correct: true, selfMarked: true },
      at(2),
    )
    const stored = await db.exerciseAttempts.get(attempt.id!)
    expect(Object.keys(stored!.answers)).toEqual(['wp01-q1'])
    expect(stored!.answers['wp01-q1']).toEqual({ value: 'of trying', correct: true, selfMarked: true })
    expect(await db.exerciseResults.get('wp01-q1')).toMatchObject({ correct: true, selfMarked: true })
    expect(await db.exerciseResults.count()).toBe(1)
  })

  it('does not store selfMarked: false', async () => {
    await recordAnswer(null, 'writing-practice', 'wp01-q2', { value: 'x', correct: true, selfMarked: false })
    expect(await db.exerciseResults.get('wp01-q2')).not.toHaveProperty('selfMarked')
  })

  it('with no attempt (a retry run) only updates the result', async () => {
    await recordAnswer(null, 'practice-test-01', 'pt01-q5', wrong, at(1))
    await recordAnswer(null, 'practice-test-01', 'pt01-q5', right, at(2))
    expect(await db.exerciseAttempts.count()).toBe(0)
    expect(await db.exerciseResults.get('pt01-q5')).toMatchObject({ correct: true, answeredAt: at(2).toISOString() })
  })

  it('still records the result when the attempt has disappeared', async () => {
    await recordAnswer(777, 'practice-test-01', 'pt01-q9', right)
    expect(await db.exerciseAttempts.count()).toBe(0)
    expect(await db.exerciseResults.get('pt01-q9')).toBeDefined()
  })
})

describe('getExerciseOverview', () => {
  it('is all "new" on a fresh database', async () => {
    const overview = await getExerciseOverview()
    expect(Object.keys(overview.statuses)).toHaveLength(14)
    expect(Object.values(overview.statuses).every((s) => s.kind === 'new')).toBe(true)
    expect(overview).toMatchObject({ openAttempt: undefined, wrongCount: 0, wrongSetCount: 0 })
  })

  it('applies the status priority: open, finished, partial, new', async () => {
    // pt01: finished whole-set 3/4 plus a newer open attempt -> open wins.
    const done = await startOrResumeAttempt('practice-test-01', undefined, at(0))
    await answerMany(done.id!, 'practice-test-01', 4, 3, 0)
    await finishAttempt(done.id!, at(10))
    const open = await startOrResumeAttempt('practice-test-01', undefined, at(20))
    await answerMany(open.id!, 'practice-test-01', 2, 2, 20)
    // pt02: only a finished whole-set attempt, 2 right of 3.
    const finished = await startOrResumeAttempt('practice-test-02', undefined, at(0))
    await answerMany(finished.id!, 'practice-test-02', 3, 2, 0)
    await finishAttempt(finished.id!, at(10))
    // pt03: a finished section run only -> partial.
    const part = await startOrResumeAttempt('practice-test-03', 'pt03-p1a', at(0))
    await answerMany(part.id!, 'practice-test-03', 2, 1, 0)
    await finishAttempt(part.id!, at(10))
    // pt04: answered through a retry only (no attempt at all) -> partial.
    await answerMany(null, 'practice-test-04', 1, 0)

    const { statuses } = await getExerciseOverview()
    expect(statuses['practice-test-01']).toEqual({ kind: 'open', answered: 2, total: 50 })
    expect(statuses['practice-test-02']).toEqual({ kind: 'finished', best: 2, total: 50 })
    expect(statuses['practice-test-03']).toEqual({ kind: 'partial', answered: 2, total: 50 })
    expect(statuses['practice-test-04']).toEqual({ kind: 'partial', answered: 1, total: 50 })
    expect(statuses['practice-test-05']).toEqual({ kind: 'new' })
  })

  it('takes the best of several finished whole-set attempts, not the latest', async () => {
    for (const [minute, rightCount] of [[0, 4], [10, 2]]) {
      const a = await startOrResumeAttempt('grammar-practice-01', undefined, at(minute))
      await answerMany(a.id!, 'grammar-practice-01', 5, rightCount, minute)
      await finishAttempt(a.id!, at(minute + 8))
    }
    expect((await getExerciseOverview()).statuses['grammar-practice-01']).toEqual({ kind: 'finished', best: 4, total: 20 })
  })

  it('reports an open section attempt without a total', async () => {
    const part = await startOrResumeAttempt('writing-practice', 'wp03', at(0))
    await answerMany(part.id!, 'writing-practice', 2, 2, 0)
    expect((await getExerciseOverview()).statuses['writing-practice']).toEqual({
      kind: 'open',
      answered: 2,
      sectionId: 'wp03',
    })
  })

  it('ignores an attempt that has no answers yet', async () => {
    await startOrResumeAttempt('practice-test-01')
    const overview = await getExerciseOverview()
    expect(overview.statuses['practice-test-01']).toEqual({ kind: 'new' })
    expect(overview.openAttempt).toBeUndefined()
  })

  it('picks the most recently updated open attempt for "Đang làm dở"', async () => {
    const a = await startOrResumeAttempt('practice-test-01', undefined, at(0))
    const b = await startOrResumeAttempt('practice-test-02', undefined, at(0))
    await recordAnswer(a.id!, 'practice-test-01', 'pt01-q1', right, at(5))
    await recordAnswer(b.id!, 'practice-test-02', 'pt02-q1', right, at(9))
    await recordAnswer(a.id!, 'practice-test-01', 'pt01-q2', right, at(7))
    expect((await getExerciseOverview()).openAttempt?.id).toBe(b.id)
  })

  it('counts wrong questions and the sets they come from, leaving out unknown sets', async () => {
    await recordAnswer(null, 'practice-test-01', 'pt01-q1', wrong)
    await recordAnswer(null, 'practice-test-01', 'pt01-q2', wrong)
    await recordAnswer(null, 'practice-test-01', 'pt01-q3', right)
    await recordAnswer(null, 'writing-practice', 'wp01-q1', wrong)
    await recordAnswer(null, 'removed-set', 'rs-q1', wrong)
    const overview = await getExerciseOverview()
    expect(overview.wrongCount).toBe(3)
    expect(overview.wrongSetCount).toBe(2)
  })

  it('a wrong question answered right on retry is no longer wrong', async () => {
    await recordAnswer(null, 'practice-test-01', 'pt01-q1', wrong)
    await recordAnswer(null, 'practice-test-01', 'pt01-q1', right)
    expect((await getExerciseOverview()).wrongCount).toBe(0)
  })
})

describe('getSetProgress', () => {
  it('is empty before any work', async () => {
    expect(await getSetProgress(tiny)).toEqual({
      bestFull: undefined,
      lastFull: undefined,
      finishedFullCount: 0,
      openFull: undefined,
      openSectionIds: [],
      sections: { s1: { total: 2, answered: 0, correct: 0 }, s2: { total: 3, answered: 0, correct: 0 } },
    })
  })

  it('reports best and last full scores and the finished count', async () => {
    const scores: Array<[number, number]> = [[0, 3], [10, 5], [20, 1]]
    for (const [minute, rightCount] of scores) {
      const a = await startOrResumeAttempt('practice-test-01', undefined, at(minute))
      await answerMany(a.id!, 'practice-test-01', 5, rightCount, minute)
      await finishAttempt(a.id!, at(minute + 5))
    }
    // A finished section run and another set must not count as full attempts.
    const part = await startOrResumeAttempt('practice-test-01', 's1', at(40))
    await answerMany(part.id!, 'practice-test-01', 5, 5, 40)
    await finishAttempt(part.id!, at(50))
    const other = await startOrResumeAttempt('practice-test-02', undefined, at(60))
    await answerMany(other.id!, 'practice-test-02', 5, 5, 60)
    await finishAttempt(other.id!, at(70))

    expect(await getSetProgress(tiny)).toMatchObject({ bestFull: 5, lastFull: 1, finishedFullCount: 3 })
  })

  it('counts correct answers per section from the latest results', async () => {
    await recordAnswer(null, 'practice-test-01', 'a1', right)
    await recordAnswer(null, 'practice-test-01', 'a2', wrong)
    await recordAnswer(null, 'practice-test-01', 'b1', wrong)
    await recordAnswer(null, 'practice-test-01', 'b1', right) // retried and fixed
    await recordAnswer(null, 'practice-test-01', 'b2', right)
    await recordAnswer(null, 'practice-test-02', 'c1', right) // another set: ignored

    expect((await getSetProgress(tiny)).sections).toEqual({
      s1: { total: 2, answered: 2, correct: 1 },
      s2: { total: 3, answered: 2, correct: 2 },
    })
  })

  it('exposes open attempts that have answers', async () => {
    const full = await startOrResumeAttempt('practice-test-01', undefined, at(0))
    const part = await startOrResumeAttempt('practice-test-01', 's2', at(0))
    await startOrResumeAttempt('practice-test-01', 's1', at(0)) // empty: not reported
    await recordAnswer(full.id!, 'practice-test-01', 'a1', right, at(1))
    await recordAnswer(part.id!, 'practice-test-01', 'b1', right, at(2))

    const progress = await getSetProgress(tiny)
    expect(progress.openFull?.id).toBe(full.id)
    expect(progress.openSectionIds).toEqual(['s2'])
  })
})

describe('getWrongQuestionIds', () => {
  it('lists wrong questions across sets in catalog order, numeric-aware', async () => {
    await recordAnswer(null, 'writing-practice', 'wp01-q3', wrong)
    await recordAnswer(null, 'practice-test-02', 'pt02-q10', wrong)
    await recordAnswer(null, 'practice-test-02', 'pt02-q9', wrong)
    await recordAnswer(null, 'practice-test-01', 'pt01-q7', wrong)
    await recordAnswer(null, 'practice-test-01', 'pt01-q8', right)
    await recordAnswer(null, 'removed-set', 'rs-q1', wrong)

    expect(await getWrongQuestionIds()).toEqual(['pt01-q7', 'pt02-q9', 'pt02-q10', 'wp01-q3'])
  })

  it('limits to one set', async () => {
    await recordAnswer(null, 'practice-test-01', 'pt01-q7', wrong)
    await recordAnswer(null, 'practice-test-02', 'pt02-q1', wrong)
    expect(await getWrongQuestionIds('practice-test-02')).toEqual(['pt02-q1'])
    expect(await getWrongQuestionIds('practice-test-03')).toEqual([])
  })
})

describe('getWrongQuestions', () => {
  it('pairs every wrong question with its set', async () => {
    await recordAnswer(null, 'practice-test-02', 'pt02-q9', wrong)
    await recordAnswer(null, 'practice-test-01', 'pt01-q7', wrong)
    await recordAnswer(null, 'practice-test-01', 'pt01-q8', right)
    expect(await getWrongQuestions()).toEqual([
      { setId: 'practice-test-01', questionId: 'pt01-q7' },
      { setId: 'practice-test-02', questionId: 'pt02-q9' },
    ])
    expect(await getWrongQuestions('practice-test-02')).toEqual([{ setId: 'practice-test-02', questionId: 'pt02-q9' }])
  })
})
