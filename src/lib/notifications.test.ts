import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectEnvironment } from './install.ts'
import {
  ONESIGNAL_SDK_URL,
  buildInitOptions,
  createNotificationService,
  loadOneSignalSdk,
  pushView,
  readAppId,
  type NativePermission,
  type NotificationDeps,
  type OneSignalSdk,
  type PushState,
} from './notifications.ts'
import type { ReminderTags } from './reminderTags.ts'

const APP_ID = '00000000-0000-0000-0000-000000000000'

const TAGS: ReminderTags = {
  nhac_sang: '1',
  nhac_trua: '0',
  nhac_toi: '1',
  tu_moi: 'resilient',
  so_tu_on: '8',
  streak: '12',
}

/** A fake OneSignal SDK that records calls; `optedIn` follows optIn / optOut. */
function fakeSdk(optedIn = false) {
  const changeListeners: Array<() => void> = []
  const sdk = {
    init: vi.fn(async () => {}),
    User: {
      addTags: vi.fn(),
      PushSubscription: {
        optedIn,
        optIn: vi.fn(async () => {
          sdk.User.PushSubscription.optedIn = true
        }),
        optOut: vi.fn(async () => {
          sdk.User.PushSubscription.optedIn = false
        }),
        addEventListener: vi.fn((_event: string, listener: () => void) => void changeListeners.push(listener)),
      },
    },
    Notifications: { addEventListener: vi.fn() },
  }
  return { sdk, changeListeners }
}

function setup(overrides: Partial<NotificationDeps> & { permission?: NativePermission; sdk?: OneSignalSdk } = {}) {
  let permission: NativePermission = overrides.permission ?? 'default'
  const fake = fakeSdk()
  const sdk = overrides.sdk ?? (fake.sdk as unknown as OneSignalSdk)
  const deps: NotificationDeps = {
    appId: APP_ID,
    loadSdk: vi.fn(async () => sdk),
    readPermission: () => permission,
    requestPermission: vi.fn(async () => {
      permission = 'granted'
      return permission
    }),
    loadTags: vi.fn(async () => ({ ...TAGS })),
    debounceMs: 100,
    ...overrides,
  }
  const service = createNotificationService(deps)
  return { service, deps, fake, setPermission: (p: NativePermission) => (permission = p) }
}

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('not configured (no App ID)', () => {
  it('never loads the SDK or asks for permission, whatever happens', async () => {
    const { service, deps } = setup({ appId: null, permission: 'granted' })
    expect(service.isConfigured()).toBe(false)
    await service.init()
    await service.enable()
    await service.disable()
    service.scheduleTagSync()
    await vi.advanceTimersByTimeAsync(1000)
    expect(deps.loadSdk).not.toHaveBeenCalled()
    expect(deps.requestPermission).not.toHaveBeenCalled()
    expect(deps.loadTags).not.toHaveBeenCalled()
  })

  it('readAppId treats an unset variable as not configured', () => {
    // the test environment has no VITE_ONESIGNAL_APP_ID
    expect(readAppId()).toBeNull()
  })
})

