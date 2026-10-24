import { describe, expect, it } from 'vitest'
import { parseDeepLink } from './deepLink.ts'
import { paths } from './paths.ts'

describe('parseDeepLink', () => {
  it('?tu=moi opens the lesson, ?tu=on the review', () => {
    expect(parseDeepLink('?tu=moi')).toEqual({ present: true, target: paths.learn, search: '' })
    expect(parseDeepLink('?tu=on')).toEqual({ present: true, target: paths.review, search: '' })
  })

  it('ignores URLs without the parameter', () => {
    expect(parseDeepLink('')).toEqual({ present: false, target: null, search: '' })
    expect(parseDeepLink('?word=abc')).toEqual({ present: false, target: null, search: '?word=abc' })
  })

  it('consumes an unknown or empty value without a target', () => {
    expect(parseDeepLink('?tu=xyz')).toEqual({ present: true, target: null, search: '' })
    expect(parseDeepLink('?tu=')).toEqual({ present: true, target: null, search: '' })
    expect(parseDeepLink('?tu')).toEqual({ present: true, target: null, search: '' })
  })

  it('is case-sensitive and does not match inherited object keys', () => {
    expect(parseDeepLink('?tu=MOI').target).toBeNull()
    expect(parseDeepLink('?tu=constructor').target).toBeNull()
    expect(parseDeepLink('?tu=__proto__').target).toBeNull()
  })

  it('keeps the other parameters', () => {
    expect(parseDeepLink('?utm=1&tu=on&x=2')).toEqual({ present: true, target: paths.review, search: '?utm=1&x=2' })
  })
})
