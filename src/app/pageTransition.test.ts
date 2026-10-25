import { describe, expect, it } from 'vitest'
import {
  classifyNavigation,
  isTabRoot,
  pageTarget,
  PUSH_ENTER_X,
  PUSH_EXIT_X,
  sectionKey,
  type PageMotionCustom,
} from './pageTransition.ts'

const custom = (over: Partial<PageMotionCustom> = {}): PageMotionCustom => ({
  kind: 'push',
  reduced: false,
  flatExit: false,
  ...over,
})

describe('classifyNavigation', () => {
  it('crossfades between tab roots', () => {
    expect(classifyNavigation('/', '/tu-hoc', 'PUSH')).toBe('tab')
    expect(classifyNavigation('/tu-hoc', '/bai-tap', 'PUSH')).toBe('tab')
    expect(classifyNavigation('/bai-tap', '/', 'POP')).toBe('tab')
  })

  it('treats a tab-bar tap from a deeper page as a tab change', () => {
    expect(classifyNavigation('/words/hello', '/tu-hoc', 'PUSH')).toBe('tab')
    expect(classifyNavigation('/stats', '/', 'REPLACE')).toBe('tab')
  })

  it('home -> settings is a push and back is a pop', () => {
    expect(classifyNavigation('/', '/settings', 'PUSH')).toBe('push')
    expect(classifyNavigation('/settings', '/', 'POP')).toBe('pop')
  })

  it('pushes when drilling deeper', () => {
    expect(classifyNavigation('/', '/words/hello', 'PUSH')).toBe('push')
    expect(classifyNavigation('/', '/stats', 'PUSH')).toBe('push')
    expect(classifyNavigation('/decks', '/decks/ielts', 'PUSH')).toBe('push')
    expect(classifyNavigation('/notebook', '/words/custom%3Aabc', 'PUSH')).toBe('push')
  })

  it('pops when going back from a deeper page', () => {
    expect(classifyNavigation('/words/hello', '/', 'POP')).toBe('pop')
    expect(classifyNavigation('/decks/ielts', '/decks', 'POP')).toBe('pop')
    expect(classifyNavigation('/words/a', '/words/b', 'POP')).toBe('pop')
  })

  it('pushes on the forward button', () => {
    expect(classifyNavigation('/decks', '/decks/ielts', 'POP')).toBe('push')
    expect(classifyNavigation('/', '/stats', 'POP')).toBe('push')
  })

  it('reads a replace to a shallower page as back, otherwise as push', () => {
    expect(classifyNavigation('/words/custom%3Aabc', '/my-words', 'REPLACE')).toBe('pop')
    // landing on a tab root after a replace (e.g. deleting an own word) crossfades
    expect(classifyNavigation('/words/custom%3Aabc', '/tu-hoc', 'REPLACE')).toBe('tab')
    expect(classifyNavigation('/my-words/new', '/words/x', 'REPLACE')).toBe('push')
  })
})

describe('sectionKey / isTabRoot', () => {
  it('ignores a trailing slash', () => {
    expect(sectionKey('/search/')).toBe('/search')
    expect(sectionKey('/')).toBe('/')
    expect(isTabRoot('/bai-tap/')).toBe(true)
  })

  it('has three tab roots: home, Tự học and Bài tập', () => {
    expect(isTabRoot('/')).toBe(true)
    expect(isTabRoot('/tu-hoc')).toBe(true)
    expect(isTabRoot('/bai-tap/')).toBe(true)
    expect(isTabRoot('/notebook')).toBe(false)
    expect(isTabRoot('/learn')).toBe(false)
    expect(isTabRoot('/settings')).toBe(false)
  })

  it('does not treat deeper pages as tab roots', () => {
    expect(isTabRoot('/words/x')).toBe(false)
    expect(isTabRoot('/stats')).toBe(false)
  })
})

describe('pageTarget', () => {
  it('tab: rises in, fades out', () => {
    const c = custom({ kind: 'tab' })
    expect(pageTarget('enter', c)).toMatchObject({ opacity: 0, y: 8 })
    expect(pageTarget('center', c)).toMatchObject({ opacity: 1, x: 0, y: 0 })
    const exit = pageTarget('exit', c)
    expect(exit.opacity).toBe(0)
    expect(exit.x).toBeUndefined()
    expect(exit.y).toBeUndefined()
  })

  it('push enters from the right and the old page leaves to the left', () => {
    const c = custom({ kind: 'push' })
    expect(pageTarget('enter', c)).toMatchObject({ opacity: 0, x: PUSH_ENTER_X })
    expect(pageTarget('exit', c)).toMatchObject({ opacity: 0, x: PUSH_EXIT_X })
  })

  it('pop mirrors push', () => {
    const c = custom({ kind: 'pop' })
    expect(pageTarget('enter', c)).toMatchObject({ opacity: 0, x: PUSH_EXIT_X })
    expect(pageTarget('exit', c)).toMatchObject({ opacity: 0, x: PUSH_ENTER_X })
  })

  it('keeps exits short', () => {
    for (const kind of ['tab', 'push', 'pop'] as const) {
      expect(pageTarget('exit', custom({ kind })).transition.duration).toBeLessThanOrEqual(0.12)
    }
  })

  it('an immersive page only fades out', () => {
    const exit = pageTarget('exit', custom({ kind: 'push', flatExit: true }))
    expect(exit.x).toBeUndefined()
    expect(exit.opacity).toBe(0)
  })

  it('reduced motion is a plain, short fade', () => {
    for (const kind of ['tab', 'push', 'pop'] as const) {
      for (const phase of ['enter', 'center', 'exit'] as const) {
        const t = pageTarget(phase, custom({ kind, reduced: true }))
        expect(t.x).toBeUndefined()
        expect(t.y).toBeUndefined()
        expect(t.transition.duration).toBeLessThanOrEqual(0.15)
      }
    }
  })
})
