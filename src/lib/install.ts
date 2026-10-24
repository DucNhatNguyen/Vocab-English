/**
 * "Is the app installed, and how can this visitor install it?" Detection is split in two layers:
 * pure functions that take the user agent and flags as input (unit-tested with real UA strings)
 * and thin wrappers that read them from the browser.
 */

export type Platform = 'ios' | 'android' | 'other'

/** Browsers embedded in other apps. They cannot add to the home screen: the link must be opened elsewhere. */
export type InAppBrowser =
  | 'zalo'
  | 'facebook'
  | 'messenger'
  | 'instagram'
  | 'tiktok'
  | 'line'
  | 'webview' // an unidentified embedded web view (iOS UA without the "Safari" token)

/** Which browser an iOS visitor is in. Only meaningful on iOS. */
export type IosBrowser = 'safari' | 'chrome' | 'firefox' | 'edge'

export interface IosVersion {
  major: number
  minor: number
}

export interface InstallEnvironment {
  platform: Platform
  /** null when the version cannot be read (always on non-iOS). */
  iosVersion: IosVersion | null
  /** Set on iOS only. */
  iosBrowser: IosBrowser | null
  inApp: InAppBrowser | null
  standalone: boolean
}

export interface DetectInput {
  userAgent: string
  /** navigator.platform: iPadOS in desktop mode reports "MacIntel". */
  platform?: string
  maxTouchPoints?: number
  standalone?: boolean
}

/** Web Push on iOS needs 16.4 or newer. */
export const WEB_PUSH_MIN_IOS: IosVersion = { major: 16, minor: 4 }

// Order matters: Messenger's UA also carries the Facebook tokens, so it is checked first.
const IN_APP_PATTERNS: ReadonlyArray<readonly [InAppBrowser, RegExp]> = [
  ['messenger', /FB_IAB\/MESSENGER|MessengerForiOS|Orca-Android|\bMessenger\b/i],
  ['facebook', /\bFBAN\b|\bFBAV\b|FB_IAB/i],
  ['instagram', /\bInstagram\b/i],
  ['zalo', /\bZalo/i],
  ['tiktok', /musical_ly|BytedanceWebview|\bTikTok\b|\btrill_/i],
  ['line', /\bLine\/\d/i],
]

export function detectPlatform(userAgent: string, platform = '', maxTouchPoints = 0): Platform {
  if (/iPhone|iPod|iPad/.test(userAgent)) return 'ios'
  // iPadOS 13+ asks for the desktop site by default and reports itself as a Mac with a touch screen
  if (platform === 'MacIntel' && maxTouchPoints > 1) return 'ios'
  if (/Android/i.test(userAgent)) return 'android'
  return 'other'
}

/**
 * iOS version from the UA: "iPhone OS 17_4" gives 17.4. iPadOS in desktop mode freezes the OS
 * token at 10_15_7, but its "Version/x.y" (Safari) tracks the iOS version.
 */
export function parseIosVersion(userAgent: string): IosVersion | null {
  const os = /\b(?:iPhone )?OS (\d+)_(\d+)/.exec(userAgent)
  if (os && !userAgent.includes('Macintosh')) return { major: Number(os[1]), minor: Number(os[2]) }
  const safari = /\bVersion\/(\d+)\.(\d+)/.exec(userAgent)
  if (safari && userAgent.includes('Macintosh')) return { major: Number(safari[1]), minor: Number(safari[2]) }
  return null
}

/** Unknown version counts as supported: do not warn without evidence. */
export function supportsWebPush(version: IosVersion | null): boolean {
  if (!version) return true
  const { major, minor } = WEB_PUSH_MIN_IOS
  return version.major > major || (version.major === major && version.minor >= minor)
}

export function formatIosVersion(version: IosVersion): string {
  return `${version.major}.${version.minor}`
}

