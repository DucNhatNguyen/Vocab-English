import type { DictionaryResult, WordSuggestion } from './dictionary.ts'

/** What the add/edit form edits. Every field is a plain string; empty = not filled. */
export interface WordFormValues {
  word: string
  ipa: string
  pos: string
  meaningVi: string
  exampleEn: string
  exampleVi: string
  emoji: string
}

export const EMPTY_FORM: WordFormValues = {
  word: '',
  ipa: '',
  pos: '',
  meaningVi: '',
  exampleEn: '',
  exampleVi: '',
  emoji: '',
}

export type WordFormErrors = Partial<Record<'word' | 'meaningVi' | 'emoji', string>>

const SUGGESTED_FIELDS = ['ipa', 'pos', 'meaningVi', 'exampleEn', 'exampleVi', 'emoji'] as const

/** True when the string is exactly one emoji (a single grapheme cluster that is pictographic). */
export function isSingleEmoji(s: string): boolean {
  const value = s.trim()
  if (!value) return false
  // Flags are pairs of regional indicators, which are not "pictographic" on their own
  if (!/[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(value)) return false
  return [...new Intl.Segmenter().segment(value)].length === 1
}

/** Validation messages (Vietnamese); an empty object means the form can be saved. */
export function validateWordForm(values: WordFormValues): WordFormErrors {
  const errors: WordFormErrors = {}
  if (!values.word.trim()) errors.word = 'Hãy nhập từ tiếng Anh'
  if (!values.meaningVi.trim()) errors.meaningVi = 'Hãy nhập nghĩa tiếng Việt'
  if (values.emoji.trim() && !isSingleEmoji(values.emoji)) errors.emoji = 'Chỉ nhập 1 emoji'
  return errors
}

/** True when none of the suggestible fields has any content (only the word itself may). */
export function otherFieldsEmpty(values: WordFormValues): boolean {
  return SUGGESTED_FIELDS.every((field) => values[field].trim() === '')
}

/**
 * Fills only the fields the user has left empty; anything already typed is kept as is.
 * Returns the same object when nothing changes, so React can skip a re-render.
 */
export function applySuggestion(values: WordFormValues, suggestion: WordSuggestion): WordFormValues {
  let next = values
  for (const field of SUGGESTED_FIELDS) {
    const suggested = (suggestion[field] ?? '').trim()
    if (suggested && values[field].trim() === '') {
      next = next === values ? { ...values } : next
      next[field] = suggested
    }
  }
  return next
}

/** Short Vietnamese note telling the user where the suggestion came from. */
export function suggestionMessage(result: DictionaryResult): string {
  switch (result.source) {
    case 'builtin':
      return 'Lấy từ kho từ vựng'
    case 'api':
      return 'Lấy từ từ điển (tiếng Anh) — hãy tự nhập nghĩa tiếng Việt'
    case 'not-found':
      return 'Không tìm thấy trong từ điển'
    case 'offline':
      return 'Đang offline — hãy nhập tay'
    case 'error':
      return 'Không kết nối được từ điển — hãy nhập tay'
  }
}
