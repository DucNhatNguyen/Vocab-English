import { describe, expect, it } from 'vitest'
import { words as builtInWords } from '../data/index.ts'
import type { Word } from '../data/types.ts'
import {
  CHOICE_COUNT,
  answerQuestion,
  answeredCount,
  buildChoices,
  buildWordChoices,
  createQuizQueue,
  currentQuestion,
  isQuizDone,
  shuffle,
  type Rng,
} from './quiz.ts'
import { normalizeText } from './search.ts'

const word = (id: string, meaningVi = `nghĩa ${id}`): Word => ({
  id,
  word: id,
  ipa: '',
  pos: 'noun',
  meaningVi,
  exampleEn: '',
  exampleVi: '',
  level: 'A1',
  topics: [],
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

describe('shuffle', () => {
  it('returns a permutation without touching the input', () => {
    const input = [1, 2, 3, 4, 5, 6]
    const out = shuffle(input, seeded(1))
    expect(input).toEqual([1, 2, 3, 4, 5, 6])
    expect([...out].sort()).toEqual(input)
  })

  it('is deterministic for a given RNG', () => {
    expect(shuffle([1, 2, 3, 4, 5], seeded(7))).toEqual(shuffle([1, 2, 3, 4, 5], seeded(7)))
  })
})

describe('buildChoices', () => {
  const lesson = ['a', 'b', 'c', 'd', 'e'].map((id) => word(id))

  it('returns the right meaning plus three distractors, exactly one correct', () => {
    for (let seed = 0; seed < 30; seed++) {
      const choices = buildChoices(lesson[0], lesson, [], seeded(seed))
      expect(choices).toHaveLength(CHOICE_COUNT)
      expect(choices.filter((c) => c.correct)).toEqual([
        { wordId: 'a', text: 'nghĩa a', correct: true },
      ])
    }
  })

  it('prefers other words of the lesson over the pool', () => {
    const pool = ['p1', 'p2', 'p3', 'p4'].map((id) => word(id))
    for (let seed = 0; seed < 20; seed++) {
      const ids = buildChoices(lesson[0], lesson, pool, seeded(seed)).map((c) => c.wordId)
      expect(ids.every((id) => lesson.some((w) => w.id === id))).toBe(true)
    }
  })

  it('tops up from the pool when the lesson is too small', () => {
    const pool = ['p1', 'p2', 'p3', 'p4'].map((id) => word(id))
    const choices = buildChoices(lesson[0], [lesson[0], lesson[1]], pool, seeded(3))
    expect(choices).toHaveLength(4)
    expect(choices.some((c) => c.wordId === 'b')).toBe(true) // lesson word used first
    expect(choices.filter((c) => c.wordId.startsWith('p'))).toHaveLength(2)
  })

  it('never offers the same meaning twice, also ignoring case and accents', () => {
    const target = word('t', 'Kiên cường')
    const others = [
      word('dup1', 'kien cuong'), // same as target after normalising
      word('x1', 'Bền Vững'),
      word('x2', 'bên vung'), // same as x1 once accents are stripped
      word('x3', 'dễ vỡ'),
      word('x4', 'tiết kiệm'),
    ]
    for (let seed = 0; seed < 30; seed++) {
      const choices = buildChoices(target, [target, ...others], [], seeded(seed))
      const keys = choices.map((c) => normalizeText(c.text))
      expect(new Set(keys).size).toBe(keys.length)
      expect(keys).toContain('kien cuong')
      expect(choices.filter((c) => c.correct)).toHaveLength(1)
      expect(choices.find((c) => c.wordId === 'dup1')).toBeUndefined()
    }
  })

  it('returns fewer options only when the sources run out', () => {
    const choices = buildChoices(lesson[0], [lesson[0], lesson[1]], [], seeded(1))
    expect(choices.map((c) => c.wordId).sort()).toEqual(['a', 'b'])
  })

  it('randomises the position of the correct answer', () => {
    const positions = new Set<number>()
    for (let seed = 0; seed < 60; seed++) {
      positions.add(buildChoices(lesson[0], lesson, [], seeded(seed)).findIndex((c) => c.correct))
    }
    expect(positions.size).toBe(CHOICE_COUNT)
  })

  it('is deterministic for a given RNG and defaults to the built-in pool', () => {
    const target = builtInWords[0]
    const a = buildChoices(target, [target], builtInWords, seeded(5))
    const b = buildChoices(target, [target], builtInWords, seeded(5))
    expect(a).toEqual(b)
    expect(a).toHaveLength(CHOICE_COUNT)
    expect(buildChoices(target, [target]).length).toBe(CHOICE_COUNT)
  })
})

describe('buildWordChoices', () => {
  const w = (id: string, text: string, pos = 'noun'): Word => ({ ...word(id), word: text, pos })
  const target = w('t', 'resilient', 'adj')

  it('returns the target plus three other words, exactly one correct', () => {
    const pool = [target, ...['a', 'b', 'c', 'd', 'e'].map((id) => w(id, id))]
    for (let seed = 0; seed < 30; seed++) {
      const choices = buildWordChoices(target, pool, seeded(seed))
      expect(choices).toHaveLength(CHOICE_COUNT)
      expect(choices.filter((c) => c.correct)).toEqual([
        { wordId: 't', text: 'resilient', correct: true },
      ])
    }
  })

  it('prefers the same part of speech and falls back to other kinds', () => {
    const adjs = ['adj1', 'adj2', 'adj3'].map((id) => w(id, id, 'adj'))
    const nouns = ['n1', 'n2', 'n3', 'n4'].map((id) => w(id, id, 'noun'))
    for (let seed = 0; seed < 30; seed++) {
      const ids = buildWordChoices(target, [...nouns, target, ...adjs], seeded(seed)).map(
        (c) => c.wordId,
      )
      expect(ids.filter((id) => id.startsWith('adj'))).toHaveLength(3)
    }
    const topped = buildWordChoices(target, [target, adjs[0], ...nouns], seeded(1))
    expect(topped).toHaveLength(CHOICE_COUNT)
    expect(topped.some((c) => c.wordId === 'adj1')).toBe(true)
  })

  it('never repeats a headword (case and accents ignored) or offers the target twice', () => {
    const pool = [
      target,
      w('copy', 'Resilient', 'adj'), // same headword as the target
      w('x1', 'Sturdy', 'adj'),
      w('x2', 'sturdy', 'adj'), // same as x1
      w('x3', 'fragile', 'adj'),
      w('x4', 'tough', 'adj'),
    ]
    for (let seed = 0; seed < 30; seed++) {
      const choices = buildWordChoices(target, pool, seeded(seed))
      const keys = choices.map((c) => normalizeText(c.text))
      expect(new Set(keys).size).toBe(keys.length)
      expect(choices.find((c) => c.wordId === 'copy')).toBeUndefined()
      expect(choices.filter((c) => c.wordId === 't')).toHaveLength(1)
    }
  })

  it('returns fewer options only when the pool runs out, and works with an empty pool', () => {
    const small = buildWordChoices(target, [target, w('a', 'a')], seeded(1))
    expect(small.map((c) => c.wordId).sort()).toEqual(['a', 't'])
    expect(buildWordChoices(target, [], seeded(1))).toEqual([
      { wordId: 't', text: 'resilient', correct: true },
    ])
  })

  it('randomises the position of the correct answer and is deterministic per RNG', () => {
    const pool = ['a', 'b', 'c', 'd'].map((id) => w(id, id, 'adj'))
    const positions = new Set<number>()
    for (let seed = 0; seed < 60; seed++) {
      positions.add(buildWordChoices(target, pool, seeded(seed)).findIndex((c) => c.correct))
    }
    expect(positions.size).toBe(CHOICE_COUNT)
    expect(buildWordChoices(target, pool, seeded(9))).toEqual(
      buildWordChoices(target, pool, seeded(9)),
    )
  })
})

describe('quiz queue', () => {
  it('asks every word once, in a shuffled order, ignoring duplicate ids', () => {
    const queue = createQuizQueue(['a', 'b', 'c', 'a'], seeded(2))
    expect(queue.total).toBe(3)
    expect([...queue.remaining].sort()).toEqual(['a', 'b', 'c'])
    expect(queue.mistakes).toBe(0)
    expect(isQuizDone(queue)).toBe(false)
  })

  it('removes a word answered correctly', () => {
    let queue = createQuizQueue(['a', 'b'], () => 0.99) // identity-ish order
    const first = currentQuestion(queue)!
    queue = answerQuestion(queue, true)
    expect(queue.remaining).not.toContain(first)
    expect(answeredCount(queue)).toBe(1)
  })

  it('puts a wrong word at the end and asks it again until correct', () => {
    let queue = createQuizQueue(['a', 'b', 'c'], () => 0.99)
    const order = [...queue.remaining]

    queue = answerQuestion(queue, false) // first word wrong
    expect(queue.remaining).toEqual([order[1], order[2], order[0]])
    expect(queue.mistakes).toBe(1)
    expect(answeredCount(queue)).toBe(0)

    queue = answerQuestion(queue, true)
    queue = answerQuestion(queue, true)
    expect(currentQuestion(queue)).toBe(order[0]) // asked again at the end
    queue = answerQuestion(queue, false)
    expect(currentQuestion(queue)).toBe(order[0]) // alone in the queue: still asked
    expect(queue.mistakes).toBe(2)
    queue = answerQuestion(queue, true)
    expect(isQuizDone(queue)).toBe(true)
    expect(answeredCount(queue)).toBe(3)
  })

  it('does not change the original state and ignores answers once done', () => {
    const queue = createQuizQueue(['a'], seeded(1))
    const after = answerQuestion(queue, true)
    expect(queue.remaining).toEqual(['a'])
    expect(isQuizDone(after)).toBe(true)
    expect(answerQuestion(after, false)).toBe(after)
    expect(currentQuestion(after)).toBeUndefined()
  })

  it('handles an empty quiz', () => {
    const queue = createQuizQueue([])
    expect(isQuizDone(queue)).toBe(true)
    expect(queue.total).toBe(0)
  })
})
