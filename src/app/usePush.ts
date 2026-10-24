import { useSyncExternalStore } from 'react'
import { getPushState, subscribePushState, type PushState } from '../lib/notifications.ts'

/** Live Web Push permission / subscription state. */
export function usePushState(): PushState {
  return useSyncExternalStore(subscribePushState, getPushState)
}
