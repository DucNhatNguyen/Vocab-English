import { describe, expect, it } from 'vitest'
import { decks, getDeck, getDeckWords, getWord, words, wordsById } from './index.ts'
import { LEVELS, PARTS_OF_SPEECH } from './types.ts'

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Whole-word, case-insensitive match (letters/digits are word characters; hyphen is not). */
function containsWholeWord(text: string, headword: string): boolean {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(headword)}(?![\\p{L}\\p{N}])`, 'iu').test(text)
}

const nonEmpty = (s: unknown) => typeof s === 'string' && s.trim().length > 0

describe('vocabulary dataset', () => {
  it('has unique word ids and deck ids', () => {
    expect(new Set(words.map((w) => w.id)).size).toBe(words.length)
    expect(new Set(decks.map((d) => d.id)).size).toBe(decks.length)
    expect(wordsById.size).toBe(words.length)
  })

  it('derives word ids from the headword (lowercase, spaces to dashes)', () => {
    for (const w of words) {
      expect(w.id, w.id).toBe(w.word.toLowerCase().replace(/\s+/g, '-'))
    }
  })

  it('references only existing words from decks, without duplicates', () => {
    for (const d of decks) {
      expect(new Set(d.wordIds).size, d.id).toBe(d.wordIds.length)
      for (const id of d.wordIds) {
        expect(wordsById.has(id), `${d.id} -> ${id}`).toBe(true)
      }
    }
  })

  it('puts every word in at least one deck', () => {
    const inDecks = new Set(decks.flatMap((d) => d.wordIds))
    for (const w of words) {
      expect(inDecks.has(w.id), w.id).toBe(true)
    }
  })

  it('has non-empty required fields on every word', () => {
    for (const w of words) {
      for (const key of ['id', 'word', 'ipa', 'pos', 'meaningVi', 'exampleEn', 'exampleVi', 'level'] as const) {
        expect(nonEmpty(w[key]), `${w.id}.${key}`).toBe(true)
      }
      expect(w.topics.length, `${w.id}.topics`).toBeGreaterThan(0)
      if (w.emoji !== undefined) expect(nonEmpty(w.emoji), `${w.id}.emoji`).toBe(true)
    }
  })

  it('has non-empty required fields on every deck', () => {
    for (const d of decks) {
      expect(nonEmpty(d.id) && nonEmpty(d.name) && nonEmpty(d.topic), d.id).toBe(true)
    }
  })

  it('uses allowed pos and level values', () => {
    for (const w of words) {
      expect(PARTS_OF_SPEECH as readonly string[], w.id).toContain(w.pos)
      expect(LEVELS as readonly string[], w.id).toContain(w.level)
    }
    for (const d of decks) {
      expect(LEVELS as readonly string[], d.id).toContain(d.level)
    }
  })

  it('wraps ipa in slashes without syllable dots', () => {
    for (const w of words) {
      expect(w.ipa.startsWith('/') && w.ipa.endsWith('/'), w.id).toBe(true)
      expect(w.ipa, w.id).not.toContain('.')
    }
  })

  it('contains the headword as a whole word in exampleEn', () => {
    for (const w of words) {
      expect(containsWholeWord(w.exampleEn, w.word), `${w.id}: "${w.exampleEn}"`).toBe(true)
    }
  })

  it('keeps example sentences short (max 15 words)', () => {
    for (const w of words) {
      expect(w.exampleEn.trim().split(/\s+/).length, w.id).toBeLessThanOrEqual(15)
    }
  })

  it('matches word level and topics to their deck', () => {
    for (const d of decks) {
      for (const id of d.wordIds) {
        const w = wordsById.get(id)!
        expect(w.level, id).toBe(d.level)
        expect(w.topics, id).toContain(d.topic)
      }
    }
  })

  it('has distinct meaningVi within each deck', () => {
    for (const d of decks) {
      const meanings = d.wordIds.map((id) => wordsById.get(id)!.meaningVi.toLowerCase())
      expect(new Set(meanings).size, d.id).toBe(meanings.length)
    }
  })

  it('has 20-30 words per deck', () => {
    for (const d of decks) {
      expect(d.wordIds.length, d.id).toBeGreaterThanOrEqual(20)
      expect(d.wordIds.length, d.id).toBeLessThanOrEqual(30)
    }
  })

  it('exposes lookup helpers', () => {
    expect(getWord('resilient')?.word).toBe('resilient')
    expect(getWord('does-not-exist')).toBeUndefined()
    expect(getDeck('ielts-moi-truong')?.name).toBe('IELTS – Môi trường')
    expect(getDeck('nope')).toBeUndefined()
    const deck = getDeck('du-lich')!
    expect(getDeckWords('du-lich').map((w) => w.id)).toEqual(deck.wordIds)
    expect(getDeckWords('nope')).toEqual([])
  })
})
