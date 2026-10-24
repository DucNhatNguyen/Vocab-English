import { describe, expect, it } from 'vitest'
import {
  bannerKind,
  computeStandalone,
  detectEnvironment,
  detectInAppBrowser,
  detectPlatform,
  isBannerDismissed,
  parseIosVersion,
  supportsWebPush,
  type InstallEnvironment,
} from './install.ts'

const IOS = 'AppleWebKit/605.1.15 (KHTML, like Gecko)'
const UA = {
  iphoneSafari: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) ${IOS} Version/17.4 Mobile/15E148 Safari/604.1`,
  iphoneSafari163: `Mozilla/5.0 (iPhone; CPU iPhone OS 16_3_1 like Mac OS X) ${IOS} Version/16.3 Mobile/15E148 Safari/604.1`,
  iphoneSafari1610: `Mozilla/5.0 (iPhone; CPU iPhone OS 16_10 like Mac OS X) ${IOS} Version/16.10 Mobile/15E148 Safari/604.1`,
  ipadOld: `Mozilla/5.0 (iPad; CPU OS 15_7 like Mac OS X) ${IOS} Version/15.6 Mobile/15E148 Safari/604.1`,
  ipadDesktopMode: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ${IOS} Version/17.4 Safari/605.1.15`,
  macSafari: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ${IOS} Version/17.4 Safari/605.1.15`,
  iphoneChrome: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) ${IOS} CriOS/123.0.6312.52 Mobile/15E148 Safari/604.1`,
  iphoneFirefox: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) ${IOS} FxiOS/124.0 Mobile/15E148 Safari/605.1.15`,
  iphoneEdge: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) ${IOS} Version/17.0 EdgiOS/123.0.2420.97 Mobile/15E148 Safari/605.1.15`,
  iphoneZalo: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) ${IOS} Mobile/15E148 Safari/604.1 Zalo/24.3.1`,
  iphoneFacebook: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) ${IOS} Mobile/15E148 [FBAN/FBIOS;FBAV/450.0.0.38.108;FBBV/565017568;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.4;FBSS/3;FBID/phone;FBLC/vi_VN;FBOP/5]`,
  iphoneMessenger: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) ${IOS} Mobile/15E148 [FBAN/MessengerForiOS;FBAV/450.0.0.38.108;FBBV/565017568;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.4;FBLC/vi_VN;FBOP/5]`,
  androidMessenger: `Mozilla/5.0 (Linux; Android 13; SM-S918B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/123.0.6312.40 Mobile Safari/537.36 [FB_IAB/MESSENGER;FBAV/450.0.0.38.108;]`,
  androidFacebook: `Mozilla/5.0 (Linux; Android 13; SM-S918B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/123.0.6312.40 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0.0.38.108;]`,
  iphoneInstagram: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) ${IOS} Mobile/15E148 Instagram 320.0.0.12.108 (iPhone14,5; iOS 17_4; vi_VN; vi-VN; scale=3.00; 1170x2532; 567424920)`,
  iphoneTikTok: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) ${IOS} Mobile/15E148 musical_ly_33.1.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/vi Region/VN FalconTag/1`,
  androidTikTok: `Mozilla/5.0 (Linux; Android 13; SM-S918B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/123.0.6312.40 Mobile Safari/537.36 trill_330104 JsSdk/1.0 NetType/WIFI`,
  iphoneLine: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) ${IOS} Mobile/15E148 Safari Line/13.5.0`,
  iphoneUnknownWebView: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) ${IOS} Mobile/15E148`,
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36',
  androidZalo:
    'Mozilla/5.0 (Linux; Android 13; SM-A546E Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/123.0.6312.40 Mobile Safari/537.36 Zalo/24.3.1',
  windowsEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
}

describe('detectPlatform', () => {
  it('detects iPhone and iPad user agents', () => {
    expect(detectPlatform(UA.iphoneSafari)).toBe('ios')
    expect(detectPlatform(UA.ipadOld)).toBe('ios')
    expect(detectPlatform('Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)')).toBe('ios')
  })

  it('treats a touch-screen "Mac" (iPadOS desktop mode) as iOS, but not a real Mac', () => {
    expect(detectPlatform(UA.ipadDesktopMode, 'MacIntel', 5)).toBe('ios')
    expect(detectPlatform(UA.macSafari, 'MacIntel', 0)).toBe('other')
    expect(detectPlatform(UA.macSafari, 'MacIntel', 1)).toBe('other')
  })

  it('detects Android and everything else', () => {
    expect(detectPlatform(UA.androidChrome)).toBe('android')
    expect(detectPlatform(UA.windowsEdge, 'Win32', 0)).toBe('other')
  })
})

describe('parseIosVersion', () => {
  it('reads iPhone OS 17_4', () => {
    expect(parseIosVersion(UA.iphoneSafari)).toEqual({ major: 17, minor: 4 })
  })

  it('reads versions with a patch level and old iPad user agents', () => {
    expect(parseIosVersion(UA.iphoneSafari163)).toEqual({ major: 16, minor: 3 })
    expect(parseIosVersion(UA.ipadOld)).toEqual({ major: 15, minor: 7 })
  })

  it('keeps 16.10 above 16.4 (no decimal comparison)', () => {
    expect(parseIosVersion(UA.iphoneSafari1610)).toEqual({ major: 16, minor: 10 })
    expect(supportsWebPush({ major: 16, minor: 10 })).toBe(true)
  })

  it('uses Safari\'s Version token for iPadOS in desktop mode (OS token is frozen at 10_15_7)', () => {
    expect(parseIosVersion(UA.ipadDesktopMode)).toEqual({ major: 17, minor: 4 })
  })

  it('returns null when there is nothing to read', () => {
    expect(parseIosVersion(UA.androidChrome)).toBeNull()
    expect(parseIosVersion('')).toBeNull()
  })
})

describe('supportsWebPush', () => {
  it('needs iOS 16.4 or newer', () => {
    expect(supportsWebPush({ major: 16, minor: 4 })).toBe(true)
    expect(supportsWebPush({ major: 16, minor: 3 })).toBe(false)
    expect(supportsWebPush({ major: 15, minor: 8 })).toBe(false)
    expect(supportsWebPush({ major: 17, minor: 0 })).toBe(true)
  })

  it('does not warn when the version is unknown', () => {
    expect(supportsWebPush(null)).toBe(true)
  })
})

describe('detectInAppBrowser', () => {
  it.each([
    ['zalo', UA.iphoneZalo, 'ios'],
    ['facebook', UA.iphoneFacebook, 'ios'],
    ['facebook', UA.androidFacebook, 'android'],
    ['messenger', UA.iphoneMessenger, 'ios'],
    ['messenger', UA.androidMessenger, 'android'],
    ['instagram', UA.iphoneInstagram, 'ios'],
    ['tiktok', UA.iphoneTikTok, 'ios'],
    ['tiktok', UA.androidTikTok, 'android'],
    ['line', UA.iphoneLine, 'ios'],
    ['zalo', UA.androidZalo, 'android'],
    ['webview', UA.iphoneUnknownWebView, 'ios'],
  ] as const)('recognises %s', (name, ua, platform) => {
    expect(detectInAppBrowser(ua, platform)).toBe(name)
  })

  it('does not flag real browsers', () => {
    expect(detectInAppBrowser(UA.iphoneSafari, 'ios')).toBeNull()
    expect(detectInAppBrowser(UA.iphoneChrome, 'ios')).toBeNull()
    expect(detectInAppBrowser(UA.iphoneFirefox, 'ios')).toBeNull()
    expect(detectInAppBrowser(UA.iphoneEdge, 'ios')).toBeNull()
    expect(detectInAppBrowser(UA.androidChrome, 'android')).toBeNull()
    expect(detectInAppBrowser(UA.windowsEdge, 'other')).toBeNull()
  })
})

describe('detectEnvironment', () => {
  it('describes iPhone Safari', () => {
    expect(detectEnvironment({ userAgent: UA.iphoneSafari, platform: 'iPhone', maxTouchPoints: 5 })).toEqual({
      platform: 'ios',
      iosVersion: { major: 17, minor: 4 },
      iosBrowser: 'safari',
      inApp: null,
      standalone: false,
    })
  })

  it.each([
    [UA.iphoneChrome, 'chrome'],
    [UA.iphoneFirefox, 'firefox'],
    [UA.iphoneEdge, 'edge'],
  ] as const)('tells the other iOS browsers apart', (ua, browser) => {
    const env = detectEnvironment({ userAgent: ua })
    expect(env.iosBrowser).toBe(browser)
    expect(env.inApp).toBeNull()
  })

  it('reports an in-app browser on iOS', () => {
    const env = detectEnvironment({ userAgent: UA.iphoneZalo })
    expect(env.platform).toBe('ios')
    expect(env.inApp).toBe('zalo')
  })

  it('has no iOS fields on Android or desktop', () => {
    expect(detectEnvironment({ userAgent: UA.androidChrome })).toMatchObject({
      platform: 'android',
      iosVersion: null,
      iosBrowser: null,
    })
    expect(detectEnvironment({ userAgent: UA.windowsEdge })).toMatchObject({ platform: 'other', iosBrowser: null })
  })

  it('passes the standalone flag through', () => {
    expect(detectEnvironment({ userAgent: UA.iphoneSafari, standalone: true }).standalone).toBe(true)
  })
})

describe('computeStandalone', () => {
  it('is true for navigator.standalone or the display-mode query', () => {
    expect(computeStandalone(true, false)).toBe(true)
    expect(computeStandalone(undefined, true)).toBe(true)
    expect(computeStandalone(false, false)).toBe(false)
    expect(computeStandalone(undefined, false)).toBe(false)
  })
})

describe('bannerKind', () => {
  const env = (patch: Partial<InstallEnvironment>): InstallEnvironment => ({
    platform: 'other',
    iosVersion: null,
    iosBrowser: null,
    inApp: null,
    standalone: false,
    ...patch,
  })

  it('points iOS visitors to the guide', () => {
    expect(bannerKind(env({ platform: 'ios', iosBrowser: 'safari' }), false)).toBe('ios')
    expect(bannerKind(env({ platform: 'ios', iosBrowser: 'chrome' }), false)).toBe('ios')
  })

  it('asks to leave an in-app browser first', () => {
    expect(bannerKind(env({ platform: 'ios', inApp: 'zalo' }), false)).toBe('in-app')
    expect(bannerKind(env({ platform: 'android', inApp: 'facebook' }), true)).toBe('in-app')
  })

  it('shows the install button only when Chromium offered the prompt', () => {
    expect(bannerKind(env({ platform: 'android' }), true)).toBe('prompt')
    expect(bannerKind(env({ platform: 'android' }), false)).toBeNull()
    expect(bannerKind(env({ platform: 'other' }), false)).toBeNull()
  })

  it('is never shown once installed', () => {
    expect(bannerKind(env({ platform: 'ios', standalone: true }), false)).toBeNull()
    expect(bannerKind(env({ platform: 'android', standalone: true }), true)).toBeNull()
  })
})

describe('isBannerDismissed', () => {
  const DAY = 24 * 60 * 60 * 1000
  const now = Date.UTC(2026, 9, 24, 12)

  it('stays dismissed for 7 days', () => {
    expect(isBannerDismissed(String(now - DAY), now)).toBe(true)
    expect(isBannerDismissed(String(now - 7 * DAY + 1), now)).toBe(true)
  })

  it('comes back after 7 days', () => {
    expect(isBannerDismissed(String(now - 7 * DAY), now)).toBe(false)
    expect(isBannerDismissed(String(now - 30 * DAY), now)).toBe(false)
  })

  it('ignores missing, garbage and future values', () => {
    expect(isBannerDismissed(null, now)).toBe(false)
    expect(isBannerDismissed('', now)).toBe(false)
    expect(isBannerDismissed('yes', now)).toBe(false)
    expect(isBannerDismissed(String(now + DAY), now)).toBe(false)
  })
})
