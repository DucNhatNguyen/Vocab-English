import { describe, expect, it } from 'vitest'
import { words as builtInWords } from '../data/index.ts'
import type { Word } from '../data/types.ts'
import type { CardProgress } from '../db/types.ts'
import {
  REVIEW_ROUND_SIZE,
  allowedQuestionTypes,
  buildQuestion,
  chooseQuestionType,
  getNextReview,
  getReviewOverview,
  isListeningType,
  isTypedAnswerCorrect,
  normalizeTypedAnswer,
  selectReviewRound,
  type QuestionType,
} from './review.ts'
import type { Rng } from './quiz.ts'

const TODAY = '2026-10-24'

const card = (wordId: string, over: Partial<CardProgress> = {}): CardProgress => ({
  wordId,
  level: 1,
  dueDate: TODAY,
  learnedAt: '2026-10-01',
  correctCount: 0,
  wrongCount: 0,
  favorite: false,
  ignored: false,
  ...over,
})

const word = (id: string, over: Partial<Word> = {}): Word => ({
  id,
  word: id,
  ipa: '',
  pos: 'noun',
  meaningVi: `nghĩa ${id}`,
  exampleEn: `This sentence uses ${id} once.`,
  exampleVi: '',
  level: 'A1',
  topics: [],
  ...over,
})

