import type { ChoiceQuestion, ExerciseSection, RewriteQuestion } from '../data/exercises/types.ts'
import type { ExerciseAnswer } from '../db/types.ts'
import { joinRewrite } from './exercises.ts'

/** Pure text helpers for the exercise screens: passages with blanks, prompts with gaps, rewrite lines. */

export type PassagePart = { kind: 'text'; text: string } | { kind: 'blank'; number: number }

const BLANK = /\{\{(\d+)\}\}/g

/** One passage as a list of paragraphs, each cut into plain text and numbered blanks ("{{38}}"). */
export function passageParagraphs(text: string): PassagePart[][] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '')
    .map((paragraph) => {
      const parts: PassagePart[] = []
      let last = 0
      for (const match of paragraph.matchAll(BLANK)) {
        if (match.index > last) parts.push({ kind: 'text', text: paragraph.slice(last, match.index) })
        parts.push({ kind: 'blank', number: Number(match[1]) })
        last = match.index + match[0].length
      }
      if (last < paragraph.length) parts.push({ kind: 'text', text: paragraph.slice(last) })
      return parts
    })
}

/** What a numbered blank of a cloze passage shows once its question was answered. */
export interface BlankState {
  /** The word the user picked. */
  chosen: string
  /** The right word. */
  answer: string
  correct: boolean
}

/** State of every answered blank of a cloze section, by blank number (= question number). */
export function clozeBlankStates(
  section: Pick<ExerciseSection, 'questions'>,
  answers: Readonly<Record<string, ExerciseAnswer>>,
): Map<number, BlankState> {
  const states = new Map<number, BlankState>()
  for (const question of section.questions) {
    if (question.type !== 'choice') continue
    const given = answers[question.id]
    if (given === undefined) continue
    states.set(question.number, {
      chosen: question.options[Number(given.value)] ?? '',
      answer: question.options[question.answer] ?? '',
      correct: given.correct,
    })
  }
  return states
}

export type PromptPart = { kind: 'text'; text: string } | { kind: 'gap' }

const GAP = /_{3,}/g

/**
 * A question prompt as lines (dialogue turns are separated by "\n"), each cut into plain text and
 * gaps ("___").
 */
export function parsePrompt(prompt: string): PromptPart[][] {
  return prompt
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const parts: PromptPart[] = []
      let last = 0
      for (const match of line.matchAll(GAP)) {
        if (match.index > last) parts.push({ kind: 'text', text: line.slice(last, match.index) })
        parts.push({ kind: 'gap' })
        last = match.index + match[0].length
      }
      if (last < line.length) parts.push({ kind: 'text', text: line.slice(last) })
      return parts
    })
}

/** True when the question is a cloze item: a choice without a prompt, the blank is in the passage. */
export function isClozeQuestion(question: ChoiceQuestion): boolean {
  return question.prompt === undefined
}

/**
 * The part of a rewritten sentence after the fixed prefix, as shown next to it: the text and the
 * suffix, joined without a space before punctuation. Whitespace (also line breaks) is collapsed.
 */
export function rewriteTail(question: Pick<RewriteQuestion, 'suffix'>, text: string): string {
  return joinRewrite({ prefix: '', suffix: question.suffix }, text.replace(/\s+/g, ' '))
}
