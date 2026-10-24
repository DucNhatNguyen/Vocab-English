import type { Word } from '../../data/types.ts'
import type { ReviewOutcome } from '../../db/review.ts'
import {
  answerQuestion,
  currentQuestion,
  isQuizDone,
  type QuizQueue,
  type Rng,
} from '../../lib/quiz.ts'
import { buildQuestion, type Question } from '../../lib/review.ts'

/** What stays fixed during a review round. */
export interface RoundSetup {
  /** The word of every card in the round. */
  words: ReadonlyMap<string, Word>
  /**
   * Level each card had when the round started. It decides the question types for the whole
   * round, also for a re-ask after the first answer already changed the card in the database.
   */
  levels: ReadonlyMap<string, number>
  /** Every word that can be a distractor. */
  pool: readonly Word[]
  speechSupported: boolean
}

/** The part of a round that changes with every answer. */
export interface RoundState {
  /** Words still to be answered correctly; the head is the current question. */
  queue: QuizQueue
  question: Question
  /** Words whose first answer was wrong: they are being re-asked and no longer count. */
  wrongOnce: ReadonlySet<string>
  /** Increments per question shown, so a re-ask gets a fresh question component. */
  step: number
}

/** The first answer of a word in a round, as it was written to the database. */
export interface AnswerEntry {
  wordId: string
  word: Word
  /** Level at round start. */
  level: number
  correct: boolean
  /** Local date of the answer. */
  day: string
  write: Promise<ReviewOutcome | null>
}

function questionFor(setup: RoundSetup, wordId: string, rng: Rng): Question {
  const word = setup.words.get(wordId)
  if (!word) throw new RangeError(`Unknown word in round: ${wordId}`)
  return buildQuestion(
    word,
    setup.levels.get(wordId) ?? 1,
    {
      pool: setup.pool,
      roundWords: [...setup.words.values()],
      speechSupported: setup.speechSupported,
    },
    rng,
  )
}

/** First state of a round over `wordIds` (asked in the given order); null for an empty round. */
export function startRound(
  setup: RoundSetup,
  wordIds: readonly string[],
  rng: Rng = Math.random,
): RoundState | null {
  const unique = [...new Set(wordIds)]
  if (unique.length === 0) return null
  return {
    queue: { remaining: unique, total: unique.length, mistakes: 0 },
    question: questionFor(setup, unique[0], rng),
    wrongOnce: new Set(),
    step: 0,
  }
}

/** True when the current question is a re-ask of a word answered wrongly before. */
export function isRetry(state: RoundState): boolean {
  return state.wrongOnce.has(state.question.word.id)
}

/**
 * State after the current question was answered. A wrong word goes to the end of the queue
 * and is asked again with a freshly chosen type; a correct one leaves it. Null when the round
 * is finished.
 */
export function advanceRound(
  setup: RoundSetup,
  state: RoundState,
  correct: boolean,
  rng: Rng = Math.random,
): RoundState | null {
  const answeredId = currentQuestion(state.queue)
  const queue = answerQuestion(state.queue, correct)
  if (isQuizDone(queue)) return null

  const wrongOnce =
    correct || answeredId === undefined ? state.wrongOnce : new Set(state.wrongOnce).add(answeredId)
  return {
    queue,
    question: questionFor(setup, currentQuestion(queue)!, rng),
    wrongOnce,
    step: state.step + 1,
  }
}
