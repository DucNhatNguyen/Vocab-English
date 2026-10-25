/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { ExerciseSet } from '../data/exercises/types.ts'
import type { ExerciseAnswer } from '../db/types.ts'
import {
  bestStatus,
  buildRetryItems,
  buildRunItems,
  countAnswered,
  firstUnansweredIndex,
  questionLayout,
  scoreRun,
  sectionKicker,
  startsSection,
  summarySectionName,
  wrongRowText,
} from './exerciseRun.ts'

function load(id: string): ExerciseSet {
  return JSON.parse(readFileSync(new URL(`../data/exercises/${id}.json`, import.meta.url), 'utf8')) as ExerciseSet
}

const pt01 = load('practice-test-01')
const pt02 = load('practice-test-02')
const gp01 = load('grammar-practice-01')
const writing = load('writing-practice')

const right = { value: 0, correct: true }
const wrong = { value: 1, correct: false }

describe('buildRunItems', () => {
  it('lists a whole set in play order', () => {
    const items = buildRunItems(pt01)
    expect(items).toHaveLength(50)
    expect(items[0].question.id).toBe('pt01-q1')
    expect(items[0].set).toBe(pt01)
    expect(items.at(-1)?.question.number).toBe(50)
  })

  it('lists one section', () => {
    const items = buildRunItems(pt01, 'pt01-p2b')
    expect(items).toHaveLength(10)
    expect(new Set(items.map((i) => i.section.id))).toEqual(new Set(['pt01-p2b']))
    expect(buildRunItems(pt01, 'nope')).toEqual([])
  })
})

describe('buildRetryItems', () => {
  it('keeps the order of the refs across sets and skips unknown questions', () => {
    const items = buildRetryItems(
      [pt01, pt02],
      [
        { setId: 'practice-test-02', questionId: 'pt02-q3' },
        { setId: 'practice-test-01', questionId: 'pt01-q38' },
        { setId: 'practice-test-01', questionId: 'pt01-q999' },
        { setId: 'practice-test-09', questionId: 'pt09-q1' },
      ],
    )
    expect(items.map((i) => i.question.id)).toEqual(['pt02-q3', 'pt01-q38'])
    expect(items[1].section.id).toBe('pt01-p2b')
    expect(items[0].set).toBe(pt02)
  })
})

describe('resume position', () => {
  const items = buildRunItems(pt01)

  it('is the first question without an answer', () => {
    const answers = { 'pt01-q1': right, 'pt01-q2': wrong, 'pt01-q4': right }
    expect(firstUnansweredIndex(items, answers)).toBe(2)
    expect(countAnswered(items, answers)).toBe(3)
  })

  it('is 0 for a fresh run and the length when everything is answered', () => {
    expect(firstUnansweredIndex(items, {})).toBe(0)
    const all = Object.fromEntries(items.map((i) => [i.question.id, right]))
    expect(firstUnansweredIndex(items, all)).toBe(items.length)
  })

  it('ignores answers of questions that are not in the run', () => {
    expect(firstUnansweredIndex(buildRunItems(pt01, 'pt01-p2b'), { 'pt01-q1': right })).toBe(0)
  })
})

describe('questionLayout', () => {
  const layoutOf = (set: ExerciseSet, id: string) => questionLayout(buildRunItems(set).find((i) => i.question.id === id)!)

  it('tells the four layouts apart', () => {
    expect(layoutOf(pt01, 'pt01-q1')).toBe('choice') // vocabulary
    expect(layoutOf(pt01, 'pt01-q12')).toBe('reading') // passage + prompt
    expect(layoutOf(pt01, 'pt01-q21')).toBe('choice') // sentence completion
    expect(layoutOf(pt01, 'pt01-q38')).toBe('cloze') // passage, no prompt
    expect(layoutOf(pt01, 'pt01-q46')).toBe('rewrite')
    expect(layoutOf(gp01, 'gp01-q1')).toBe('choice')
    expect(layoutOf(writing, 'wp01-q1')).toBe('rewrite')
  })
})

describe('startsSection', () => {
  it('is true for the first question of each section of the run', () => {
    const items = buildRunItems(pt01)
    const starts = items.map((_, i) => startsSection(items, i)).filter(Boolean)
    expect(starts).toHaveLength(pt01.sections.length)
    expect(startsSection(items, 0)).toBe(true)
    expect(startsSection(items, 1)).toBe(false)
    expect(startsSection(items, 10)).toBe(true)
  })
})

describe('sectionKicker', () => {
  const kicker = (id: string, withSet = false) =>
    sectionKicker(pt01, pt01.sections.find((s) => s.id === id)!, withSet)

  it('names practice-test sections like the screens do', () => {
    expect(kicker('pt01-p1a')).toBe('Paper 1 · Từ vựng')
    expect(kicker('pt01-p1b-1')).toBe('Paper 1 · Đọc hiểu · Đoạn 1')
    expect(kicker('pt01-p2b')).toBe('Paper 2 · Điền từ vào đoạn văn')
    expect(kicker('pt01-p2c')).toBe('Paper 2 · Viết lại câu')
  })

  it('puts the set name first in a retry', () => {
    expect(kicker('pt01-p1a', true)).toBe('Practice Test 1 · Paper 1 · Từ vựng')
  })

  it('uses the section title of grammar and writing sets', () => {
    expect(sectionKicker(gp01, gp01.sections[0], false)).toBe(gp01.sections[0].title)
    expect(sectionKicker(writing, writing.sections[0], false)).toBe(writing.sections[0].title)
  })
})

