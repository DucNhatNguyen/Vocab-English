import { describe, expect, it } from 'vitest'
import { words as builtInWords } from '../../data/index.ts'
import type { Word } from '../../data/types.ts'
import type { Rng } from '../../lib/quiz.ts'
import { advanceRound, isRetry, startRound, type RoundSetup, type RoundState } from './round.ts'

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

const pick = (id: string): Word => builtInWords.find((w) => w.id === id)!
const IDS = ['hello', 'goodbye', 'please']

function setupWith(levels: Record<string, number>, speechSupported = true): RoundSetup {
  const words = new Map(Object.keys(levels).map((id) => [id, pick(id)]))
  return { words, levels: new Map(Object.entries(levels)), pool: builtInWords, speechSupported }
}

const currentId = (state: RoundState) => state.question.word.id

describe('review round state', () => {
  it('starts on the first word, in the given order, and is empty for no words', () => {
    const setup = setupWith({ hello: 1, goodbye: 1, please: 1 })
    const state = startRound(setup, IDS, seeded(1))!
    expect(currentId(state)).toBe('hello')
    expect(state.queue.total).toBe(3)
    expect(state.queue.remaining).toEqual(IDS)
    expect(isRetry(state)).toBe(false)
    expect(startRound(setup, [], seeded(1))).toBeNull()
  })

  it('moves on after a correct answer and finishes after the last word', () => {
    const setup = setupWith({ hello: 1, goodbye: 1, please: 1 })
    let state = startRound(setup, IDS, seeded(1))!
    const order: string[] = []
    for (let guard = 0; guard < 10; guard++) {
      order.push(currentId(state))
      const next = advanceRound(setup, state, true, seeded(guard))
      if (!next) break
      state = next
    }
    expect(order).toEqual(IDS)
  })

  it('re-asks a wrong word at the end until it is answered correctly', () => {
    const setup = setupWith({ hello: 1, goodbye: 1, please: 1 })
    let state = startRound(setup, IDS, seeded(1))!
    const asked: Array<[string, boolean]> = []
    const answers = [false, true, true, false, true] // hello wrong, goodbye ok, please ok, hello wrong again, hello ok
    for (const correct of answers) {
      asked.push([currentId(state), isRetry(state)])
      const next = advanceRound(setup, state, correct, seeded(asked.length))
      if (!next) {
        state = undefined as never
        break
      }
      state = next
    }
    expect(asked).toEqual([
      ['hello', false],
      ['goodbye', false],
      ['please', false],
      ['hello', true],
      ['hello', true],
    ])
    expect(state).toBeUndefined() // finished
  })

  it('only the first ask of a word is not a retry, and a correct first answer never returns', () => {
    const setup = setupWith({ hello: 1, goodbye: 1 })
    let state = startRound(setup, ['hello', 'goodbye'], seeded(1))!
    state = advanceRound(setup, state, true, seeded(2))! // hello right
    expect(currentId(state)).toBe('goodbye')
    expect(isRetry(state)).toBe(false)
    state = advanceRound(setup, state, false, seeded(3))! // goodbye wrong
    expect(currentId(state)).toBe('goodbye')
    expect(isRetry(state)).toBe(true)
    expect(state.queue.remaining).toEqual(['goodbye'])
    expect(state.queue.mistakes).toBe(1)
  })

  it('counts progress as words answered correctly', () => {
    const setup = setupWith({ hello: 1, goodbye: 1, please: 1 })
    let state = startRound(setup, IDS, seeded(1))!
    state = advanceRound(setup, state, false, seeded(2))!
    expect(state.queue.total - state.queue.remaining.length).toBe(0)
    state = advanceRound(setup, state, true, seeded(3))!
    expect(state.queue.total - state.queue.remaining.length).toBe(1)
  })

  it('gives every shown question a new step number', () => {
    const setup = setupWith({ hello: 1, goodbye: 1 })
    let state = startRound(setup, ['hello', 'goodbye'], seeded(1))!
    const steps = [state.step]
    state = advanceRound(setup, state, false, seeded(2))!
    steps.push(state.step)
    state = advanceRound(setup, state, true, seeded(3))!
    steps.push(state.step)
    expect(steps).toEqual([0, 1, 2])
  })

  it('draws every question type from the level at round start, also for re-asks', () => {
    // Level 1 cards: only types 1-3, however often they are re-asked
    const setup = setupWith({ hello: 1 })
    for (let seed = 0; seed < 100; seed++) {
      let state = startRound(setup, ['hello'], seeded(seed))!
      for (let i = 0; i < 4; i++) {
        expect([1, 2, 3]).toContain(state.question.type)
        state = advanceRound(setup, state, false, seeded(seed * 10 + i))!
      }
    }
    // Level 5 cards: only 3-5
    const high = setupWith({ hello: 5 })
    for (let seed = 0; seed < 100; seed++) {
      const state = startRound(high, ['hello'], seeded(seed))!
      expect([3, 4, 5]).toContain(state.question.type)
    }
  })

  it('picks a different type for a re-ask at least sometimes', () => {
    const setup = setupWith({ hello: 3 })
    const changed = Array.from({ length: 60 }, (_, seed) => {
      const first = startRound(setup, ['hello'], seeded(seed))!
      const again = advanceRound(setup, first, false, seeded(seed + 1000))!
      return first.question.type !== again.question.type
    })
    expect(changed).toContain(true)
  })

  it('avoids the listening types without speech support', () => {
    const setup = setupWith({ hello: 3 }, false)
    for (let seed = 0; seed < 100; seed++) {
      expect([1, 3, 4]).toContain(startRound(setup, ['hello'], seeded(seed))!.question.type)
    }
  })
})
