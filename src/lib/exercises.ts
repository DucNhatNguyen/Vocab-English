import type { ExerciseSection, ExerciseSet, Question, RewriteQuestion } from '../data/exercises/types.ts'

/** Pure helpers for exercise sets: section labels, question order and rewrite grading. */

export type SectionKind = 'vocabulary' | 'reading' | 'completion' | 'cloze' | 'rewrite' | 'grammar'

export interface SectionInfo {
  kind: SectionKind
  /** Row title, e.g. "Từ vựng", "The Origin of Jeans", "Điền từ". */
  name: string
  /** Row subtitle, e.g. "Paper 1 · Part A · 10 câu", "Đọc hiểu · Part B · 5 câu". */
  meta: string
}

const SEPARATOR = ': '

/**
 * Names a section as the set detail screen shows it. Practice-test titles look like
 * "Paper 1 · Part A: Từ vựng": the part after ": " is the name, the part before it the meta.
 * Reading and cloze sections are named after their passage instead.
 */
export function sectionInfo(set: ExerciseSet, section: ExerciseSection): SectionInfo {
  const count = `${section.questions.length} câu`

  if (set.kind === 'writing') return { kind: 'rewrite', name: section.title, meta: count }
  if (set.kind === 'grammar') return { kind: 'grammar', name: section.title, meta: count }

  const cut = section.title.indexOf(SEPARATOR)
  const before = cut === -1 ? section.title : section.title.slice(0, cut)
  const after = cut === -1 ? '' : section.title.slice(cut + SEPARATOR.length).trim()
  const part = before.split(' · ').pop() ?? before // "Part B"
  const first = section.questions[0]

  if (first?.type === 'rewrite') return { kind: 'rewrite', name: after || section.title, meta: `${before} · ${count}` }
  if (section.passage) {
    const title = section.passage.title?.trim()
    if (first?.type === 'choice' && first.prompt === undefined) {
      return { kind: 'cloze', name: title || 'Điền từ', meta: `Điền từ · ${part} · ${count}` }
    }
    return { kind: 'reading', name: title || after || 'Đọc hiểu', meta: `Đọc hiểu · ${part} · ${count}` }
  }
  const kind = /từ vựng/i.test(after) ? 'vocabulary' : 'completion'
  return { kind, name: after || section.title, meta: `${before} · ${count}` }
}

export interface FlatQuestion {
  question: Question
  section: ExerciseSection
}

/** Questions in play order, each with its section; one section's only when `sectionId` is given. */
export function flattenQuestions(set: ExerciseSet, sectionId?: string): FlatQuestion[] {
  return set.sections
    .filter((section) => sectionId === undefined || section.id === sectionId)
    .flatMap((section) => section.questions.map((question) => ({ question, section })))
}

// ---------------------------------------------------------------------------
// Rewrite grading (spec section 3.4)

/**
 * Prefix + learner text + suffix as one sentence. Joined with single spaces, except before a
 * suffix that starts with punctuation (", I cannot agree ...").
 */
export function joinRewrite(question: Pick<RewriteQuestion, 'prefix' | 'suffix'>, text: string): string {
  const suffix = (question.suffix ?? '').trim()
  const head = [question.prefix.trim(), text.trim()].filter(Boolean).join(' ')
  if (suffix === '') return head
  return /^[,.;:!?]/.test(suffix) ? head + suffix : `${head} ${suffix}`
}

/**
 * Canonical form used to compare sentences: lower case, collapsed spaces, straight quotes, no
 * space before punctuation, no final punctuation, and the unambiguous contractions spelled out.
 * "'s" and "'d" are left alone because each has two meanings.
 */
export function normalizeRewrite(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/\bwon't\b/g, 'will not')
    .replace(/\bshan't\b/g, 'shall not')
    .replace(/n't\b/g, ' not')
    .replace(/'m\b/g, ' am')
    .replace(/'re\b/g, ' are')
    .replace(/'ve\b/g, ' have')
    .replace(/'ll\b/g, ' will')
    .replace(/\bcan not\b/g, 'cannot')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/[\s.,;:!?]+$/, '')
    .trim()
}

/** True when `prefix + input + suffix` matches `prefix + answer + suffix` for any accepted answer. */
export function isRewriteCorrect(input: string, question: RewriteQuestion): boolean {
  if (input.trim() === '') return false
  const attempt = normalizeRewrite(joinRewrite(question, input))
  return question.answers.some((answer) => normalizeRewrite(joinRewrite(question, answer)) === attempt)
}
