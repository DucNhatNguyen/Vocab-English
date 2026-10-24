import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SLOW_FACTOR,
  computeRate,
  initSpeech,
  isSpeechSupported,
  normalizeLang,
  pickVoice,
  setSpeechSettings,
  speak,
} from './speech.ts'

const voice = (name: string, lang: string) => ({ name, lang }) as SpeechSynthesisVoice

class FakeUtterance {
  lang = ''
  rate = 1
  voice: SpeechSynthesisVoice | null = null
  text: string
  constructor(text: string) {
    this.text = text
  }
}

function createSynth(initialVoices: SpeechSynthesisVoice[] = []) {
  const listeners: Record<string, Array<() => void>> = {}
  const calls: string[] = []
  const spoken: FakeUtterance[] = []
  return {
    voices: initialVoices,
    getVoices() {
      return this.voices
    },
    cancel: vi.fn(() => {
      calls.push('cancel')
    }),
    speak: vi.fn((u: FakeUtterance) => {
      calls.push('speak')
      spoken.push(u)
    }),
    addEventListener: vi.fn((type: string, fn: () => void) => {
      const list = listeners[type] ?? []
      list.push(fn)
      listeners[type] = list
    }),
    emit(type: string) {
      listeners[type]?.forEach((fn) => fn())
    },
    calls,
    spoken,
  }
}

describe('speech helpers', () => {
  it('normalizes language tags', () => {
    expect(normalizeLang('en_US')).toBe('en-us')
    expect(normalizeLang('en-GB')).toBe('en-gb')
  })

  it('computes normal and slow rates', () => {
    expect(computeRate(1)).toBe(1)
    expect(computeRate(0.8, true)).toBeCloseTo(0.8 * SLOW_FACTOR)
    expect(computeRate(0.001)).toBe(0.1)
    expect(computeRate(100)).toBe(10)
  })

  describe('pickVoice', () => {
    const voices = [voice('Thomas', 'fr-FR'), voice('Daniel', 'en_GB'), voice('Samantha', 'en-US')]

    it('prefers an exact language match, ignoring _ vs -', () => {
      expect(pickVoice(voices, 'en-GB')?.name).toBe('Daniel')
      expect(pickVoice(voices, 'en-US')?.name).toBe('Samantha')
    })

    it('falls back to any English voice', () => {
      expect(pickVoice([voice('Thomas', 'fr-FR'), voice('Karen', 'en-AU')], 'en-US')?.name).toBe(
        'Karen',
      )
    })

    it('returns undefined when there is no English voice', () => {
      expect(pickVoice([voice('Thomas', 'fr-FR')], 'en-US')).toBeUndefined()
      expect(pickVoice([], 'en-US')).toBeUndefined()
    })
  })
})

describe('speak', () => {
  beforeEach(() => {
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    setSpeechSettings({ voice: 'en-US', speechRate: 1 })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns false and does not throw without speechSynthesis', () => {
    vi.stubGlobal('speechSynthesis', undefined)
    expect(isSpeechSupported()).toBe(false)
    expect(speak('hello')).toBe(false)
  })

  it('cancels first, then speaks with the settings voice and rate', () => {
    const synth = createSynth([voice('Daniel', 'en_GB'), voice('Samantha', 'en-US')])
    vi.stubGlobal('speechSynthesis', synth)
    setSpeechSettings({ voice: 'en-GB', speechRate: 0.8 })

    expect(speak('hello')).toBe(true)

    expect(synth.calls).toEqual(['cancel', 'speak'])
    const u = synth.spoken[0]!
    expect(u.text).toBe('hello')
    expect(u.lang).toBe('en-GB')
    expect(u.rate).toBeCloseTo(0.8)
    expect(u.voice?.name).toBe('Daniel')
  })

  it('slows the rate down', () => {
    const synth = createSynth([voice('Samantha', 'en-US')])
    vi.stubGlobal('speechSynthesis', synth)
    setSpeechSettings({ voice: 'en-US', speechRate: 1 })

    speak('hello', { slow: true })

    expect(synth.spoken[0]!.rate).toBeCloseTo(SLOW_FACTOR)
  })

  it('still sets lang when no voice is available', () => {
    const synth = createSynth([])
    vi.stubGlobal('speechSynthesis', synth)

    expect(speak('hello', { voice: 'en-GB' })).toBe(true)

    const u = synth.spoken[0]!
    expect(u.lang).toBe('en-GB')
    expect(u.voice).toBeNull()
  })

  it('picks up voices that load asynchronously (voiceschanged)', () => {
    const synth = createSynth([])
    vi.stubGlobal('speechSynthesis', synth)
    initSpeech()
    expect(synth.addEventListener).toHaveBeenCalledWith('voiceschanged', expect.any(Function))

    synth.voices = [voice('Samantha', 'en-US')]
    synth.emit('voiceschanged')
    speak('hello')

    expect(synth.spoken[0]!.voice?.name).toBe('Samantha')
  })

  it('returns false when speechSynthesis throws', () => {
    const synth = createSynth([])
    synth.speak.mockImplementation(() => {
      throw new Error('boom')
    })
    vi.stubGlobal('speechSynthesis', synth)
    expect(speak('hello')).toBe(false)
  })

  it('ignores empty text', () => {
    const synth = createSynth([])
    vi.stubGlobal('speechSynthesis', synth)
    expect(speak('   ')).toBe(false)
    expect(synth.speak).not.toHaveBeenCalled()
  })
})
