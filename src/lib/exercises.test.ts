/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { ExerciseSet, RewriteQuestion } from '../data/exercises/types.ts'
import { flattenQuestions, isRewriteCorrect, joinRewrite, normalizeRewrite, sectionInfo } from './exercises.ts'

function load(id: string): ExerciseSet {
  return JSON.parse(readFileSync(new URL(`../data/exercises/${id}.json`, import.meta.url), 'utf8')) as ExerciseSet
}

const pt01 = load('practice-test-01')
const pt06 = load('practice-test-06')
const gp01 = load('grammar-practice-01')
const writing = load('writing-practice')

function section(set: ExerciseSet, id: string) {
  const found = set.sections.find((s) => s.id === id)
  if (!found) throw new Error(`no section ${id}`)
  return found
}

function rewrite(set: ExerciseSet, id: string): RewriteQuestion {
  for (const { question } of flattenQuestions(set)) {
    if (question.id === id) {
      if (question.type !== 'rewrite') throw new Error(`${id} is not a rewrite question`)
      return question
    }
  }
  throw new Error(`no question ${id}`)
}

describe('sectionInfo', () => {
  it('names the sections of a practice test as the detail screen does', () => {
    expect(pt01.sections.map((s) => sectionInfo(pt01, s))).toEqual([
      { kind: 'vocabulary', name: 'Từ vựng', meta: 'Paper 1 · Part A · 10 câu' },
      { kind: 'reading', name: 'The Origin of Jeans', meta: 'Đọc hiểu · Part B · 5 câu' },
      { kind: 'reading', name: 'The Furby Fad', meta: 'Đọc hiểu · Part B · 5 câu' },
      { kind: 'completion', name: 'Hoàn thành câu', meta: 'Paper 2 · Part A · 15 câu' },
      { kind: 'cloze', name: 'The Escalator', meta: 'Điền từ · Part B · 10 câu' },
      { kind: 'rewrite', name: 'Viết lại câu', meta: 'Paper 2 · Part C · 5 câu' },
    ])
  })

  it('falls back when a passage has no title', () => {
    expect(sectionInfo(pt06, section(pt06, 'pt06-p1b-1'))).toMatchObject({ kind: 'reading', name: 'Đọc hiểu (đoạn 1)' })
    expect(sectionInfo(pt06, section(pt06, 'pt06-p1b-2'))).toMatchObject({ name: 'Cycling in the countryside' })
    expect(sectionInfo(pt06, section(pt06, 'pt06-p2b'))).toEqual({
      kind: 'cloze',
      name: 'Điền từ',
      meta: 'Điền từ · Part B · 10 câu',
    })
  })

  it('uses the title and the question count for grammar and writing sections', () => {
    expect(sectionInfo(gp01, gp01.sections[0])).toEqual({ kind: 'grammar', name: 'Ngữ pháp · Practice 1', meta: '20 câu' })
    expect(sectionInfo(writing, section(writing, 'wp01'))).toEqual({
      kind: 'rewrite',
      name: 'Practice 1: Although / Despite / In spite of',
      meta: '5 câu',
    })
    expect(sectionInfo(writing, section(writing, 'wp08')).meta).toBe('10 câu')
  })

  it('classifies every section of every practice test into the six-part layout', () => {
    for (let n = 1; n <= 10; n++) {
      const set = load(`practice-test-${String(n).padStart(2, '0')}`)
      expect(
        set.sections.map((s) => sectionInfo(set, s).kind),
        set.id,
      ).toEqual(['vocabulary', 'reading', 'reading', 'completion', 'cloze', 'rewrite'])
    }
  })
})

describe('flattenQuestions', () => {
  it('lists every question in order with its section', () => {
    const all = flattenQuestions(pt01)
    expect(all).toHaveLength(50)
    expect(all.map((f) => f.question.number)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1))
    expect(all[0].section.id).toBe('pt01-p1a')
    expect(all[49].section.id).toBe('pt01-p2c')
    for (const { question, section: s } of all) expect(s.questions).toContain(question)
  })

  it('limits to one section', () => {
    const part = flattenQuestions(pt01, 'pt01-p2b')
    expect(part).toHaveLength(10)
    expect(new Set(part.map((f) => f.section.id))).toEqual(new Set(['pt01-p2b']))
  })

  it('is empty for an unknown section', () => {
    expect(flattenQuestions(pt01, 'nope')).toEqual([])
  })
})

describe('joinRewrite', () => {
  it('joins with spaces, and without one before a suffix that starts with punctuation', () => {
    const q5 = rewrite(writing, 'wp01-q5')
    expect(joinRewrite(q5, 'admire Shakespeare’s comedies')).toBe(
      'Although I admire Shakespeare’s comedies, I cannot agree that they are any superior to his tragedies.',
    )
    expect(joinRewrite(rewrite(writing, 'wp01-q3'), ' though he had ')).toBe(
      'John was able to compete in the race even though he had several broken bones.',
    )
  })

  it('copes with an empty input', () => {
    expect(joinRewrite(rewrite(writing, 'wp10-q4'), '')).toBe('If it, a lot of our crops will be lost.')
  })
})

