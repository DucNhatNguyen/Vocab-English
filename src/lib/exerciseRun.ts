import type { ExerciseSection, ExerciseSet, Question } from '../data/exercises/types.ts'
import type { ExerciseAnswer } from '../db/types.ts'
import { flattenQuestions, sectionInfo, type SectionKind } from './exercises.ts'

/** Pure logic of an exercise run: the question sequence, where to resume, and the scores of the summary. */

export type Answers = Readonly<Record<string, ExerciseAnswer>>

/** One question of a run, with what it needs to be shown and saved. Retry runs mix several sets. */
export interface RunItem {
  set: ExerciseSet
  section: ExerciseSection
  question: Question
}

/** The questions of a whole set, or of one section, in play order. */
export function buildRunItems(set: ExerciseSet, sectionId?: string): RunItem[] {
  return flattenQuestions(set, sectionId).map(({ question, section }) => ({ set, section, question }))
}

/** The questions of a retry run: `refs` in their order, looked up in the loaded sets. Unknown ones are dropped. */
export function buildRetryItems(
  sets: readonly ExerciseSet[],
  refs: readonly { setId: string; questionId: string }[],
): RunItem[] {
  const bySet = new Map(sets.map((set) => [set.id, buildRunItems(set)]))
  const items: RunItem[] = []
  for (const { setId, questionId } of refs) {
    const item = bySet.get(setId)?.find((i) => i.question.id === questionId)
    if (item) items.push(item)
  }
  return items
}

/** Index of the first question without an answer; `items.length` when everything is answered. */
export function firstUnansweredIndex(items: readonly RunItem[], answers: Answers): number {
  const index = items.findIndex((item) => answers[item.question.id] === undefined)
  return index === -1 ? items.length : index
}

export function countAnswered(items: readonly RunItem[], answers: Answers): number {
  return items.filter((item) => answers[item.question.id] !== undefined).length
}

/** Which screen layout a question gets. */
export type QuestionLayout = 'choice' | 'reading' | 'cloze' | 'rewrite'

export function questionLayout(item: RunItem): QuestionLayout {
  const { question, section } = item
  if (question.type === 'rewrite') return 'rewrite'
  if (!section.passage) return 'choice'
  return question.prompt === undefined ? 'cloze' : 'reading'
}

/** True for the first question of a section within the run. */
export function startsSection(items: readonly RunItem[], index: number): boolean {
  return index === 0 || items[index - 1].section.id !== items[index].section.id
}

/**
 * Small label above a question: "Paper 1 · Từ vựng", "Paper 1 · Đọc hiểu · Đoạn 1". Practice-test
 * titles ("Paper 1 · Part B: Đọc hiểu (đoạn 1)") lose the "Part B" and turn the parenthesis into a
 * part; other sets use the section title. `withSet` puts the set name in front (retry runs).
 */
export function sectionKicker(set: Pick<ExerciseSet, 'kind' | 'title'>, section: Pick<ExerciseSection, 'title'>, withSet: boolean): string {
  let label = section.title
  const cut = section.title.indexOf(': ')
  if (set.kind === 'practice-test' && cut !== -1) {
    const paper = section.title.slice(0, cut).split(' · ')[0]
    const rest = section.title.slice(cut + 2).trim()
    const paren = /^(.*?)\s*\((.+)\)$/.exec(rest)
    const name = paren ? `${paren[1]} · ${paren[2].charAt(0).toUpperCase()}${paren[2].slice(1)}` : rest
    label = `${paper} · ${name}`
  }
  return withSet ? `${set.title} · ${label}` : label
}

export interface SectionScore {
  key: string
  name: string
  correct: number
  total: number
}

export interface RunScore {
  total: number
  correct: number
  /** Correct answers the user marked right themselves ("Mình viết đúng"). */
  selfMarked: number
  /** One entry per section, in play order; a retry spanning several sets also names the set. */
  sections: SectionScore[]
  /** Answered wrongly, in play order. */
  wrong: RunItem[]
}

/** Row title of a section in the summary: "Đọc hiểu: The Furby Fad", "Điền từ: The Escalator", "Từ vựng". */
export function summarySectionName(set: ExerciseSet, section: ExerciseSection): string {
  const info = sectionInfo(set, section)
  if (info.kind === 'reading') return `Đọc hiểu: ${info.name}`
  if (info.kind === 'cloze') return info.name === 'Điền từ' ? info.name : `Điền từ: ${info.name}`
  return info.name
}

export function scoreRun(items: readonly RunItem[], answers: Answers): RunScore {
  const withSet = new Set(items.map((i) => i.set.id)).size > 1
  const sections: SectionScore[] = []
  const wrong: RunItem[] = []
  let correct = 0
  let selfMarked = 0

  for (const item of items) {
    const answer = answers[item.question.id]
    const key = `${item.set.id}/${item.section.id}`
    let row = sections.find((s) => s.key === key)
    if (!row) {
      const name = summarySectionName(item.set, item.section)
      row = { key, name: withSet ? `${item.set.title} · ${name}` : name, correct: 0, total: 0 }
      sections.push(row)
    }
    row.total += 1
    if (answer === undefined) continue
    if (answer.correct) {
      row.correct += 1
      correct += 1
      if (answer.selfMarked) selfMarked += 1
    } else {
      wrong.push(item)
    }
  }
  return { total: items.length, correct, selfMarked, sections, wrong }
}

export type BestStatus =
  /** Better than every finished whole-set run before. */
  | { kind: 'new' }
  /** The first finished whole-set run: nothing to compare with. */
  | { kind: 'first' }
  /** Not better; the previous best is shown. */
  | { kind: 'behind'; best: number }

/** How this whole-set run compares with the best score so far (`previousBest`: before this run). */
export function bestStatus(score: number, previousBest: number | undefined): BestStatus {
  if (previousBest === undefined) return { kind: 'first' }
  return score > previousBest ? { kind: 'new' } : { kind: 'behind', best: previousBest }
}

const WRONG_META: Record<SectionKind, string> = {
  vocabulary: 'Từ vựng',
  reading: 'Đọc hiểu',
  completion: 'Hoàn thành câu',
  cloze: 'Điền từ',
  rewrite: 'Viết lại câu',
  grammar: '',
}

/** Two lines of a "Câu sai" row of the summary: the question text and what kind of question it is. */
export function wrongRowText(item: RunItem, withSet: boolean): { title: string; meta: string } {
  const { question, section, set } = item
  const title =
    question.type === 'rewrite'
      ? question.original
      : (question.prompt?.replace(/\s*\n\s*/g, ' ') ?? `Chỗ trống ${question.number}`)
  const kind = sectionInfo(set, section).kind
  const meta = set.kind === 'practice-test' ? WRONG_META[kind] : section.title
  return { title, meta: withSet ? `${set.title} · ${meta}` : meta }
}
