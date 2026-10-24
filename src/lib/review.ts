import type { Word } from '../data/types.ts'
import type { CardProgress } from '../db/types.ts'
import { findBlank, type Blank } from './blank.ts'
import { buildChoices, buildWordChoices, shuffle, type Choice, type Rng } from './quiz.ts'
import { isDue } from './srs.ts'

/** Most words in one review round; the rest wait for "Ôn tiếp". */
export const REVIEW_ROUND_SIZE = 20

/* ---------------------------------------------------------------- round selection */

export interface RoundSelection<T> {
  /** Cards of this round, in random order. */
  round: T[]
  /** Due cards that did not fit and wait for the next round. */
  remaining: number
}

/**
 * Picks the cards of the next round: every due card (`isDue`), shuffled, at most `size`.
 * Learned, non-ignored cards whose `dueDate` is today or earlier are due.
 */
export function selectReviewRound<T extends CardProgress>(
  progress: Iterable<T>,
  today: string,
  rng: Rng = Math.random,
  size: number = REVIEW_ROUND_SIZE,
): RoundSelection<T> {
  const due = shuffle(
    [...progress].filter((p) => isDue(p, today)),
    rng,
  )
  const round = due.slice(0, Math.max(0, size))
  return { round, remaining: due.length - round.length }
}

/* ---------------------------------------------------------------- next review / overview */

export interface NextReview {
  /** Earliest future due date, "YYYY-MM-DD". */
  date: string
  /** Learned, non-ignored cards due on that date. */
  count: number
}

/**
 * The next review day after `today`: the earliest `dueDate` later than today among learned,
 * non-ignored cards, with how many cards share it. Null when no such card exists. Cards that
 * are already due are not "next"; they are the current round.
 */
export function getNextReview(progress: Iterable<CardProgress>, today: string): NextReview | null {
  let next: NextReview | null = null
  for (const p of progress) {
    if (p.level < 1 || p.ignored || p.dueDate === undefined || p.dueDate <= today) continue
    if (next === null || p.dueDate < next.date) next = { date: p.dueDate, count: 1 }
    else if (p.dueDate === next.date) next.count += 1
  }
  return next
}

export interface ReviewOverview {
  /** Cards due today or earlier. */
  dueCount: number
  /** Due cards per memory level (index 1-5; index 0 unused). */
  dueByLevel: [number, number, number, number, number, number]
  /** Cards that have been learned at all (level >= 1), ignored ones included. */
  learnedCount: number
  /** Learned cards that take part in reviews (not ignored). */
  activeCount: number
  next: NextReview | null
}

/** Everything the review start screen (and Home) shows about the state of the reviews. */
export function getReviewOverview(
  progress: Iterable<CardProgress>,
  today: string,
): ReviewOverview {
  const cards = [...progress]
  const dueByLevel: ReviewOverview['dueByLevel'] = [0, 0, 0, 0, 0, 0]
  let dueCount = 0
  let learnedCount = 0
  let activeCount = 0
  for (const p of cards) {
    if (p.level < 1) continue
    learnedCount += 1
    if (!p.ignored) activeCount += 1
    if (isDue(p, today)) {
      dueCount += 1
      dueByLevel[p.level] += 1
    }
  }
  return { dueCount, dueByLevel, learnedCount, activeCount, next: getNextReview(cards, today) }
}

/* ---------------------------------------------------------------- question types */

/**
 * 1 English word -> pick the Vietnamese meaning
 * 2 listen -> pick the English word
 * 3 fill the blank in the example sentence (pick the word)
 * 4 Vietnamese meaning -> type the English word
 * 5 listen -> type the word
 */
export type QuestionType = 1 | 2 | 3 | 4 | 5

/** Question types a card of `level` may get (spec 3.1). */
export function allowedQuestionTypes(level: number): QuestionType[] {
  if (level <= 2) return [1, 2, 3]
  if (level === 3) return [1, 2, 3, 4, 5]
  return [3, 4, 5]
}

/** Types 2 and 5 are played from speech synthesis. */
export const LISTENING_TYPES: readonly QuestionType[] = [2, 5]

export function isListeningType(type: QuestionType): boolean {
  return LISTENING_TYPES.includes(type)
}

/**
 * Random question type for a card at round start. Types that cannot work for this card are
 * skipped (3 without a findable blank, 2 and 5 without speech); with nothing left, type 1,
 * which always works.
 */
export function chooseQuestionType(
  word: Word,
  level: number,
  speechSupported: boolean,
  rng: Rng = Math.random,
): QuestionType {
  const possible = allowedQuestionTypes(level).filter((type) => {
    if (type === 3) return findBlank(word.exampleEn, word.word) !== null
    if (isListeningType(type)) return speechSupported
    return true
  })
  if (possible.length === 0) return 1
  return possible[Math.floor(rng() * possible.length)]
}

export type Question =
  | { type: 1; word: Word; choices: Choice[] }
  | { type: 2; word: Word; choices: Choice[] }
  | { type: 3; word: Word; choices: Choice[]; blank: Blank }
  | { type: 4; word: Word }
  | { type: 5; word: Word }

export interface QuestionContext {
  /** Every word that may serve as a distractor (built-in plus the user's own). */
  pool: readonly Word[]
  /** Words of the current round; preferred as meaning distractors for type 1. */
  roundWords: readonly Word[]
  speechSupported: boolean
}

/**
 * Builds the question of `word` for a card that started the round at `level`. Used for the
 * first ask and again, with a fresh random type, when a wrong word is asked once more.
 */
export function buildQuestion(
  word: Word,
  level: number,
  { pool, roundWords, speechSupported }: QuestionContext,
  rng: Rng = Math.random,
): Question {
  const type = chooseQuestionType(word, level, speechSupported, rng)
  switch (type) {
    case 1:
      return { type, word, choices: buildChoices(word, roundWords, pool, rng) }
    case 2:
      return { type, word, choices: buildWordChoices(word, pool, rng) }
    case 3: {
      // chooseQuestionType only returns 3 when a blank exists
      const blank = findBlank(word.exampleEn, word.word)!
      return { type, word, choices: buildWordChoices(word, pool, rng), blank }
    }
    case 4:
      return { type, word }
    case 5:
      return { type, word }
  }
}

/* ---------------------------------------------------------------- typed answers */

/** Typed input as compared: trimmed, inner whitespace collapsed, straight apostrophes, lower case. */
export function normalizeTypedAnswer(s: string): string {
  return s
    .normalize('NFC')
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function isTypedAnswerCorrect(input: string, answer: string): boolean {
  const typed = normalizeTypedAnswer(input)
  return typed !== '' && typed === normalizeTypedAnswer(answer)
}