/** Deterministic RNG (mulberry32). */
function seeded(seed: number): Rng {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** RNG that returns the given values in turn (then repeats the last one). */
const sequence =
  (...values: number[]): Rng =>
  () =>
    values.length > 1 ? values.shift()! : values[0]

describe('selectReviewRound', () => {
  it('keeps only due cards: learned, not ignored, dueDate <= today', () => {
    const cards = [
      card('due-today', { dueDate: TODAY }),
      card('overdue', { dueDate: '2026-10-01' }),
      card('tomorrow', { dueDate: '2026-10-25' }),
      card('ignored', { ignored: true }),
      card('level0', { level: 0, dueDate: undefined }),
    ]
    const { round, remaining } = selectReviewRound(cards, TODAY, seeded(1))
    expect(round.map((c) => c.wordId).sort()).toEqual(['due-today', 'overdue'])
    expect(remaining).toBe(0)
  })

  it('caps a round at 20 cards and reports the rest', () => {
    const cards = Array.from({ length: 27 }, (_, i) => card(`w${i}`))
    const { round, remaining } = selectReviewRound(cards, TODAY, seeded(2))
    expect(REVIEW_ROUND_SIZE).toBe(20)
    expect(round).toHaveLength(20)
    expect(remaining).toBe(7)
    expect(new Set(round.map((c) => c.wordId)).size).toBe(20)
  })

  it('shuffles with the injected RNG, deterministically', () => {
    const cards = Array.from({ length: 12 }, (_, i) => card(`w${i}`))
    const a = selectReviewRound(cards, TODAY, seeded(5)).round.map((c) => c.wordId)
    const b = selectReviewRound(cards, TODAY, seeded(5)).round.map((c) => c.wordId)
    const c = selectReviewRound(cards, TODAY, seeded(6)).round.map((c) => c.wordId)
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
    expect([...a].sort()).toEqual(cards.map((x) => x.wordId).sort())
  })

  it('returns an empty round when nothing is due, and does not mutate the input', () => {
    const cards = [card('later', { dueDate: '2026-11-01' })]
    expect(selectReviewRound(cards, TODAY)).toEqual({ round: [], remaining: 0 })
    expect(cards).toHaveLength(1)
  })

  it('honours a custom size', () => {
    const cards = Array.from({ length: 5 }, (_, i) => card(`w${i}`))
    const { round, remaining } = selectReviewRound(cards, TODAY, seeded(1), 3)
    expect([round.length, remaining]).toEqual([3, 2])
  })
})

describe('getNextReview', () => {
  it('is the earliest future date with the number of cards on it', () => {
    const cards = [
      card('a', { dueDate: '2026-10-27' }),
      card('b', { dueDate: '2026-10-26' }),
      card('c', { dueDate: '2026-10-26' }),
      card('d', { dueDate: '2026-11-30' }),
    ]
    expect(getNextReview(cards, TODAY)).toEqual({ date: '2026-10-26', count: 2 })
  })

  it('counts a single card, and works when the earliest card is listed last', () => {
    const cards = [card('a', { dueDate: '2026-11-30' }), card('b', { dueDate: '2026-10-25' })]
    expect(getNextReview(cards, TODAY)).toEqual({ date: '2026-10-25', count: 1 })
  })

  it('ignores due, ignored and unlearned cards', () => {
    const cards = [
      card('due', { dueDate: TODAY }),
      card('overdue', { dueDate: '2026-10-20' }),
      card('ignored', { dueDate: '2026-10-25', ignored: true }),
      card('level0', { level: 0, dueDate: undefined }),
      card('later', { dueDate: '2026-10-30' }),
    ]
    expect(getNextReview(cards, TODAY)).toEqual({ date: '2026-10-30', count: 1 })
  })

  it('is null when no card is scheduled in the future', () => {
    expect(getNextReview([], TODAY)).toBeNull()
    expect(getNextReview([card('due', { dueDate: TODAY })], TODAY)).toBeNull()
  })
})

describe('getReviewOverview', () => {
  it('counts due cards per level and the next review', () => {
    const cards = [
      card('a', { level: 1 }),
      card('b', { level: 1, dueDate: '2026-10-20' }),
      card('c', { level: 3 }),
      card('d', { level: 5, dueDate: '2026-11-23' }),
      card('e', { level: 2, ignored: true }),
      card('f', { level: 0, dueDate: undefined, favorite: true }),
    ]
    expect(getReviewOverview(cards, TODAY)).toEqual({
      dueCount: 3,
      dueByLevel: [0, 2, 0, 1, 0, 0],
      learnedCount: 5,
      activeCount: 4,
      next: { date: '2026-11-23', count: 1 },
    })
  })

  it('tells "nothing learned" from "everything ignored"', () => {
    expect(getReviewOverview([], TODAY)).toMatchObject({ learnedCount: 0, activeCount: 0 })
    expect(getReviewOverview([card('a', { ignored: true })], TODAY)).toMatchObject({
      learnedCount: 1,
      activeCount: 0,
      dueCount: 0,
      next: null,
    })
  })
})

describe('allowedQuestionTypes', () => {
  it('follows the level table of the spec', () => {
    expect(allowedQuestionTypes(1)).toEqual([1, 2, 3])
    expect(allowedQuestionTypes(2)).toEqual([1, 2, 3])
    expect(allowedQuestionTypes(3)).toEqual([1, 2, 3, 4, 5])
    expect(allowedQuestionTypes(4)).toEqual([3, 4, 5])
    expect(allowedQuestionTypes(5)).toEqual([3, 4, 5])
  })
})

describe('chooseQuestionType', () => {
  const withBlank = word('resilient', { exampleEn: 'Resilient people recover.' })
  const noBlank = word('resilient', { exampleEn: 'Nothing matches here.' })

  const seen = (w: Word, level: number, speech: boolean): Set<QuestionType> => {
    const types = new Set<QuestionType>()
    for (let seed = 0; seed < 200; seed++) {
      types.add(chooseQuestionType(w, level, speech, seeded(seed)))
    }
    return types
  }

  it('only returns types allowed for the level', () => {
    expect([...seen(withBlank, 1, true)].sort()).toEqual([1, 2, 3])
    expect([...seen(withBlank, 3, true)].sort()).toEqual([1, 2, 3, 4, 5])
    expect([...seen(withBlank, 5, true)].sort()).toEqual([3, 4, 5])
  })

  it('picks uniformly among the possible types by index of the RNG', () => {
    expect(chooseQuestionType(withBlank, 3, true, () => 0)).toBe(1)
    expect(chooseQuestionType(withBlank, 3, true, () => 0.45)).toBe(3)
    expect(chooseQuestionType(withBlank, 3, true, () => 0.999)).toBe(5)
  })

  it('skips type 3 when the headword is not in the example', () => {
    expect([...seen(noBlank, 1, true)].sort()).toEqual([1, 2])
    expect([...seen(noBlank, 4, true)].sort()).toEqual([4, 5])
  })

  it('skips the listening types 2 and 5 without speech', () => {
    expect([...seen(withBlank, 1, false)].sort()).toEqual([1, 3])
    expect([...seen(withBlank, 3, false)].sort()).toEqual([1, 3, 4])
    expect([...seen(withBlank, 5, false)].sort()).toEqual([3, 4])
  })

  it('falls back to type 1 when no allowed type works', () => {
    // level 1-2: 1/2/3 -> without blank and speech only 1 is left
    expect(chooseQuestionType(noBlank, 1, false, seeded(1))).toBe(1)
    // level 4-5: 3/4/5 -> without blank and speech the typed type 4 still works
    expect(chooseQuestionType(noBlank, 5, false, seeded(1))).toBe(4)
    // a card with an empty example and no way to type: nothing but type 1 is allowed
    expect(chooseQuestionType(word('x', { exampleEn: '' }), 2, false, seeded(3))).toBe(1)
  })

  it('classifies listening types', () => {
    expect([1, 2, 3, 4, 5].filter((t) => isListeningType(t as QuestionType))).toEqual([2, 5])
  })
})

describe('buildQuestion', () => {
  const pool = builtInWords
  const target = builtInWords.find((w) => w.word === 'resilient') ?? builtInWords[0]
  const ctx = { pool, roundWords: builtInWords.slice(0, 8), speechSupported: true }

  /** Finds an RNG seed that yields the wanted type (the type is the first RNG draw). */
  const build = (type: QuestionType, level: number) => {
    for (let seed = 0; seed < 500; seed++) {
      const q = buildQuestion(target, level, ctx, seeded(seed))
      if (q.type === type) return q
    }
    throw new Error(`no seed for type ${type}`)
  }

  it('type 1 offers the meaning of the word among 4 distinct meanings', () => {
    const q = build(1, 3)
    if (q.type !== 1) throw new Error('type')
    expect(q.choices).toHaveLength(4)
    expect(q.choices.filter((c) => c.correct).map((c) => c.text)).toEqual([target.meaningVi])
    expect(new Set(q.choices.map((c) => c.text)).size).toBe(4)
  })

  it('types 2 and 3 offer 4 distinct headwords including the target, preferring the same pos', () => {
    for (const type of [2, 3] as const) {
      const q = build(type, 3)
      if (q.type !== 2 && q.type !== 3) throw new Error('type')
      expect(q.choices).toHaveLength(4)
      expect(q.choices.filter((c) => c.correct).map((c) => c.text)).toEqual([target.word])
      expect(new Set(q.choices.map((c) => c.text.toLowerCase())).size).toBe(4)
      // 82 nouns/10 adjectives: with enough same-pos words every distractor shares the pos
      const sameCount = q.choices.filter((c) => pool.find((w) => w.id === c.wordId)?.pos === target.pos)
      expect(sameCount).toHaveLength(4)
    }
  })

  it('type 3 carries the blank of the example sentence', () => {
    const q = build(3, 5)
    if (q.type !== 3) throw new Error('type')
    expect(q.blank.parts.length).toBeGreaterThanOrEqual(2)
    expect(q.blank.parts.join(q.blank.surface)).toBe(target.exampleEn)
  })

  it('types 4 and 5 are bare questions about the word', () => {
    expect(build(4, 5)).toEqual({ type: 4, word: target })
    expect(build(5, 5)).toEqual({ type: 5, word: target })
  })

  it('never builds a type the card cannot do', () => {
    const noExample = word('plain', { exampleEn: '', pos: 'noun' })
    for (let seed = 0; seed < 100; seed++) {
      const q = buildQuestion(noExample, 4, { ...ctx, speechSupported: false }, seeded(seed))
      expect(q.type).toBe(4)
    }
  })

  it('gives a re-asked word a freshly chosen type for the same level', () => {
    const types = new Set(
      Array.from({ length: 100 }, (_, seed) => buildQuestion(target, 3, ctx, seeded(seed)).type),
    )
    expect(types.size).toBeGreaterThan(1)
  })

  it('draws the type first so a scripted RNG can force it', () => {
    const q = buildQuestion(target, 3, ctx, sequence(0.7, 0.1, 0.2, 0.3))
    expect(q.type).toBe(4)
  })
})

describe('typed answers', () => {
  it('ignores case, outer and repeated inner whitespace', () => {
    expect(isTypedAnswerCorrect('  Resilient ', 'resilient')).toBe(true)
    expect(isTypedAnswerCorrect('THANK    YOU', 'thank you')).toBe(true)
    expect(isTypedAnswerCorrect('thank\tyou', 'Thank you')).toBe(true)
  })

  it('treats curly apostrophes as straight', () => {
    expect(isTypedAnswerCorrect('don’t', "don't")).toBe(true)
    expect(isTypedAnswerCorrect("don't", 'don’t')).toBe(true)
    expect(normalizeTypedAnswer('‘it’s’')).toBe("'it's'")
  })

  it('rejects wrong, partial and empty input', () => {
    expect(isTypedAnswerCorrect('resilien', 'resilient')).toBe(false)
    expect(isTypedAnswerCorrect('thankyou', 'thank you')).toBe(false)
    expect(isTypedAnswerCorrect('', 'resilient')).toBe(false)
    expect(isTypedAnswerCorrect('   ', 'resilient')).toBe(false)
    expect(isTypedAnswerCorrect('', '')).toBe(false)
  })
})
