import type { ExerciseCatalogEntry } from '../data/exercises/catalog.ts'
import type { ExerciseKind, ExerciseSet } from '../data/exercises/types.ts'
import type { ExerciseAttempt } from '../db/types.ts'
import type { SectionProgress, SetProgress, SetStatus } from '../db/exercises.ts'
import { flattenQuestions, sectionInfo } from './exercises.ts'

/** Pure text for the Bài tập list and set detail screens (what each status and score reads as). */

export const KIND_LABEL: Record<ExerciseKind, string> = {
  'practice-test': 'Đề luyện tập',
  grammar: 'Ngữ pháp',
  writing: 'Viết lại câu',
}

/** "50 câu · 6 phần"; a set with a single section does not repeat it ("20 câu"). */
export function setCounts(entry: Pick<ExerciseCatalogEntry, 'questionCount' | 'sectionCount'>): string {
  const questions = `${entry.questionCount} câu`
  return entry.sectionCount > 1 ? `${questions} · ${entry.sectionCount} phần` : questions
}

/** What a row shows on its right: a score (big number with a caption) or a pill. */
export type RowStatus =
  | { tone: 'score' | 'doing'; main: string; caption?: string }
  | { tone: 'new' | 'partial'; label: string }

/** Status of one set in the tab list, following the priority rules of spec section 4.3. */
export function listStatus(status: SetStatus): RowStatus {
  switch (status.kind) {
    case 'open':
      return status.total !== undefined
        ? { tone: 'doing', main: `${status.answered}/${status.total}`, caption: 'đang làm' }
        : { tone: 'doing', main: `${status.answered} câu`, caption: 'đang làm' }
    case 'finished':
      return { tone: 'score', main: `${status.best}/${status.total}`, caption: 'cao nhất' }
    case 'partial':
      return { tone: 'partial', label: `Đã làm ${status.answered}/${status.total}` }
    case 'new':
      return { tone: 'new', label: 'Chưa làm' }
  }
}

/** Status of one section row on the set detail: its latest score, or how far a section run got. */
export function sectionStatus(progress: SectionProgress | undefined, open: boolean): RowStatus {
  if (!progress || progress.answered === 0) return { tone: 'new', label: 'Chưa làm' }
  if (progress.answered < progress.total) {
    return open
      ? { tone: 'doing', main: `${progress.answered}/${progress.total}`, caption: 'đang làm' }
      : { tone: 'partial', label: `Đã làm ${progress.answered}/${progress.total}` }
  }
  return { tone: 'score', main: `${progress.correct}/${progress.total}` }
}

export interface OpenAttemptSummary {
  /** "Câu 18/50 · Hoàn thành câu"; the section name is added once the set is loaded. */
  sub: string
  /** 0..1 */
  fraction: number
}

/**
 * Subtitle and progress of the unfinished attempt shown in "Đang làm dở". `set` is the loaded set
 * (lazy); without it a whole-set attempt still reads "Câu x/y" and a section attempt reads
 * "x câu đã làm".
 */
export function openAttemptSummary(
  attempt: ExerciseAttempt,
  entry: Pick<ExerciseCatalogEntry, 'questionCount'>,
  set?: ExerciseSet,
): OpenAttemptSummary {
  const answered = Object.keys(attempt.answers).length
  const flat = set ? flattenQuestions(set, attempt.sectionId) : undefined
  const total = flat ? flat.length : attempt.sectionId === undefined ? entry.questionCount : undefined
  if (total === undefined || total === 0) return { sub: `${answered} câu đã làm`, fraction: 0 }

  const next = flat?.find(({ question }) => attempt.answers[question.id] === undefined) ?? flat?.at(-1)
  const name = set && next ? sectionInfo(set, next.section).name : undefined
  return {
    sub: name ? `Câu ${answered}/${total} · ${name}` : `Câu ${answered}/${total}`,
    fraction: Math.min(1, answered / total),
  }
}

/** Line under the score in the set detail hero; undefined when there is nothing to say yet. */
export function heroSubline(
  progress: Pick<SetProgress, 'lastFull' | 'finishedFullCount' | 'openFull'>,
  total: number,
): string | undefined {
  if (progress.lastFull !== undefined) {
    return `Lần gần nhất: ${progress.lastFull}/${total} · ${progress.finishedFullCount} lượt đã làm`
  }
  if (progress.openFull) return `Đang làm dở: ${Object.keys(progress.openFull.answers).length}/${total} câu`
  return undefined
}

/** The small note under the detail: AI answers and the parts left out of the source. */
export function setNote(set: Pick<ExerciseSet, 'answerSource' | 'omitted'>): string {
  const parts: string[] = []
  if (set.answerSource === 'ai') parts.push('Đáp án và giải thích do AI soạn, có thể chưa chính xác.')
  if (set.omitted && set.omitted.length > 0) parts.push(`Phần bỏ qua: ${set.omitted.join('; ')}.`)
  return parts.join(' ')
}