describe('normalizeRewrite', () => {
  it('lower-cases, collapses spaces and trims', () => {
    expect(normalizeRewrite('  Despite   HER age \n he  runs ')).toBe('despite her age he runs')
  })

  it('straightens curly quotes', () => {
    expect(normalizeRewrite('It’s “fine”')).toBe('it\'s "fine"')
  })

  it('drops final punctuation only', () => {
    expect(normalizeRewrite('He left.')).toBe('he left')
    expect(normalizeRewrite('Did he leave?!')).toBe('did he leave')
    expect(normalizeRewrite('Well, he left , then.')).toBe('well, he left, then')
  })

  it('removes the space before punctuation', () => {
    expect(normalizeRewrite('a lot of rain , so we stayed home .')).toBe('a lot of rain, so we stayed home')
  })

  it('expands unambiguous contractions', () => {
    expect(normalizeRewrite("He doesn't know")).toBe('he does not know')
    expect(normalizeRewrite("I'm sure you're right, we've and they'll")).toBe('i am sure you are right, we have and they will')
    expect(normalizeRewrite("I can't and won't")).toBe('i cannot and will not')
    expect(normalizeRewrite('I can not')).toBe('i cannot')
    expect(normalizeRewrite('Don’t go')).toBe('do not go')
  })

  it("keeps 's and 'd, which have two meanings", () => {
    expect(normalizeRewrite("He's gone and she'd left")).toBe("he's gone and she'd left")
  })
})

describe('isRewriteCorrect', () => {
  it('accepts every listed answer of every rewrite question, however it is dressed up', () => {
    let checked = 0
    for (const id of ['practice-test-01', 'practice-test-06', 'writing-practice']) {
      for (const { question } of flattenQuestions(load(id))) {
        if (question.type !== 'rewrite') continue
        for (const answer of question.answers) {
          expect(isRewriteCorrect(answer, question), `${question.id}: ${answer}`).toBe(true)
          expect(isRewriteCorrect(`  ${answer.toUpperCase()}  `, question), question.id).toBe(true)
          checked++
        }
      }
    }
    expect(checked).toBeGreaterThan(300)
  })

  it('rejects an empty or blank input', () => {
    const q = rewrite(writing, 'wp01-q3')
    expect(isRewriteCorrect('', q)).toBe(false)
    expect(isRewriteCorrect('   ', q)).toBe(false)
  })

  it('wp01 q3: the suffix is part of the sentence (prefix and suffix both present)', () => {
    const q = rewrite(writing, 'wp01-q3')
    expect(isRewriteCorrect('though he had', q)).toBe(true)
    expect(isRewriteCorrect('Though he had', q)).toBe(true)
    expect(isRewriteCorrect('though he’d had', q)).toBe(true)
    expect(isRewriteCorrect('though he has', q)).toBe(false)
    expect(isRewriteCorrect('although he had', q)).toBe(false)
  })

  it('wp01 q5: a suffix that starts with a comma', () => {
    const q = rewrite(writing, 'wp01-q5')
    expect(isRewriteCorrect('admire Shakespeare’s comedies', q)).toBe(true)
    expect(isRewriteCorrect("admire Shakespeare's comedies ", q)).toBe(true)
    expect(isRewriteCorrect('do admire Shakespeare’s comedies', q)).toBe(true)
    expect(isRewriteCorrect('admire the comedies of Shakespeare', q)).toBe(true)
    expect(isRewriteCorrect('admired Shakespeare’s comedies', q)).toBe(false)
  })

  it('wp10 q4: contractions and a comma suffix', () => {
    const q = rewrite(writing, 'wp10-q4')
    expect(isRewriteCorrect("doesn't rain soon", q)).toBe(true)
    expect(isRewriteCorrect('doesn’t rain soon', q)).toBe(true)
    expect(isRewriteCorrect('does not rain soon', q)).toBe(true)
    expect(isRewriteCorrect('didn’t rain soon', q)).toBe(false)
    expect(isRewriteCorrect('rains soon', q)).toBe(false)
  })

  it('pt06 q49: suffix without punctuation, several accepted answers', () => {
    const q = rewrite(pt06, 'pt06-q49')
    for (const input of ['if she had written', 'whether she had written', 'If she wrote', 'WHETHER SHE WROTE']) {
      expect(isRewriteCorrect(input, q), input).toBe(true)
    }
    expect(isRewriteCorrect('if she write', q)).toBe(false)
    expect(isRewriteCorrect('that she had written', q)).toBe(false)
  })

  it('expands contractions on both sides (wp10 q3: you will / you’ll)', () => {
    const q = rewrite(writing, 'wp10-q3')
    expect(isRewriteCorrect('adding salt, you will spoil the dinner.', q)).toBe(true)
    expect(isRewriteCorrect('adding salt, you’ll spoil the dinner', q)).toBe(true)
    expect(isRewriteCorrect('adding salt, you would spoil the dinner', q)).toBe(false)
  })

  it('does not accept the answer of a different question', () => {
    expect(isRewriteCorrect('though he had', rewrite(writing, 'wp10-q4'))).toBe(false)
  })
})
