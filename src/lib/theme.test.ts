import { describe, expect, it } from 'vitest'
import { resolveTheme } from './theme.ts'

describe('resolveTheme', () => {
  it('follows the system preference for "system"', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('forced themes ignore the system preference', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})
