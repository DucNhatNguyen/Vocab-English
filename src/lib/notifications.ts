/**
 * Web Push reminders. This is the ONLY module that talks to OneSignal, so the provider can be
 * swapped by rewriting this file (spec 6.3, 6.9).
 *
 * - The OneSignal page SDK is loaded lazily from its CDN, and never when `VITE_ONESIGNAL_APP_ID`
 *   is unset. It is only needed once the user has asked for reminders or already granted the
 *   browser permission.
 * - The OneSignal service worker part is merged into `src/sw.ts` (see there).
 * - Every failure (offline, blocked script, SDK error) is caught: reminders are a bonus and must
 *   never break the app.
 */
import { loadReminderTags } from '../db/reminderTags.ts'
import { supportsWebPush, type InstallEnvironment } from './install.ts'
import { tagsKey, type ReminderTags } from './reminderTags.ts'

export const ONESIGNAL_SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'

/** Delay that collapses bursts of tag updates (app open + settings change + lesson end) into one. */
export const TAG_SYNC_DEBOUNCE_MS = 1500

/* ---------------------------------------------------------------- SDK surface we use */

/** The slice of the OneSignal v16 page SDK this app uses. */
export interface OneSignalSdk {
  init(options: Record<string, unknown>): Promise<void>
  User: {
    addTags(tags: Record<string, string>): unknown
    PushSubscription: {
      readonly optedIn?: boolean
      optIn(): Promise<void>
      optOut(): Promise<void>
      addEventListener(event: 'change', listener: () => void): void
    }
  }
  Notifications: {
    addEventListener(event: 'permissionChange', listener: () => void): void
  }
}

type OneSignalCallback = (sdk: OneSignalSdk) => void | Promise<void>

interface OneSignalWindow {
  OneSignalDeferred?: OneSignalCallback[]
}

/** Init options. No bell, no welcome notification; the app asks for permission itself. */
export function buildInitOptions(appId: string): Record<string, unknown> {
  return {
    appId,
    // Reuse the app's own service worker (src/sw.ts imports OneSignal's worker code)
    serviceWorkerPath: 'sw.js',
    serviceWorkerParam: { scope: '/' },
    notifyButton: { enable: false },
    welcomeNotification: { disable: true },
  }
}

/**
 * Loads the page SDK with the OneSignalDeferred pattern and initialises it. Rejects when the
 * script cannot be fetched (offline, blocked) or `init` throws. After a failure everything it
 * queued is dropped, so a later retry does not initialise twice.
 */
export function loadOneSignalSdk(
  appId: string,
  win: Window & OneSignalWindow = window,
  doc: Document = document,
): Promise<OneSignalSdk> {
  return new Promise<OneSignalSdk>((resolve, reject) => {
    const script = doc.createElement('script')
    const fail = (error: unknown) => {
      win.OneSignalDeferred = []
      script.remove()
      reject(error instanceof Error ? error : new Error('OneSignal failed to load'))
    }

    win.OneSignalDeferred = win.OneSignalDeferred ?? []
    win.OneSignalDeferred.push(async (sdk) => {
      try {
        await sdk.init(buildInitOptions(appId))
        resolve(sdk)
      } catch (error) {
        fail(error)
      }
    })

    script.src = ONESIGNAL_SDK_URL
    script.defer = true
    script.onerror = () => fail(new Error('OneSignal script blocked or offline'))
    doc.head.appendChild(script)
  })
}

/* ---------------------------------------------------------------- state */

/** Browser permission; 'unsupported' when the page cannot do Web Push at all. */
export type NativePermission = 'default' | 'granted' | 'denied' | 'unsupported'

export interface PushState {
  permission: NativePermission
  /** Where the SDK is: not needed yet, loading, ready, or failed to load. */
  sdk: 'idle' | 'loading' | 'ready' | 'failed'
  /** Permission granted and opted in at the provider. */
  subscribed: boolean
  /** An enable / disable is running. */
  busy: boolean
}

/** What the Settings section shows (one per UI state). */
export type PushView =
  | 'not-configured'
  | 'ios-unsupported'
  | 'ios-install'
  | 'no-push'
  | 'blocked'
  | 'checking'
  | 'error'
  | 'off'
  | 'on'

export function pushView(configured: boolean, env: InstallEnvironment, state: PushState): PushView {
  if (!configured) return 'not-configured'
  if (env.platform === 'ios') {
    if (!supportsWebPush(env.iosVersion)) return 'ios-unsupported'
    // Web Push on iOS exists only for an app opened from the home screen
    if (!env.standalone) return 'ios-install'
  }
  if (state.permission === 'unsupported') return 'no-push'
  if (state.permission === 'denied') return 'blocked'
  if (state.permission === 'granted') {
    if (state.sdk === 'failed') return 'error'
    if (state.sdk !== 'ready') return 'checking'
    return state.subscribed ? 'on' : 'off'
  }
  // Not asked yet
  return 'off'
}

/* ---------------------------------------------------------------- service */

export interface NotificationDeps {
  /** null = push not configured: nothing is ever loaded. */
  appId: string | null
  loadSdk: (appId: string) => Promise<OneSignalSdk>
  readPermission: () => NativePermission
  /** Shows the browser's permission dialog. Must be called straight from a tap. */
  requestPermission: () => Promise<NativePermission>
  loadTags: () => Promise<ReminderTags>
  debounceMs: number
}

export interface NotificationService {
  isConfigured(): boolean
  getState(): PushState
  subscribe(listener: () => void): () => void
  /** App open / back to foreground: refresh state, load the SDK if already granted, sync tags. */
  init(): Promise<void>
  /** "Bật nhắc học". Call it directly from the tap handler (iOS rule). */
  enable(): Promise<void>
  /** "Tắt nhắc học": opt out at the provider (the browser permission stays). */
  disable(): Promise<void>
  /** Debounced + serialised tag update; a no-op unless the browser permission is granted. */
  scheduleTagSync(): void
  /** Sends the six tags now (still serialised, skipped unless subscribed). */
  syncNotificationTags(): Promise<void>
}

