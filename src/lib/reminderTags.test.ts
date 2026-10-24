import { describe, expect, it } from 'vitest'
import {
  TAG_NAMES,
  buildAllTags,
  buildProgressTags,
  buildReminderTags,
  tagsKey,
} from './reminderTags.ts'

const NONE = { morning: false, noon: false, evening: false }

describe('buildReminderTags', () => {
  it('maps each switch to "1" / "0"', () => {
    expect(buildReminderTags({ morning: true, noon: false, evening: true })).toEqual({
      nhac_sang: '1',
      nhac_trua: '0',
      nhac_toi: '1',
    })
    expect(buildReminderTags(NONE)).toEqual({ nhac_sang: '0', nhac_trua: '0', nhac_toi: '0' })
  })
})

describe('buildProgressTags', () => {
  it('uses the word and stringifies the counts', () => {
    expect(buildProgressTags({ nextWord: 'resilient', dueTomorrow: 8, streak: 12 })).toEqual({
      tu_moi: 'resilient',
      so_tu_on: '8',
      streak: '12',
    })
  })

  it('sends an empty tu_moi when nothing is left to learn', () => {
    expect(buildProgressTags({ nextWord: null, dueTomorrow: 0, streak: 0 }).tu_moi).toBe('')
  })

  it('keeps counts as clean non-negative integers', () => {
    const tags = buildProgressTags({ nextWord: ' hello ', dueTomorrow: -3, streak: 4.9 })
    expect(tags).toEqual({ tu_moi: 'hello', so_tu_on: '0', streak: '4' })
    expect(buildProgressTags({ nextWord: null, dueTomorrow: Number.NaN, streak: 1 }).so_tu_on).toBe('0')
  })
})

describe('buildAllTags', () => {
  it('has exactly the six tags of the spec', () => {
    const tags = buildAllTags({ reminders: NONE, nextWord: 'a', dueTomorrow: 1, streak: 2 })
    expect(Object.keys(tags).sort()).toEqual([...TAG_NAMES].sort())
    expect(TAG_NAMES).toHaveLength(6)
  })

  it('only holds strings', () => {
    const tags = buildAllTags({ reminders: NONE, nextWord: null, dueTomorrow: 0, streak: 0 })
    for (const value of Object.values(tags)) expect(typeof value).toBe('string')
  })
})

describe('tagsKey', () => {
  const base = buildAllTags({ reminders: NONE, nextWord: 'a', dueTomorrow: 1, streak: 2 })

  it('is equal for equal tags and differs when any tag changes', () => {
    expect(tagsKey({ ...base })).toBe(tagsKey(base))
    expect(tagsKey({ ...base, streak: '3' })).not.toBe(tagsKey(base))
    expect(tagsKey({ ...base, nhac_toi: '1' })).not.toBe(tagsKey(base))
  })
})