describe('init (app open)', () => {
  it('does not load the SDK while the permission is not granted', async () => {
    for (const permission of ['default', 'denied', 'unsupported'] as const) {
      const { service, deps } = setup({ permission })
      await service.init()
      expect(deps.loadSdk).not.toHaveBeenCalled()
    }
  })

  it('loads the SDK when already granted and syncs the tags once subscribed', async () => {
    const fake = fakeSdk(true)
    const { service, deps } = setup({ permission: 'granted', sdk: fake.sdk as unknown as OneSignalSdk })
    await service.init()
    expect(deps.loadSdk).toHaveBeenCalledWith(APP_ID)
    expect(service.getState()).toMatchObject({ sdk: 'ready', subscribed: true })
    await vi.advanceTimersByTimeAsync(200)
    expect(fake.sdk.User.addTags).toHaveBeenCalledTimes(1)
    expect(fake.sdk.User.addTags).toHaveBeenCalledWith(TAGS)
  })

  it('granted but opted out: loads, does not send tags', async () => {
    const { service, fake } = setup({ permission: 'granted' })
    await service.init()
    expect(service.getState()).toMatchObject({ sdk: 'ready', subscribed: false })
    await vi.advanceTimersByTimeAsync(200)
    expect(fake.sdk.User.addTags).not.toHaveBeenCalled()
  })

  it('survives a failed SDK load and can retry', async () => {
    const fake = fakeSdk(true)
    const loadSdk = vi
      .fn<NotificationDeps['loadSdk']>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(fake.sdk as unknown as OneSignalSdk)
    const { service } = setup({ permission: 'granted', loadSdk })
    await expect(service.init()).resolves.toBeUndefined()
    expect(service.getState().sdk).toBe('failed')
    await service.init()
    expect(service.getState()).toMatchObject({ sdk: 'ready', subscribed: true })
    expect(loadSdk).toHaveBeenCalledTimes(2)
  })
})

describe('enable (Bật nhắc học)', () => {
  it('asks for permission, loads the SDK, opts in and sends all six tags', async () => {
    const { service, deps, fake } = setup()
    await service.enable()
    expect(deps.requestPermission).toHaveBeenCalledTimes(1)
    expect(fake.sdk.User.PushSubscription.optIn).toHaveBeenCalledTimes(1)
    expect(fake.sdk.User.addTags).toHaveBeenCalledWith(TAGS)
    expect(service.getState()).toMatchObject({ permission: 'granted', subscribed: true, busy: false })
  })

  it('requests the permission synchronously, before any other await (iOS user gesture)', () => {
    const { service, deps } = setup()
    void service.enable()
    expect(deps.requestPermission).toHaveBeenCalledTimes(1)
    expect(deps.loadSdk).not.toHaveBeenCalled()
  })

  it('does not load the SDK when the user denies', async () => {
    const { service, deps } = setup({
      requestPermission: vi.fn(async () => 'denied' as const),
      readPermission: vi.fn<() => NativePermission>().mockReturnValueOnce('default').mockReturnValue('denied'),
    })
    await service.enable()
    expect(deps.loadSdk).not.toHaveBeenCalled()
    expect(service.getState()).toMatchObject({ permission: 'denied', subscribed: false, busy: false })
  })

  it('does not ask again when the permission was granted before (opted out earlier)', async () => {
    const { service, deps, fake } = setup({ permission: 'granted' })
    await service.enable()
    expect(deps.requestPermission).not.toHaveBeenCalled()
    expect(fake.sdk.User.PushSubscription.optIn).toHaveBeenCalled()
    expect(service.getState().subscribed).toBe(true)
  })

  it('reports a failed load as sdk failed and recovers on the next tap', async () => {
    const fake = fakeSdk()
    const loadSdk = vi
      .fn<NotificationDeps['loadSdk']>()
      .mockRejectedValueOnce(new Error('blocked'))
      .mockResolvedValue(fake.sdk as unknown as OneSignalSdk)
    const { service } = setup({ loadSdk })
    await service.enable()
    expect(service.getState()).toMatchObject({ permission: 'granted', sdk: 'failed', subscribed: false, busy: false })
    await service.enable()
    expect(service.getState()).toMatchObject({ sdk: 'ready', subscribed: true })
  })
})

describe('disable (Tắt nhắc học)', () => {
  it('opts out and stops syncing', async () => {
    const { service, fake } = setup()
    await service.enable()
    fake.sdk.User.addTags.mockClear()
    await service.disable()
    expect(fake.sdk.User.PushSubscription.optOut).toHaveBeenCalled()
    expect(service.getState().subscribed).toBe(false)
    service.scheduleTagSync()
    await vi.advanceTimersByTimeAsync(500)
    expect(fake.sdk.User.addTags).not.toHaveBeenCalled()
  })
})

