import { describe, expect, it, vi } from 'vitest'
import { createInstallPromptStore, type BeforeInstallPromptEvent } from './installPrompt.ts'

function fakePromptEvent(outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent
  const prompt = vi.fn(async () => {})
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome }) })
  return { event, prompt }
}

function setup() {
  const target = new EventTarget()
  const store = createInstallPromptStore()
  store.listen(target)
  return { target, store }
}

describe('install prompt store', () => {
  it('has nothing until the browser offers a prompt', async () => {
    const { store } = setup()
    expect(store.getSnapshot()).toBeNull()
    expect(await store.prompt()).toBe('unavailable')
  })

  it('keeps the event, suppresses the mini-infobar and notifies subscribers', () => {
    const { target, store } = setup()
    const listener = vi.fn()
    store.subscribe(listener)
    const { event } = fakePromptEvent('accepted')
    target.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(store.getSnapshot()).toBe(event)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('opens the dialog and reports the choice, spending the event', async () => {
    const { target, store } = setup()
    const { event, prompt } = fakePromptEvent('dismissed')
    target.dispatchEvent(event)
    expect(await store.prompt()).toBe('dismissed')
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot()).toBeNull()
    expect(await store.prompt()).toBe('unavailable')
  })

  it('reports accepted', async () => {
    const { target, store } = setup()
    target.dispatchEvent(fakePromptEvent('accepted').event)
    expect(await store.prompt()).toBe('accepted')
  })

  it('clears the event after the app was installed', () => {
    const { target, store } = setup()
    target.dispatchEvent(fakePromptEvent('accepted').event)
    target.dispatchEvent(new Event('appinstalled'))
    expect(store.getSnapshot()).toBeNull()
  })

  it('stops notifying after unsubscribe and listens only once', () => {
    const { target, store } = setup()
    store.listen(target)
    const listener = vi.fn()
    store.subscribe(listener)()
    target.dispatchEvent(fakePromptEvent('accepted').event)
    expect(listener).not.toHaveBeenCalled()
  })
})
