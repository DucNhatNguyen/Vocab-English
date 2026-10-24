import { describe, expect, it } from 'vitest'
import {
  applySuggestion,
  EMPTY_FORM,
  isSingleEmoji,
  otherFieldsEmpty,
  suggestionMessage,
  validateWordForm,
  type WordFormValues,
} from './wordForm.ts'

const filled: WordFormValues = { ...EMPTY_FORM, word: 'mango', meaningVi: 'quả xoài' }

describe('validateWordForm', () => {
  it('requires the word and the Vietnamese meaning', () => {
    expect(validateWordForm(EMPTY_FORM)).toEqual({
      word: 'Hãy nhập từ tiếng Anh',
      meaningVi: 'Hãy nhập nghĩa tiếng Việt',
    })
    expect(validateWordForm({ ...EMPTY_FORM, word: '   ', meaningVi: ' ' })).toHaveProperty('word')
  })

  it('accepts a minimal valid form', () => {
    expect(validateWordForm(filled)).toEqual({})
  })

  it('accepts an empty or single emoji and rejects anything else', () => {
    expect(validateWordForm({ ...filled, emoji: '🥭' })).toEqual({})
    expect(validateWordForm({ ...filled, emoji: '🥭🍎' })).toEqual({ emoji: 'Chỉ nhập 1 emoji' })
    expect(validateWordForm({ ...filled, emoji: 'xoài' })).toEqual({ emoji: 'Chỉ nhập 1 emoji' })
  })
})

describe('isSingleEmoji', () => {
  it('counts a ZWJ sequence, flag and skin-tone emoji as one', () => {
    expect(isSingleEmoji('👨‍👩‍👧')).toBe(true)
    expect(isSingleEmoji('🇻🇳')).toBe(true)
    expect(isSingleEmoji('👍🏽')).toBe(true)
    expect(isSingleEmoji(' 💪 ')).toBe(true)
  })

  it('rejects text, digits, several emoji and empty input', () => {
    expect(isSingleEmoji('a')).toBe(false)
    expect(isSingleEmoji('1')).toBe(false)
    expect(isSingleEmoji('💪💪')).toBe(false)
    expect(isSingleEmoji('')).toBe(false)
  })
})

describe('applySuggestion', () => {
  const suggestion = {
    emoji: '🥭',
    ipa: '/ˈmæŋɡoʊ/',
    pos: 'noun',
    meaningVi: 'quả xoài',
    exampleEn: 'I like mango.',
    exampleVi: 'Tôi thích xoài.',
  }

  it('fills every empty field', () => {
    expect(applySuggestion({ ...EMPTY_FORM, word: 'mango' }, suggestion)).toEqual({
      word: 'mango',
      ...suggestion,
    })
  })

  it('never overwrites what the user typed', () => {
    const typed = { ...EMPTY_FORM, word: 'mango', meaningVi: 'trái xoài', ipa: '/x/' }
    const result = applySuggestion(typed, suggestion)
    expect(result.meaningVi).toBe('trái xoài')
    expect(result.ipa).toBe('/x/')
    expect(result.exampleEn).toBe('I like mango.')
  })

  it('treats whitespace-only fields as empty and ignores empty suggestions', () => {
    const result = applySuggestion(
      { ...EMPTY_FORM, word: 'a', ipa: '  ' },
      { ...suggestion, pos: '', emoji: undefined },
    )
    expect(result.ipa).toBe('/ˈmæŋɡoʊ/')
    expect(result.pos).toBe('')
    expect(result.emoji).toBe('')
  })

  it('returns the same object when nothing changes and does not mutate the input', () => {
    const typed: WordFormValues = {
      word: 'a',
      ipa: 'i',
      pos: 'noun',
      meaningVi: 'm',
      exampleEn: 'e',
      exampleVi: 'v',
      emoji: '🥭',
    }
    expect(applySuggestion(typed, suggestion)).toBe(typed)
    const before = { ...EMPTY_FORM, word: 'a' }
    const copy = { ...before }
    applySuggestion(before, suggestion)
    expect(before).toEqual(copy)
  })
})

describe('otherFieldsEmpty', () => {
  it('ignores the word itself', () => {
    expect(otherFieldsEmpty({ ...EMPTY_FORM, word: 'mango' })).toBe(true)
    expect(otherFieldsEmpty({ ...EMPTY_FORM, word: 'mango', exampleVi: 'x' })).toBe(false)
    expect(otherFieldsEmpty({ ...EMPTY_FORM, pos: 'noun' })).toBe(false)
  })
})

describe('suggestionMessage', () => {
  it('describes each source in Vietnamese', () => {
    const suggestion = { ipa: '', pos: '', meaningVi: '', exampleEn: '', exampleVi: '' }
    expect(suggestionMessage({ source: 'builtin', suggestion })).toBe('Lấy từ kho từ vựng')
    expect(suggestionMessage({ source: 'api', suggestion })).toBe(
      'Lấy từ từ điển (tiếng Anh) — hãy tự nhập nghĩa tiếng Việt',
    )
    expect(suggestionMessage({ source: 'not-found' })).toBe('Không tìm thấy trong từ điển')
    expect(suggestionMessage({ source: 'offline' })).toBe('Đang offline — hãy nhập tay')
    expect(suggestionMessage({ source: 'error' })).toContain('hãy nhập tay')
  })
})