describe('tag sync', () => {
  it('collapses a burst of triggers into one update', async () => {
    const { service, deps, fake } = setup()
    await service.enable()
    fake.sdk.User.addTags.mockClear()
    vi.mocked(deps.loadTags).mockResolvedValue({ ...TAGS, streak: '13' })

    for (let i = 0; i < 5; i++) service.scheduleTagSync()
    await vi.advanceTimersByTimeAsync(99)
    expect(fake.sdk.User.addTags).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(10)
    expect(fake.sdk.User.addTags).toHaveBeenCalledTimes(1)
    expect(fake.sdk.User.addTags).toHaveBeenCalledWith({ ...TAGS, streak: '13' })
  })

  it('skips an update that would change nothing', async () => {
    const { service, fake } = setup()
    await service.enable()
    fake.sdk.User.addTags.mockClear()
    service.scheduleTagSync()
    await vi.advanceTimersByTimeAsync(200)
    expect(fake.sdk.User.addTags).not.toHaveBeenCalled()
  })

  it('serialises: a trigger during a send runs once more afterwards, never in parallel', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const { service, deps, fake } = setup()
    await service.enable()
    fake.sdk.User.addTags.mockClear()

    vi.mocked(deps.loadTags).mockClear()
    let call = 0
    vi.mocked(deps.loadTags).mockImplementation(async () => {
      call += 1
      if (call === 1) await gate
      return { ...TAGS, streak: String(20 + call) }
    })

    const first = service.syncNotificationTags()
    const second = service.syncNotificationTags() // arrives while the first is in flight
    await vi.advanceTimersByTimeAsync(0)
    expect(deps.loadTags).toHaveBeenCalledTimes(1)
    release()
    await first
    await second
    await vi.advanceTimersByTimeAsync(0)
    expect(deps.loadTags).toHaveBeenCalledTimes(2)
    expect(fake.sdk.User.addTags).toHaveBeenCalledTimes(2)
  })

  it('swallows provider errors', async () => {
    const { service, fake } = setup()
    await service.enable()
    fake.sdk.User.addTags.mockImplementation(() => {
      throw new Error('network')
    })
    service.scheduleTagSync()
    await expect(vi.advanceTimersByTimeAsync(500)).resolves.not.toThrow()
  })

  it('does nothing before the permission is granted', async () => {
    const { service, deps } = setup()
    service.scheduleTagSync()
    await vi.advanceTimersByTimeAsync(500)
    expect(deps.loadTags).not.toHaveBeenCalled()
  })
})

describe('state subscription', () => {
  it('notifies listeners on change and stops after unsubscribe', async () => {
    const { service } = setup()
    const listener = vi.fn()
    const off = service.subscribe(listener)
    await service.enable()
    expect(listener).toHaveBeenCalled()
    off()
    listener.mockClear()
    await service.disable()
    expect(listener).not.toHaveBeenCalled()
  })

  it('follows a subscription change reported by the SDK', async () => {
    const { service, fake } = setup({ permission: 'granted' })
    await service.init()
    expect(service.getState().subscribed).toBe(false)
    fake.sdk.User.PushSubscription.optedIn = true
    for (const listener of fake.changeListeners) listener()
    expect(service.getState().subscribed).toBe(true)
  })
})

