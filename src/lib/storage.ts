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
