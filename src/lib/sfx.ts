/** Short feedback tones synthesised with Web Audio (no audio files). */

export type SfxKind = 'correct' | 'wrong'

export interface Tone {
  frequency: number // Hz
  start: number // seconds after the sound starts
  duration: number // seconds
  type: OscillatorType
}

/** Tone sequence of each effect: a rising pair for correct, a low falling pair for wrong. */
export function toneSequence(kind: SfxKind): Tone[] {
  return kind === 'correct'
    ? [
        { frequency: 659.25, start: 0, duration: 0.11, type: 'sine' }, // E5
        { frequency: 880, start: 0.1, duration: 0.2, type: 'sine' }, // A5
      ]
    : [
        { frequency: 220, start: 0, duration: 0.14, type: 'triangle' }, // A3
        { frequency: 164.81, start: 0.13, duration: 0.24, type: 'triangle' }, // E3
      ]
}

const VOLUME = 0.18

// Pushed in by the app from the user's settings (see SettingsEffects), like the speech settings.
let enabled = true

export function setSoundEffectsEnabled(value: boolean): void {
  enabled = value
}

let context: AudioContext | undefined

function getContext(): AudioContext | undefined {
  if (context) return context
  const Ctor: typeof AudioContext | undefined =
    typeof AudioContext === 'undefined'
      ? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : AudioContext
  if (!Ctor) return undefined
  context = new Ctor()
  return context
}

/**
 * Plays an effect when sound effects are on. Call it from a user gesture (iOS keeps the audio
 * context suspended otherwise). Returns false when nothing was played; never throws.
 */
export function playSfx(kind: SfxKind): boolean {
  if (!enabled) return false
  try {
    const ctx = getContext()
    if (!ctx) return false
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {})

    const now = ctx.currentTime
    for (const tone of toneSequence(kind)) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = now + tone.start
      const end = start + tone.duration
      osc.type = tone.type
      osc.frequency.value = tone.frequency
      // Quick fade in/out avoids clicks
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(VOLUME, start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, end)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(end + 0.02)
    }
    return true
  } catch {
    return false
  }
}
