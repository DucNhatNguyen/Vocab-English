import { describe, expect, it } from 'vitest'
import { activeTab } from './tabs.ts'

describe('activeTab', () => {
  it.each([
    ['/', 'words'],
    ['/learn', 'words'],
    ['/review', 'words'],
    ['/notebook', 'words'],
    ['/stats', 'words'],
    ['/search', 'words'],
    ['/my-words/new', 'words'],
    ['/my-words/custom%3Aabc/edit', 'words'],
    ['/words/custom%3Aabc', 'words'],
    ['/settings', 'words'],
    ['/bai-tap', 'exercises'],
    ['/bai-tap/practice-test-01', 'exercises'],
    ['/bai-tap/practice-test-01/lam', 'exercises'],
    ['/bai-tap/cau-sai', 'exercises'],
  ])('%s -> %s', (path, tab) => expect(activeTab(path)).toBe(tab))

  it('ignores a trailing slash', () => {
    expect(activeTab('/bai-tap/')).toBe('exercises')
    expect(activeTab('/learn/')).toBe('words')
  })
})
