import { matchRoutes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { paths } from './paths.ts'

describe('paths', () => {
  it('encodes ids containing ":" and the router decodes them back', () => {
    const url = paths.word('custom:1234-abcd')
    expect(url).toBe('/words/custom%3A1234-abcd')
    // matchRoutes is what <Routes> uses, and is where useParams values get decoded
    const match = matchRoutes([{ path: '/words/:wordId' }], url)
    expect(match?.[0]?.params.wordId).toBe('custom:1234-abcd')
  })

  it('leaves plain slugs readable', () => {
    expect(paths.word('thank-you')).toBe('/words/thank-you')
    expect(paths.deck('ielts-moi-truong')).toBe('/decks/ielts-moi-truong')
  })

  it('builds the "Từ của tôi" routes with encoded ids and prefill', () => {
    expect(paths.myWords).toBe('/tu-hoc')
    expect(paths.myWordNew()).toBe('/my-words/new')
    expect(paths.myWordNew('ice cream & co')).toBe('/my-words/new?word=ice%20cream%20%26%20co')
    const url = paths.myWordEdit('custom:1234-abcd')
    expect(url).toBe('/my-words/custom%3A1234-abcd/edit')
    const match = matchRoutes([{ path: '/my-words/:wordId/edit' }], url)
    expect(match?.[0]?.params.wordId).toBe('custom:1234-abcd')
  })
})
