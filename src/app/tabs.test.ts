import { describe, expect, it } from 'vitest'
import { activeTab } from './tabs.ts'

describe('activeTab', () => {
  it('Học owns home and everything reached from it', () => {
    for (const p of ['/', '/learn', '/review', '/notebook', '/stats', '/decks', '/decks/x', '/search', '/settings', '/install', '/words/hello']) {
      expect(activeTab(p, '')).toBe('study')
    }
  })
  it('Tự học owns its tab, own-word pages and the self-study sessions', () => {
    expect(activeTab('/tu-hoc', '')).toBe('self')
    expect(activeTab('/my-words/new', '')).toBe('self')
    expect(activeTab('/my-words/custom%3Aabc/edit', '')).toBe('self')
    expect(activeTab('/words/custom%3Aabc', '')).toBe('self')
    expect(activeTab('/learn', '?nguon=tu-hoc')).toBe('self')
    expect(activeTab('/review', '?nguon=tu-hoc')).toBe('self')
  })
  it('Bài tập owns its tab', () => {
    expect(activeTab('/bai-tap', '')).toBe('exercises')
  })
  it('ignores a trailing slash', () => {
    expect(activeTab('/tu-hoc/', '')).toBe('self')
  })
})
