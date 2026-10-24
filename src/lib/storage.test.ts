import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestPersistentStorage } from './storage.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('requestPersistentStorage', () => {
  it('returns false when the Storage API is missing', async () => {
    vi.stubGlobal('navigator', {})
    await expect(requestPersistentStorage()).resolves.toBe(false)
  })

  it('returns the result of navigator.storage.persist()', async () => {
    const persist = vi.fn().mockResolvedValue(true)
    vi.stubGlobal('navigator', { storage: { persist } })
    await expect(requestPersistentStorage()).resolves.toBe(true)
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('never throws when persist() rejects', async () => {
    vi.stubGlobal('navigator', { storage: { persist: vi.fn().mockRejectedValue(new Error('nope')) } })
    await expect(requestPersistentStorage()).resolves.toBe(false)
  })
})