export function detectInAppBrowser(userAgent: string, platform: Platform): InAppBrowser | null {
  for (const [name, pattern] of IN_APP_PATTERNS) {
    if (pattern.test(userAgent)) return name
  }
  // Real Safari and the other iOS browsers all send a "Safari/" token; an embedded web view does not
  if (platform === 'ios' && !/Safari\//.test(userAgent)) return 'webview'
  return null
}

export function detectIosBrowser(userAgent: string): IosBrowser {
  if (/CriOS/.test(userAgent)) return 'chrome'
  if (/FxiOS/.test(userAgent)) return 'firefox'
  if (/EdgiOS/.test(userAgent)) return 'edge'
  return 'safari'
}

export function detectEnvironment(input: DetectInput): InstallEnvironment {
  const { userAgent } = input
  const platform = detectPlatform(userAgent, input.platform, input.maxTouchPoints)
  const ios = platform === 'ios'
  return {
    platform,
    iosVersion: ios ? parseIosVersion(userAgent) : null,
    iosBrowser: ios ? detectIosBrowser(userAgent) : null,
    inApp: detectInAppBrowser(userAgent, platform),
    standalone: input.standalone ?? false,
  }
}

/** Installed and opened from the home screen (iOS flag or the standard display-mode query). */
export function computeStandalone(navigatorStandalone: boolean | undefined, displayModeStandalone: boolean): boolean {
  return navigatorStandalone === true || displayModeStandalone
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean }

export function isStandalone(): boolean {
  if (typeof navigator === 'undefined') return false
  const displayMode = typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches
  return computeStandalone((navigator as NavigatorWithStandalone).standalone, displayMode)
}

/** Reads the current browser. */
export function readEnvironment(): InstallEnvironment {
  if (typeof navigator === 'undefined') {
    return { platform: 'other', iosVersion: null, iosBrowser: null, inApp: null, standalone: false }
  }
  return detectEnvironment({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone: isStandalone(),
  })
}

/** Display name of the in-app browser, for "Bạn đang mở trong …". */
export function inAppName(app: InAppBrowser): string {
  switch (app) {
    case 'zalo':
      return 'Zalo'
    case 'facebook':
      return 'Facebook'
    case 'messenger':
      return 'Messenger'
    case 'instagram':
      return 'Instagram'
    case 'tiktok':
      return 'TikTok'
    case 'line':
      return 'Line'
    case 'webview':
      return 'một ứng dụng khác'
  }
}

// --- Home banner ---------------------------------------------------------------------------------

export type BannerKind =
  /** iOS Safari / other iOS browser: points to the install guide. */
  | 'ios'
  /** Inside an in-app browser: asks to open the link in a real browser first. */
  | 'in-app'
  /** Chromium offered a native install prompt. */
  | 'prompt'

/**
 * Which banner the Home page shows, if any. Never when already installed; on desktop and Android
 * only when the browser offered an install prompt.
 */
export function bannerKind(env: InstallEnvironment, canPrompt: boolean): BannerKind | null {
  if (env.standalone) return null
  if (env.inApp) return env.platform === 'ios' || env.platform === 'android' ? 'in-app' : null
  if (env.platform === 'ios') return 'ios'
  return canPrompt ? 'prompt' : null
}

export const BANNER_DISMISS_KEY = 'tu-ngay-install-banner-dismissed'
export const BANNER_DISMISS_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

/** `raw` is the stored timestamp (ms) of the dismissal. Garbage or a future time counts as not dismissed. */
export function isBannerDismissed(raw: string | null, now: number): boolean {
  if (!raw) return false
  const at = Number(raw)
  if (!Number.isFinite(at) || at > now) return false
  return now - at < BANNER_DISMISS_DAYS * DAY_MS
}

export function readBannerDismissed(now = Date.now()): boolean {
  try {
    return isBannerDismissed(localStorage.getItem(BANNER_DISMISS_KEY), now)
  } catch {
    return false
  }
}

export function writeBannerDismissed(now = Date.now()): void {
  try {
    localStorage.setItem(BANNER_DISMISS_KEY, String(now))
  } catch {
    // storage unavailable: the banner is hidden for this visit only
  }
}
