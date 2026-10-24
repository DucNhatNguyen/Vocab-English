import { words as builtInWords } from '../data/index.ts'
import type { Word } from '../data/types.ts'

/** Fields a suggestion can fill. Empty string / undefined = nothing known for that field. */
export interface WordSuggestion {
  emoji?: string
  ipa: string
  pos: string
  meaningVi: string
  exampleEn: string
  exampleVi: string
}

/**
 * - `builtin`: found in the bundled word list (every field)
 * - `api`: found in the Free Dictionary API (IPA, part of speech, English example only)
 * - `not-found`: unknown to both
 * - `offline` / `error`: the API could not be reached (no network / failed, timed out, bad reply)
 */
export type DictionaryResult =
  | { source: 'builtin' | 'api'; suggestion: WordSuggestion }
  | { source: 'not-found' | 'offline' | 'error' }

export interface DictionaryOptions {
  /** Injectable for tests; defaults to the global fetch. */
  fetch?: typeof fetch
  /** Bundled word list to look in first; defaults to the app's data. */
  builtIn?: readonly Word[]
  /** Request timeout in ms. */
  timeoutMs?: number
  /** Whether the device reports being online; defaults to `navigator.onLine`. */
  isOnline?: () => boolean
}

export const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en/'
export const API_TIMEOUT_MS = 5000

/** Free Dictionary `partOfSpeech` -> our `PARTS_OF_SPEECH` code. Anything else stays empty. */
const API_POS: Record<string, string> = {
  noun: 'noun',
  verb: 'verb',
  adjective: 'adj',
  adverb: 'adv',
  preposition: 'prep',
  conjunction: 'conj',
  pronoun: 'pron',
  interjection: 'interj',
  exclamation: 'interj', // the API's usual name for words like "hello"
}

const builtInIndex = new WeakMap<readonly Word[], Map<string, Word>>()

function headwordKey(s: string): string {
  return s.trim().toLowerCase()
}

function findBuiltIn(key: string, list: readonly Word[]): Word | undefined {
  let index = builtInIndex.get(list)
  if (!index) {
    index = new Map()
    // First entry wins when a headword appears twice
    for (const w of list) {
      const k = headwordKey(w.word)
      if (!index.has(k)) index.set(k, w)
    }
    builtInIndex.set(list, index)
  }
  return index.get(key)
}

// The API's JSON is untrusted: read it defensively instead of trusting the documented shape.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/** Parses the entries array of the API into a suggestion. Exported for tests. */
export function parseApiEntries(entries: readonly unknown[]): WordSuggestion {
  const list = entries.filter(isRecord)

  let ipa = ''
  for (const entry of list) {
    ipa = text(entry.phonetic)
    if (!ipa) {
      for (const phonetic of asArray(entry.phonetics)) {
        if (isRecord(phonetic) && (ipa = text(phonetic.text))) break
      }
    }
    if (ipa) break
  }

  // Part of speech comes from the very first meaning; the example from the first definition
  // that has one, in meaning order, so it usually belongs to that same first meaning.
  let pos = ''
  let exampleEn = ''
  let first = true
  for (const entry of list) {
    for (const meaning of asArray(entry.meanings)) {
      if (!isRecord(meaning)) continue
      if (first) {
        pos = API_POS[text(meaning.partOfSpeech).toLowerCase()] ?? ''
        first = false
      }
      if (exampleEn) continue
      for (const definition of asArray(meaning.definitions)) {
        if (isRecord(definition) && (exampleEn = text(definition.example))) break
      }
    }
  }

  return { ipa, pos, meaningVi: '', exampleEn, exampleVi: '' }
}

function fromBuiltIn(word: Word): WordSuggestion {
  return {
    emoji: word.emoji,
    ipa: word.ipa,
    pos: word.pos,
    meaningVi: word.meaningVi,
    exampleEn: word.exampleEn,
    exampleVi: word.exampleVi,
  }
}

function defaultIsOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

/**
 * Suggestions for an English word typed by the user: the built-in list first (case-insensitive,
 * trimmed), then the Free Dictionary API. Never throws; failures come back as `offline` / `error`.
 * The API gives no Vietnamese meaning, so `meaningVi` is only filled for built-in words.
 */
export async function suggestWord(
  input: string,
  {
    fetch: fetchFn = (...args) => globalThis.fetch(...args),
    builtIn = builtInWords,
    timeoutMs = API_TIMEOUT_MS,
    isOnline = defaultIsOnline,
  }: DictionaryOptions = {},
): Promise<DictionaryResult> {
  const key = headwordKey(input)
  if (!key) return { source: 'not-found' }

  const local = findBuiltIn(key, builtIn)
  if (local) return { source: 'builtin', suggestion: fromBuiltIn(local) }

  if (!isOnline()) return { source: 'offline' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchFn(`${API_BASE}${encodeURIComponent(key)}`, {
      signal: controller.signal,
    })
    if (response.status === 404) return { source: 'not-found' }
    if (!response.ok) return { source: 'error' }

    // The body is read inside the try so the timeout also covers a stalled download
    const data: unknown = await response.json()
    if (!Array.isArray(data)) return { source: 'error' }
    if (data.length === 0) return { source: 'not-found' }
    return { source: 'api', suggestion: parseApiEntries(data) }
  } catch {
    return { source: isOnline() ? 'error' : 'offline' }
  } finally {
    clearTimeout(timer)
  }
}
