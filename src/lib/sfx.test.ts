import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// sfx.ts keeps a module-level AudioContext, so load a fresh copy for every test.
async function loadSfx() {
  vi.resetModules()
  return import('./sfx.ts')
}

class FakeParam {
  value = 0
  setValueAtTime = vi.fn()
  exponentialRampToValueAtTime = vi.fn()
}
class FakeNode {
  connect = vi.fn((next: unknown) => next)
}
class FakeOscillator extends FakeNode {
  type = ''
  frequency = new FakeParam()
  start = vi.fn()
  stop = vi.fn()
}
class FakeGain extends FakeNode {
  gain = new FakeParam()
}
let created = 0
let oscillators: FakeOscillator[] = []
class FakeAudioContext {
  state = 'suspended'
  currentTime = 1
  destination = {}
  resume = vi.fn(() => Promise.resolve())
  constructor() {
    created += 1
  }
  createOscillator() {
    const osc = new FakeOscillator()
    oscillators.push(osc)
    return osc
  }
  createGain() {
    return new FakeGain()
  }
}

beforeEach(() => {
  created = 0
  oscillators = []
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('toneSequence', () => {
  it('rises for correct and falls (lower) for wrong', async () => {
    const { toneSequence } = await loadSfx()
    const correct = toneSequence('correct')
    const wrong = toneSequence('wrong')
    expect(correct[1].frequency).toBeGreaterThan(correct[0].frequency)
    expect(wrong[1].frequency).toBeLessThan(wrong[0].frequency)
    expect(Math.max(...wrong.map((t) => t.frequency))).toBeLessThan(
      Math.min(...correct.map((t) => t.frequency)),
    )
  })

  it('keeps the effects short', async () => {
    const { toneSequence } = await loadSfx()
    for (const kind of ['correct', 'wrong'] as const) {
      const end = Math.max(...toneSequence(kind).map((t) => t.start + t.duration))
      expect(end).toBeLessThan(0.6)
    }
  })
})

describe('playSfx', () => {
  it('plays one oscillator per tone and resumes a suspended context', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext)
    const { playSfx, toneSequence } = await loadSfx()
    expect(playSfx('correct')).toBe(true)
    expect(oscillators).toHaveLength(toneSequence('correct').length)
    expect(oscillators[0].start).toHaveBeenCalled()
    expect(oscillators[0].frequency.value).toBe(toneSequence('correct')[0].frequency)
  })

  it('reuses a single AudioContext', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext)
    const { playSfx } = await loadSfx()
    playSfx('correct')
    playSfx('wrong')
    expect(created).toBe(1)
  })

  it('plays nothing, and does not even create a context, when switched off', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext)
    const { playSfx, setSoundEffectsEnabled } = await loadSfx()
    setSoundEffectsEnabled(false)
    expect(playSfx('correct')).toBe(false)
    expect(created).toBe(0)
    setSoundEffectsEnabled(true)
    expect(playSfx('wrong')).toBe(true)
  })

  it('returns false instead of throwing when Web Audio is unavailable', async () => {
    vi.stubGlobal('AudioContext', undefined)
    const { playSfx } = await loadSfx()
    expect(playSfx('wrong')).toBe(false)
  })

  it('returns false instead of throwing when the audio API fails', async () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('blocked')
        }
      },
    )
    const { playSfx } = await loadSfx()
    expect(playSfx('correct')).toBe(false)
  })
})