describe('pushView', () => {
  const ready: PushState = { permission: 'default', sdk: 'idle', subscribed: false, busy: false }
  const IPHONE = (version: string) =>
    `Mozilla/5.0 (iPhone; CPU iPhone OS ${version} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1`
  const ios = (version: string, standalone: boolean) =>
    detectEnvironment({ userAgent: IPHONE(version), standalone })
  const desktop = detectEnvironment({ userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Safari/537.36' })

  it('not configured wins over everything', () => {
    expect(pushView(false, ios('17_4', true), ready)).toBe('not-configured')
  })

  it('iOS: too old, then not installed, then the normal states', () => {
    expect(pushView(true, ios('16_3', true), ready)).toBe('ios-unsupported')
    expect(pushView(true, ios('16_3', false), ready)).toBe('ios-unsupported')
    expect(pushView(true, ios('17_4', false), { ...ready, permission: 'unsupported' })).toBe('ios-install')
    expect(pushView(true, ios('16_4', true), ready)).toBe('off')
  })

  it('browser without push support', () => {
    expect(pushView(true, desktop, { ...ready, permission: 'unsupported' })).toBe('no-push')
  })

  it('denied permission', () => {
    expect(pushView(true, desktop, { ...ready, permission: 'denied' })).toBe('blocked')
  })

  it('granted: checking, error, on, off', () => {
    const granted: PushState = { ...ready, permission: 'granted' }
    expect(pushView(true, desktop, { ...granted, sdk: 'idle' })).toBe('checking')
    expect(pushView(true, desktop, { ...granted, sdk: 'loading' })).toBe('checking')
    expect(pushView(true, desktop, { ...granted, sdk: 'failed' })).toBe('error')
    expect(pushView(true, desktop, { ...granted, sdk: 'ready', subscribed: true })).toBe('on')
    expect(pushView(true, desktop, { ...granted, sdk: 'ready', subscribed: false })).toBe('off')
  })

  it('not asked yet: off (shows the enable button)', () => {
    expect(pushView(true, desktop, ready)).toBe('off')
  })
})

describe('loadOneSignalSdk', () => {
  interface FakeScript {
    src: string
    defer: boolean
    onerror: (() => void) | null
    remove: ReturnType<typeof vi.fn>
  }
  type FakeWindow = { OneSignalDeferred?: Array<(sdk: unknown) => unknown> }

  function fakeBrowser(onAppend: (script: FakeScript, win: FakeWindow) => void) {
    const win: FakeWindow = {}
    const scripts: FakeScript[] = []
    const doc = {
      createElement: () => ({ src: '', defer: false, onerror: null, remove: vi.fn() }) as FakeScript,
      head: {
        appendChild: (script: FakeScript) => {
          scripts.push(script)
          onAppend(script, win)
        },
      },
    }
    return { win: win as unknown as Window, doc: doc as unknown as Document, scripts, raw: win }
  }

  /** What the real SDK does after loading: drain the deferred queue. */
  const drain = (sdk: unknown) => (_script: FakeScript, win: FakeWindow) => {
    for (const callback of win.OneSignalDeferred ?? []) void callback(sdk)
  }

  it('adds the v16 page SDK script and initialises with the app settings', async () => {
    const sdk = { init: vi.fn(async () => {}) }
    const { win, doc, scripts } = fakeBrowser(drain(sdk))
    await expect(loadOneSignalSdk(APP_ID, win, doc)).resolves.toBe(sdk)
    expect(scripts).toHaveLength(1)
    expect(scripts[0].src).toBe(ONESIGNAL_SDK_URL)
    expect(ONESIGNAL_SDK_URL).toBe('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js')
    expect(sdk.init).toHaveBeenCalledWith(buildInitOptions(APP_ID))
  })

  it('rejects when the script is blocked or offline, and drops the queued init', async () => {
    const { win, doc, scripts, raw } = fakeBrowser((script) => script.onerror?.())
    await expect(loadOneSignalSdk(APP_ID, win, doc)).rejects.toThrow()
    expect(scripts[0].remove).toHaveBeenCalled()
    expect(raw.OneSignalDeferred).toEqual([])
  })

  it('rejects when init throws', async () => {
    const sdk = { init: vi.fn(async () => Promise.reject(new Error('bad app id'))) }
    const { win, doc } = fakeBrowser(drain(sdk))
    await expect(loadOneSignalSdk(APP_ID, win, doc)).rejects.toThrow('bad app id')
  })

  it('init options: own service worker, scope /, no bell', () => {
    expect(buildInitOptions(APP_ID)).toMatchObject({
      appId: APP_ID,
      serviceWorkerPath: 'sw.js',
      serviceWorkerParam: { scope: '/' },
      notifyButton: { enable: false },
    })
  })
})
