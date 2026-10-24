import { words as builtInWords } from '../data/index.ts'
import type { Word } from '../data/types.ts'
import { normalizeText } from './search.ts'

/** Random number source in [0, 1); injectable so tests are deterministic. */
export type Rng = () => number

export const CHOICE_COUNT = 4

/** Fisher-Yates shuffle into a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export interface Choice {
  /** Word this option is the meaning of; used as the option key. */
  wordId: string
  text: string
  correct: boolean
}

/**
 * Options for "pick the Vietnamese meaning of `target`": the right meaning plus up to
 * `CHOICE_COUNT - 1` distractors, in random order. Distractors are meanings of other words,
 * preferring `lessonWords`, then topped up from `pool`. Every option is distinct after
 * `normalizeText`, so two words sharing a meaning never both appear. Fewer than the wanted
 * distractors are returned only when the sources run out.
 */
export function buildChoices(
  target: Word,
  lessonWords: readonly Word[],
  pool: readonly Word[] = builtInWords,
  rng: Rng = Math.random,
): Choice[] {
  const used = new Set([normalizeText(target.meaningVi)])
  const choices: Choice[] = [{ wordId: target.id, text: target.meaningVi, correct: true }]

  for (const source of [lessonWords, pool]) {
    for (const word of shuffle(source, rng)) {
      if (choices.length >= CHOICE_COUNT) break
      const key = normalizeText(word.meaningVi)
      if (key === '' || used.has(key)) continue
      used.add(key)
      choices.push({ wordId: word.id, text: word.meaningVi, correct: false })
    }
  }
  return shuffle(choices, rng)
}

/**
 * Quick-check queue: each word is asked until answered correctly. A wrong answer moves the
 * word to the end of the queue; a correct one removes it. State is immutable.
 */
export interface QuizQueue {
  /** Word ids still to be answered correctly; the head is the current question. */
  remaining: readonly string[]
  /** Number of distinct words in the quiz. */
  total: number
  /** Wrong answers so far (for the summary / future stats). */
  mistakes: number
}

export function createQuizQueue(wordIds: readonly string[], rng: Rng = Math.random): QuizQueue {
  const unique = [...new Set(wordIds)]
  return { remaining: shuffle(unique, rng), total: unique.length, mistakes: 0 }
}

export function currentQuestion(queue: QuizQueue): string | undefined {
  return queue.remaining[0]
}

export function isQuizDone(queue: QuizQueue): boolean {
  return queue.remaining.length === 0
}

/** Words answered correctly so far. */
export function answeredCount(queue: QuizQueue): number {
  return queue.total - queue.remaining.length
}

/** Records the answer to the current question. No-op when the quiz is already done. */
export function answerQuestion(queue: QuizQueue, correct: boolean): QuizQueue {
  const [head, ...rest] = queue.remaining
  if (head === undefined) return queue
  return correct
    ? { ...queue, remaining: rest }
    : { ...queue, remaining: [...rest, head], mistakes: queue.mistakes + 1 }
}
