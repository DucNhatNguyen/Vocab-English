import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Word } from '../data/types.ts'
import { parseApiEntries, suggestWord } from './dictionary.ts'

const builtIn: Word[] = [
  {
    id: 'hello',
    word: 'hello',
    emoji: '👋',
    ipa: '/heˈloʊ/',
    pos: 'interj',
    meaningVi: 'xin chào',
    exampleEn: 'Hello, my name is Linh.',
    exampleVi: 'Xin chào, tên mình là Linh.',
    level: 'A1',
    topics: ['giao-tiep'],
  },
]

// Shape of a real https://api.dictionaryapi.dev/api/v2/entries/en/serendipity reply (trimmed).
const serendipity = [
  {
    word: 'serendipity',
    phonetic: '/ˌsɛɹənˈdɪpɪti/',
    phonetics: [
      { text: '/ˌsɛɹənˈdɪpɪti/', audio: '' },
      {
        text: '/ˌsɛɹənˈdɪpɪti/',
        audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/serendipity-us.mp3',
      },
    ],
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition: 'The faculty of making fortunate discoveries by accident.',
            synonyms: [],
            antonyms: [],
          },
          {
            definition: 'An unexpected discovery.',
            example: 'Meeting her was pure serendipity.',
            synonyms: [],
            antonyms: [],
          },
        ],
        synonyms: [],
        antonyms: [],
      },
    ],
    license: { name: 'CC BY-SA 3.0', url: 'https://creativecommons.org/licenses/by-sa/3.0' },
    sourceUrls: ['https://en.wiktionary.org/wiki/serendipity'],
  },
]

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.useRealTimers()
})

describe('suggestWord: built-in list', () => {
  it('matches case-insensitively and trimmed, returning every field, without calling the API', async () => {
    const fetchMock = vi.fn()
    const result = await suggestWord('  HeLLo ', { fetch: fetchMock, builtIn })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result).toEqual({
      source: 'builtin',
      suggestion: {
        emoji: '👋',
        ipa: '/heˈloʊ/',
        pos: 'interj',
        meaningVi: 'xin chào',
        exampleEn: 'Hello, my name is Linh.',
        exampleVi: 'Xin chào, tên mình là Linh.',
      },
    })
  })

  it('works offline for built-in words', async () => {
    const result = await suggestWord('hello', { builtIn, isOnline: () => false, fetch: vi.fn() })
    expect(result.source).toBe('builtin')
  })

  it('treats an empty word as not found without a request', async () => {
    const fetchMock = vi.fn()
    expect(await suggestWord('   ', { fetch: fetchMock, builtIn })).toEqual({ source: 'not-found' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('suggestWord: Free Dictionary API', () => {
  it('parses IPA, part of speech and the first example; the Vietnamese fields stay empty', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(serendipity))
    const result = await suggestWord(' Serendipity ', { fetch: fetchMock, builtIn })
    expect(result).toEqual({
      source: 'api',
      suggestion: {
        ipa: '/ˌsɛɹənˈdɪpɪti/',
        pos: 'noun',
        meaningVi: '',
        exampleEn: 'Meeting her was pure serendipity.',
        exampleVi: '',
      },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.dictionaryapi.dev/api/v2/entries/en/serendipity',
    )
  })

  it('URL-encodes the word', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json([]))
    await suggestWord('ice cream/é', { fetch: fetchMock, builtIn })
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.dictionaryapi.dev/api/v2/entries/en/ice%20cream%2F%C3%A9',
    )
  })

  it('reports 404 as not-found', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(json({ title: 'No Definitions Found', message: '', resolution: '' }, 404))
    expect(await suggestWord('asdfgh', { fetch: fetchMock, builtIn })).toEqual({
      source: 'not-found',
    })
  })

  it('reports other HTTP errors as error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}, 500))
    expect(await suggestWord('asdfgh', { fetch: fetchMock, builtIn })).toEqual({ source: 'error' })
  })

  it('reports a network failure as error without throwing', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await suggestWord('asdfgh', { fetch: fetchMock, builtIn })).toEqual({ source: 'error' })
  })

  it('reports a network failure while the device is offline as offline', async () => {
    let online = true
    const fetchMock = vi.fn().mockImplementation(async () => {
      online = false
      throw new TypeError('Failed to fetch')
    })
    expect(
      await suggestWord('asdfgh', { fetch: fetchMock, builtIn, isOnline: () => online }),
    ).toEqual({ source: 'offline' })
  })

  it('does not call the API when the device is offline', async () => {
    const fetchMock = vi.fn()
    const result = await suggestWord('asdfgh', { fetch: fetchMock, builtIn, isOnline: () => false })
    expect(result).toEqual({ source: 'offline' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('gives up after the timeout and aborts the request', async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    const fetchMock = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          signal = init?.signal ?? undefined
          signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )
    const pending = suggestWord('asdfgh', { fetch: fetchMock, builtIn, timeoutMs: 5000 })
    await vi.advanceTimersByTimeAsync(4999)
    expect(signal?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(signal?.aborted).toBe(true)
    expect(await pending).toEqual({ source: 'error' })
  })

  it('reports a non-JSON body or a non-array reply as error', async () => {
    const html = vi.fn().mockResolvedValue(new Response('<html>', { status: 200 }))
    expect(await suggestWord('asdfgh', { fetch: html, builtIn })).toEqual({ source: 'error' })
    const obj = vi.fn().mockResolvedValue(json({ title: 'oops' }))
    expect(await suggestWord('asdfgh', { fetch: obj, builtIn })).toEqual({ source: 'error' })
  })

  it('reports an empty array as not-found', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json([]))
    expect(await suggestWord('asdfgh', { fetch: fetchMock, builtIn })).toEqual({
      source: 'not-found',
    })
  })

  it('copes with missing phonetic and examples', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json([
        { word: 'zzz', meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'x' }] }] },
      ]),
    )
    expect(await suggestWord('zzz', { fetch: fetchMock, builtIn })).toEqual({
      source: 'api',
      suggestion: { ipa: '', pos: 'noun', meaningVi: '', exampleEn: '', exampleVi: '' },
    })
  })
})

