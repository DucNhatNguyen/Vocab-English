/**
 * Ask the browser to keep our IndexedDB data (Safari may evict it after a period of inactivity).
 * Resolves to whether storage is persistent. No-op (false) when unsupported; never throws.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.storage?.persist !== 'function') {
      return false
    }
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

/**
 * Whether the browser already protects our data from automatic eviction.
 * Resolves to undefined when the Storage API is unsupported or fails. Never throws.
 */
export async function isStoragePersistent(): Promise<boolean | undefined> {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.storage?.persisted !== 'function') {
      return undefined
    }
    return await navigator.storage.persisted()
  } catch {
    return undefined
  }
}