export function createNotificationService(deps: NotificationDeps): NotificationService {
  const { appId } = deps
  const listeners = new Set<() => void>()
  let state: PushState = { permission: deps.readPermission(), sdk: 'idle', subscribed: false, busy: false }
  let sdk: OneSignalSdk | null = null
  let sdkPromise: Promise<OneSignalSdk> | null = null

  function setState(patch: Partial<PushState>) {
    const next = { ...state, ...patch }
    if (
      next.permission === state.permission &&
      next.sdk === state.sdk &&
      next.subscribed === state.subscribed &&
      next.busy === state.busy
    ) {
      return
    }
    state = next
    for (const listener of [...listeners]) listener()
  }

  /** Re-reads permission and subscription; never throws. */
  function refresh() {
    const permission = deps.readPermission()
    let subscribed = false
    try {
      subscribed = permission === 'granted' && sdk?.User.PushSubscription.optedIn === true
    } catch {
      subscribed = false
    }
    setState({ permission, subscribed })
  }

  function onProviderChange() {
    refresh()
    if (state.subscribed) scheduleTagSync()
  }

  function ensureSdk(): Promise<OneSignalSdk> {
    if (!appId) return Promise.reject(new Error('push not configured'))
    if (!sdkPromise) {
      setState({ sdk: 'loading' })
      sdkPromise = deps.loadSdk(appId).then(
        (loaded) => {
          sdk = loaded
          try {
            loaded.User.PushSubscription.addEventListener('change', onProviderChange)
            loaded.Notifications.addEventListener('permissionChange', onProviderChange)
          } catch {
            // listeners are a convenience; coming back to the app refreshes the state anyway
          }
          setState({ sdk: 'ready' })
          refresh()
          return loaded
        },
        (error: unknown) => {
          sdkPromise = null
          setState({ sdk: 'failed' })
          throw error
        },
      )
    }
    return sdkPromise
  }

  /* ---- tags ---- */

  let timer: ReturnType<typeof setTimeout> | null = null
  let running = false
  let again = false
  let lastSentKey: string | null = null

  async function sendTags() {
    // An init may still be in flight (app just opened): wait for it
    if (sdkPromise) await sdkPromise
    refresh()
    if (!sdk || !state.subscribed) return
    const tags = await deps.loadTags()
    const key = tagsKey(tags)
    if (key === lastSentKey) return
    await sdk.User.addTags({ ...tags })
    lastSentKey = key
  }

  /** One send at a time; requests that arrive meanwhile trigger exactly one more run. */
  async function runSync() {
    if (running) {
      again = true
      return
    }
    running = true
    try {
      do {
        again = false
        try {
          await sendTags()
        } catch {
          // offline / provider error: the next trigger tries again
        }
      } while (again)
    } finally {
      running = false
    }
  }

  function scheduleTagSync() {
    if (!appId || deps.readPermission() !== 'granted') return
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void runSync()
    }, deps.debounceMs)
  }

  /* ---- public API ---- */

  async function init() {
    refresh()
    if (!appId || state.permission !== 'granted') return
    try {
      await ensureSdk()
    } catch {
      return
    }
    refresh()
    if (state.subscribed) scheduleTagSync()
  }

  async function enable() {
    if (!appId || state.busy) return
    setState({ busy: true })
    try {
      let permission = deps.readPermission()
      // The first await is the permission dialog, so it is requested synchronously from the tap
      if (permission === 'default') permission = await deps.requestPermission()
      refresh()
      if (permission !== 'granted') return
      const loaded = await ensureSdk()
      await loaded.User.PushSubscription.optIn()
      lastSentKey = null // a fresh subscription gets its tags even if they match the last send
      refresh()
      await runSync()
    } catch {
      // load / opt-in failed: the state shows it (sdk 'failed') or stays 'off'
    } finally {
      refresh()
      setState({ busy: false })
    }
  }

  async function disable() {
    if (!appId || state.busy) return
    setState({ busy: true })
    try {
      const loaded = await ensureSdk()
      await loaded.User.PushSubscription.optOut()
    } catch {
      // keep the previous state; the user can try again
    } finally {
      refresh()
      setState({ busy: false })
    }
  }

  return {
    isConfigured: () => appId !== null,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    init,
    enable,
    disable,
    scheduleTagSync,
    syncNotificationTags: runSync,
  }
}

/* ---------------------------------------------------------------- browser wiring */

/** OneSignal App ID from the build environment; null (push off) when unset or blank. */
export function readAppId(): string | null {
  const raw: unknown = import.meta.env.VITE_ONESIGNAL_APP_ID
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null
}

export function readNativePermission(): NativePermission {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unsupported'
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

async function requestNativePermission(): Promise<NativePermission> {
  await Notification.requestPermission()
  return readNativePermission()
}

const service = createNotificationService({
  appId: readAppId(),
  loadSdk: (appId) => loadOneSignalSdk(appId),
  readPermission: readNativePermission,
  requestPermission: requestNativePermission,
  loadTags: () => loadReminderTags(),
  debounceMs: TAG_SYNC_DEBOUNCE_MS,
})

export const isPushConfigured = service.isConfigured
export const getPushState = service.getState
export const subscribePushState = service.subscribe
export const initNotifications = service.init
export const enablePush = service.enable
export const disablePush = service.disable
export const scheduleTagSync = service.scheduleTagSync
export const syncNotificationTags = service.syncNotificationTags