describe('parseApiEntries', () => {
  it('maps API parts of speech to our codes', () => {
    const pos = (partOfSpeech: string) =>
      parseApiEntries([{ meanings: [{ partOfSpeech, definitions: [] }] }]).pos
    expect(pos('noun')).toBe('noun')
    expect(pos('verb')).toBe('verb')
    expect(pos('adjective')).toBe('adj')
    expect(pos('adverb')).toBe('adv')
    expect(pos('preposition')).toBe('prep')
    expect(pos('conjunction')).toBe('conj')
    expect(pos('pronoun')).toBe('pron')
    expect(pos('interjection')).toBe('interj')
    expect(pos('exclamation')).toBe('interj')
    expect(pos('Adjective')).toBe('adj')
    expect(pos('abbreviation')).toBe('')
    expect(pos('')).toBe('')
  })

  it('falls back to the first phonetics[].text with content when `phonetic` is missing', () => {
    const entries = [
      { phonetics: [{ audio: 'x.mp3' }, { text: ' ' }, { text: '/həˈləʊ/' }], meanings: [] },
    ]
    expect(parseApiEntries(entries).ipa).toBe('/həˈləʊ/')
  })

  it('prefers `phonetic` over phonetics[]', () => {
    const entries = [{ phonetic: '/a/', phonetics: [{ text: '/b/' }], meanings: [] }]
    expect(parseApiEntries(entries).ipa).toBe('/a/')
  })

  it('takes the part of speech of the first meaning and the first example found in meaning order', () => {
    const entries = [
      {
        meanings: [
          { partOfSpeech: 'verb', definitions: [{ definition: 'a' }] },
          { partOfSpeech: 'noun', definitions: [{ definition: 'b', example: 'A noun example.' }] },
        ],
      },
    ]
    const s = parseApiEntries(entries)
    expect(s.pos).toBe('verb')
    expect(s.exampleEn).toBe('A noun example.')
  })

  it('prefers an example of the first meaning', () => {
    const entries = [
      {
        meanings: [
          { partOfSpeech: 'noun', definitions: [{ definition: 'a', example: 'First meaning.' }] },
          { partOfSpeech: 'verb', definitions: [{ definition: 'b', example: 'Second meaning.' }] },
        ],
      },
    ]
    expect(parseApiEntries(entries).exampleEn).toBe('First meaning.')
  })

  it('survives odd shapes', () => {
    expect(
      parseApiEntries([
        null,
        42,
        'x',
        { phonetic: 5, phonetics: 'no', meanings: [null, { definitions: 7 }] },
      ]),
    ).toEqual({ ipa: '', pos: '', meaningVi: '', exampleEn: '', exampleVi: '' })
  })
})
