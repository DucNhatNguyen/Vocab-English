import type { Settings } from '../db/types.ts'

export type ThemeSetting = Settings['theme']

const THEME_CACHE_KEY = 'tu-ngay-theme'

/** Must match --paper in src/index.css (light / dark). */
export const THEME_COLORS = { light: '#fbf7ee', dark: '#16202b' } as const

export function resolveTheme(theme: ThemeSetting, systemPrefersDark: boolean): 'light' | 'dark' {
  if (theme === 'system') return systemPrefersDark ? 'dark' : 'light'
  return theme
}

/**
 * Drives `<html data-theme>` (forced light/dark; removed for "system", where the CSS media query
 * decides), the theme-color meta, and a localStorage copy that index.html reads before first paint.
 * Never throws.
 */
export function applyTheme(theme: ThemeSetting): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)

  try {
    if (theme === 'system') localStorage.removeItem(THEME_CACHE_KEY)
    else localStorage.setItem(THEME_CACHE_KEY, theme)
  } catch {
    // storage unavailable (private mode): the attribute above is enough for this session
  }

  const prefersDark =
    typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
  const meta = document.querySelector('meta[name="theme-color"]')
  meta?.setAttribute('content', THEME_COLORS[resolveTheme(theme, prefersDark)])
}
