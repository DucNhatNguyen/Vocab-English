import { describe, expect, it } from 'vitest'
import { PARTS_OF_SPEECH } from '../data/types.ts'
import { getPosLabel } from './pos.ts'

describe('getPosLabel', () => {
  it('maps adj to tính từ', () => {
    expect(getPosLabel('adj')).toBe('tính từ')
  })

  it('has a Vietnamese label for every known part of speech', () => {
    for (const pos of PARTS_OF_SPEECH) expect(getPosLabel(pos)).not.toBe(pos)
  })

  it('falls back to the raw code', () => {
    expect(getPosLabel('weird')).toBe('weird')
  })
})
