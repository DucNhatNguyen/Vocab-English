import { afterEach, describe, expect, it, vi } from 'vitest'
import { isStoragePersistent, requestPersistentStorage } from './storage.ts'

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

describe('isStoragePersistent', () => {
  it('is undefined when the Storage API is missing', async () => {
    vi.stubGlobal('navigator', {})
    await expect(isStoragePersistent()).resolves.toBeUndefined()
  })

  it('returns the result of navigator.storage.persisted()', async () => {
    vi.stubGlobal('navigator', { storage: { persisted: vi.fn().mockResolvedValue(true) } })
    await expect(isStoragePersistent()).resolves.toBe(true)
    vi.stubGlobal('navigator', { storage: { persisted: vi.fn().mockResolvedValue(false) } })
    await expect(isStoragePersistent()).resolves.toBe(false)
  })

  it('is undefined when persisted() rejects', async () => {
    vi.stubGlobal('navigator', { storage: { persisted: vi.fn().mockRejectedValue(new Error('nope')) } })
    await expect(isStoragePersistent()).resolves.toBeUndefined()
  })
})