describe('summarySectionName', () => {
  it('prefixes reading and cloze sections with their kind', () => {
    const names = pt01.sections.map((s) => summarySectionName(pt01, s))
    expect(names[0]).toBe('Từ vựng')
    expect(names[1]).toBe('Đọc hiểu: The Origin of Jeans')
    expect(names).toContain('Điền từ: The Escalator')
    expect(names.at(-1)).toBe('Viết lại câu')
  })
})

describe('scoreRun', () => {
  it('scores per section and lists the wrong questions in play order', () => {
    const items = buildRunItems(pt01)
    const answers: Record<string, ExerciseAnswer> = Object.fromEntries(items.map((i) => [i.question.id, right]))
    answers['pt01-q3'] = wrong
    answers['pt01-q20'] = wrong // last question of the second passage
    answers['pt01-q46'] = { value: 'typed', correct: true, selfMarked: true }

    const score = scoreRun(items, answers)
    expect(score).toMatchObject({ total: 50, correct: 48, selfMarked: 1 })
    expect(score.wrong.map((i) => i.question.id)).toEqual(['pt01-q3', 'pt01-q20'])
    expect(score.sections.map((s) => [s.name, s.correct, s.total])).toEqual([
      ['Từ vựng', 9, 10],
      ['Đọc hiểu: The Origin of Jeans', 5, 5],
      ['Đọc hiểu: The Furby Fad', 4, 5],
      ['Hoàn thành câu', 15, 15],
      ['Điền từ: The Escalator', 10, 10],
      ['Viết lại câu', 5, 5],
    ])
  })

  it('counts unanswered questions in the total, not as wrong', () => {
    const items = buildRunItems(pt01, 'pt01-p1a')
    const score = scoreRun(items, { 'pt01-q1': right, 'pt01-q2': wrong })
    expect(score).toMatchObject({ total: 10, correct: 1, selfMarked: 0 })
    expect(score.wrong.map((i) => i.question.id)).toEqual(['pt01-q2'])
  })

  it('names the set in each row when the run spans several sets', () => {
    const items = buildRetryItems(
      [pt01, pt02],
      [
        { setId: 'practice-test-01', questionId: 'pt01-q1' },
        { setId: 'practice-test-02', questionId: 'pt02-q1' },
      ],
    )
    const rows = scoreRun(items, { 'pt01-q1': wrong, 'pt02-q1': right }).sections
    expect(rows.map((r) => r.name)).toEqual(['Practice Test 1 · Từ vựng', 'Practice Test 2 · Từ vựng'])
  })
})

describe('bestStatus', () => {
  it('compares a whole-set score with the best before this run', () => {
    expect(bestStatus(30, undefined)).toEqual({ kind: 'first' })
    expect(bestStatus(31, 30)).toEqual({ kind: 'new' })
    expect(bestStatus(30, 30)).toEqual({ kind: 'behind', best: 30 })
    expect(bestStatus(12, 30)).toEqual({ kind: 'behind', best: 30 })
  })
})

describe('wrongRowText', () => {
  const find = (set: ExerciseSet, id: string) => buildRunItems(set).find((i) => i.question.id === id)!

  it('shows the prompt (dialogue turns on one line) and the kind of question', () => {
    expect(wrongRowText(find(pt01, 'pt01-q1'), false)).toEqual({
      title: "We ___ the preparation for the party between us, so it wasn't too much work.",
      meta: 'Từ vựng',
    })
    expect(wrongRowText(find(pt01, 'pt01-q12'), false).meta).toBe('Đọc hiểu')
    expect(wrongRowText(find(pt01, 'pt01-q21'), false).meta).toBe('Hoàn thành câu')
  })

  it('names the blank of a cloze item and the source sentence of a rewrite', () => {
    expect(wrongRowText(find(pt01, 'pt01-q38'), false)).toEqual({ title: 'Chỗ trống 38', meta: 'Điền từ' })
    const rewrite = wrongRowText(find(pt01, 'pt01-q46'), false)
    expect(rewrite.title).toBe('Although the weather was good, we stayed indoors.')
    expect(rewrite.meta).toBe('Viết lại câu')
  })

  it('uses the section title for grammar and writing sets, and prefixes the set in a retry', () => {
    expect(wrongRowText(find(gp01, 'gp01-q1'), false).meta).toBe(gp01.sections[0].title)
    expect(wrongRowText(find(writing, 'wp01-q1'), false).meta).toBe(writing.sections[0].title)
    expect(wrongRowText(find(pt01, 'pt01-q1'), true).meta).toBe('Practice Test 1 · Từ vựng')
  })

  it('flattens line breaks in a dialogue prompt', () => {
    const dialogue = buildRunItems(gp01).find((i) => i.question.type === 'choice' && i.question.prompt?.includes('\n'))
    if (dialogue) expect(wrongRowText(dialogue, false).title).not.toContain('\n')
  })
})
