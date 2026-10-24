import type { Settings } from '../db/types.ts'

/** Slow playback = speech rate x this factor. Tune here. */
export const SLOW_FACTOR = 0.6

const MIN_RATE = 0.1 // Web Speech API allows 0.1 - 10
const MAX_RATE = 10

export type SpeechVoice = Settings['voice']

/** "en_US" / "EN-us" -> "en-us", so voice and setting languages compare equal. */
export function normalizeLang(lang: string): string {
  return lang.replace(/_/g, '-').toLowerCase()
}

/** Effective utterance rate for the user's speech rate setting. */
export function computeRate(speechRate: number, slow = false): number {
  const rate = slow ? speechRate * SLOW_FACTOR : speechRate
  return Math.min(MAX_RATE, Math.max(MIN_RATE, rate))
}

/** Voice whose lang matches `lang`; else any English voice; else undefined. */
export function pickVoice(
  voices: readonly SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | undefined {
  const wanted = normalizeLang(lang)
  const exact = voices.find((v) => normalizeLang(v.lang) === wanted)
  if (exact) return exact
  return voices.find((v) => /^en(-|$)/.test(normalizeLang(v.lang)))
}

// Voice / rate chosen in Settings. Pushed in by the app (setSpeechSettings) so speak() can stay
// synchronous: iOS only allows speechSynthesis.speak() directly inside a user gesture.
let currentVoice: SpeechVoice = 'en-US'
let currentRate = 1

export function setSpeechSettings(settings: Pick<Settings, 'voice' | 'speechRate'>): void {
  currentVoice = settings.voice
  currentRate = settings.speechRate
}

function getSynth(): SpeechSynthesis | undefined {
  return typeof speechSynthesis === 'undefined' ? undefined : speechSynthesis
}

export function isSpeechSupported(): boolean {
  return getSynth() !== undefined && typeof SpeechSynthesisUtterance !== 'undefined'
}

// Browsers often return [] from getVoices() until 'voiceschanged' fires, so keep the last
// non-empty list.
const cachedVoices = new WeakMap<SpeechSynthesis, SpeechSynthesisVoice[]>()
const listening = new WeakSet<SpeechSynthesis>()

function currentVoices(synth: SpeechSynthesis): SpeechSynthesisVoice[] {
  const voices = synth.getVoices()
  if (voices.length > 0) cachedVoices.set(synth, voices)
  return cachedVoices.get(synth) ?? []
}

/** Starts loading voices and keeps the cache fresh. Safe to call repeatedly; never throws. */
export function initSpeech(): void {
  try {
    const synth = getSynth()
    if (!synth) return
    currentVoices(synth)
    if (!listening.has(synth)) {
      listening.add(synth)
      synth.addEventListener('voiceschanged', () => currentVoices(synth))
    }
  } catch {
    // speech is optional; ignore
  }
}

export interface SpeakOptions {
  slow?: boolean
  /** Overrides the voice from settings. */
  voice?: SpeechVoice
  /** Overrides the speech rate from settings. */
  rate?: number
}

/**
 * Speaks `text`, cancelling anything already playing. Returns false when speech is unavailable
 * or fails. Never throws.
 */
export function speak(text: string, options: SpeakOptions = {}): boolean {
  try {
    const synth = getSynth()
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined' || !text.trim()) return false
    initSpeech()

    const lang = options.voice ?? currentVoice
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = computeRate(options.rate ?? currentRate, options.slow)
    const voice = pickVoice(currentVoices(synth), lang)
    if (voice) utterance.voice = voice

    synth.cancel()
    synth.speak(utterance)
    return true
  } catch {
    return false
  }
}
