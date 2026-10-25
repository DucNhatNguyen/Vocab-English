/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getCatalogEntry } from '../data/exercises/catalog.ts'
import type { ExerciseSet } from '../data/exercises/types.ts'
import type { ExerciseAttempt } from '../db/types.ts'
import { heroSubline, listStatus, openAttemptSummary, sectionStatus, setCounts, setNote } from './exerciseLabels.ts'

function load(id: string): ExerciseSet {
  return JSON.parse(readFileSync(new URL(`../data/exercises/${id}.json`, import.meta.url), 'utf8')) as ExerciseSet
}

const pt03 = load('practice-test-03')

function attemptWith(set: ExerciseSet, count: number, sectionId?: string): ExerciseAttempt {
  const questions = set.sections.filter((s) => sectionId === undefined || s.id === sectionId).flatMap((s) => s.questions)
  const answers = Object.fromEntries(questions.slice(0, count).map((q) => [q.id, { value: 0, correct: true }]))
  return { setId: set.id, ...(sectionId ? { sectionId } : {}), startedAt: 'x', updatedAt: 'x', answers }
}

describe('setCounts', () => {
  it('shows questions and sections', () => {
    expect(setCounts({ questionCount: 50, sectionCount: 6 })).toBe('50 câu · 6 phần')
  })
  it('drops the section count of a one-section set', () => {
    expect(setCounts({ questionCount: 20, sectionCount: 1 })).toBe('20 câu')
  })
})

describe('listStatus', () => {
  it('reads an open whole-set attempt as x/y đang làm', () => {
    expect(listStatus({ kind: 'open', answered: 18, total: 50 })).toEqual({ tone: 'doing', main: '18/50', caption: 'đang làm' })
  })
  it('reads an open section attempt by its answered count', () => {
    expect(listStatus({ kind: 'open', answered: 3, sectionId: 'x' })).toEqual({ tone: 'doing', main: '3 câu', caption: 'đang làm' })
  })
  it('reads a finished set as its best score', () => {
    expect(listStatus({ kind: 'finished', best: 42, total: 50 })).toEqual({ tone: 'score', main: '42/50', caption: 'cao nhất' })
  })
  it('reads a partly answered set and a new one', () => {
    expect(listStatus({ kind: 'partial', answered: 7, total: 50 })).toEqual({ tone: 'partial', label: 'Đã làm 7/50' })
    expect(listStatus({ kind: 'new' })).toEqual({ tone: 'new', label: 'Chưa làm' })
  })
})

describe('sectionStatus', () => {
  it('is "Chưa làm" without results', () => {
    expect(sectionStatus(undefined, false)).toEqual({ tone: 'new', label: 'Chưa làm' })
    expect(sectionStatus({ total: 10, answered: 0, correct: 0 }, false)).toEqual({ tone: 'new', label: 'Chưa làm' })
  })
  it('shows the correct count of a fully answered section', () => {
    expect(sectionStatus({ total: 10, answered: 10, correct: 9 }, false)).toEqual({ tone: 'score', main: '9/10' })
  })
  it('shows a half-done section as running or as answered so far', () => {
    expect(sectionStatus({ total: 10, answered: 4, correct: 3 }, true)).toEqual({ tone: 'doing', main: '4/10', caption: 'đang làm' })
    expect(sectionStatus({ total: 10, answered: 4, correct: 3 }, false)).toEqual({ tone: 'partial', label: 'Đã làm 4/10' })
  })
})

describe('openAttemptSummary', () => {
  const entry = getCatalogEntry('practice-test-03')!

  it('reads "Câu x/y" before the set is loaded', () => {
    const summary = openAttemptSummary(attemptWith(pt03, 18), entry)
    expect(summary.sub).toBe('Câu 18/50')
    expect(summary.fraction).toBeCloseTo(0.36)
  })
  it('adds the name of the section the next question is in', () => {
    const summary = openAttemptSummary(attemptWith(pt03, 18), entry, pt03)
    // questions 11-20 are the two reading passages; the 19th question is in the second one
    const second = pt03.sections.find((s) => s.id === 'pt03-p1b-2')!
    expect(summary.sub).toBe(`Câu 18/50 · ${second.passage?.title ?? 'Đọc hiểu'}`)
  })
  it('uses the section size for a section attempt once loaded, and a plain count before', () => {
    const sectionId = pt03.sections[0]!.id
    const attempt = attemptWith(pt03, 4, sectionId)
    expect(openAttemptSummary(attempt, entry).sub).toBe('4 câu đã làm')
    expect(openAttemptSummary(attempt, entry, pt03).sub).toBe('Câu 4/10 · Từ vựng')
  })
})

describe('heroSubline', () => {
  it('shows the last score and the number of finished runs', () => {
    expect(heroSubline({ lastFull: 40, finishedFullCount: 2, openFull: undefined }, 50)).toBe('Lần gần nhất: 40/50 · 2 lượt đã làm')
  })
  it('shows the open attempt when nothing is finished, otherwise nothing', () => {
    expect(heroSubline({ lastFull: undefined, finishedFullCount: 0, openFull: attemptWith(pt03, 18) }, 50)).toBe('Đang làm dở: 18/50 câu')
    expect(heroSubline({ lastFull: undefined, finishedFullCount: 0, openFull: undefined }, 50)).toBeUndefined()
  })
})

describe('setNote', () => {
  it('names the AI source and the omitted parts', () => {
    expect(setNote({ answerSource: 'ai', omitted: ['Paper 4: Speaking'] })).toBe(
      'Đáp án và giải thích do AI soạn, có thể chưa chính xác. Phần bỏ qua: Paper 4: Speaking.',
    )
  })
  it('is empty for an official key with nothing omitted', () => {
    expect(setNote({ answerSource: 'key' })).toBe('')
  })
})
