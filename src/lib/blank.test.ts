import { describe, expect, it } from 'vitest'
import { words } from '../data/index.ts'
import { findBlank, inflections } from './blank.ts'

describe('inflections', () => {
  it('adds the regular endings', () => {
    expect(inflections('walk')).toEqual(
      expect.arrayContaining(['walk', 'walks', 'walkes', 'walked', 'walkd', 'walking']),
    )
  })

  it('handles y-ending, e-ending, ie-ending and doubled consonants', () => {
    expect(inflections('study')).toEqual(expect.arrayContaining(['studies', 'studied', 'studying']))
    expect(inflections('make')).toEqual(expect.arrayContaining(['makes', 'maked', 'making']))
    expect(inflections('die')).toEqual(expect.arrayContaining(['dies', 'died', 'dying']))
    expect(inflections('stop')).toEqual(expect.arrayContaining(['stopped', 'stopping']))
  })

  it('does not turn a vowel+y word into -ies', () => {
    expect(inflections('play')).not.toContain('plaies')
  })
})

describe('findBlank', () => {
  it('blanks the headword case-insensitively and keeps the written form', () => {
    const blank = findBlank('Resilient ecosystems recover quickly after storms.', 'resilient')
    expect(blank).toEqual({
      parts: ['', ' ecosystems recover quickly after storms.'],
      surface: 'Resilient',
      surfaces: ['Resilient'],
    })
  })

  it('accepts simple inflections', () => {
    expect(findBlank('They recovered quickly.', 'recover')?.surface).toBe('recovered')
    expect(findBlank('She is recovering.', 'recover')?.surface).toBe('recovering')
    expect(findBlank('He recovers fast.', 'recover')?.surface).toBe('recovers')
    expect(findBlank('Plants are growing.', 'grow')?.surface).toBe('growing')
  })

  it('accepts -ies / -ied for y-ending words', () => {
    expect(findBlank('She studies at night.', 'study')?.surface).toBe('studies')
    expect(findBlank('He studied hard.', 'study')?.surface).toBe('studied')
    expect(findBlank('Many cities are big.', 'city')?.surface).toBe('cities')
  })

  it('accepts e-ending words losing the e, and -d', () => {
    expect(findBlank('They are making tea.', 'make')?.surface).toBe('making')
    expect(findBlank('We liked it.', 'like')?.surface).toBe('liked')
  })

  it('accepts a doubled final consonant', () => {
    expect(findBlank('The bus stopped.', 'stop')?.surface).toBe('stopped')
    expect(findBlank('He kept running.', 'run')?.surface).toBe('running')
    expect(findBlank('He is planning a trip.', 'plan')?.surface).toBe('planning')
  })

  it('matches on word boundaries only', () => {
    expect(findBlank('The cat sat on the category list.', 'cat')?.parts).toEqual([
      'The ',
      ' sat on the category list.',
    ])
    expect(findBlank('Greatest hits.', 'eat')).toBeNull()
    expect(findBlank('A concatenation.', 'cat')).toBeNull()
  })

  it('keeps an apostrophe suffix outside the blank', () => {
    expect(findBlank("The planet's future.", 'planet')).toEqual({
      parts: ['The ', "'s future."],
      surface: 'planet',
      surfaces: ['planet'],
    })
  })

  it('blanks every occurrence so the answer is not left in the sentence', () => {
    const blank = findBlank('Rain, rain go away.', 'rain')
    expect(blank?.parts).toEqual(['', ', ', ' go away.'])
    expect(blank?.surfaces).toEqual(['Rain', 'rain'])
  })

  it('handles multi-word phrases, including an inflected last word', () => {
    expect(findBlank('Thank you for your help.', 'thank you')).toEqual({
      parts: ['', ' for your help.'],
      surface: 'Thank you',
      surfaces: ['Thank you'],
    })
    expect(findBlank('Burning fossil fuels warms the planet.', 'fossil fuels')?.parts).toEqual([
      'Burning ',
      ' warms the planet.',
    ])
    expect(findBlank('Burning fossil fuel is bad.', 'fossil fuels')).toBeNull()
    expect(findBlank('Many fossil fuels exist.', 'fossil fuel')?.surface).toBe('fossil fuels')
  })

  it('handles phrases with an inflected first word and hyphens', () => {
    expect(findBlank('She looks up the word.', 'look up')?.surface).toBe('looks up')
    expect(findBlank('Check-in starts at noon.', 'check-in')?.surface).toBe('Check-in')
    expect(findBlank('The check in desk is closed.', 'check-in')?.surface).toBe('check in')
  })

  it('treats curly and straight apostrophes alike', () => {
    expect(findBlank('I don’t know.', "don't")?.surface).toBe('don’t')
  })

  it('returns null when the word is not in the sentence or inputs are empty', () => {
    expect(findBlank('Nothing to see here.', 'resilient')).toBeNull()
    expect(findBlank('', 'resilient')).toBeNull()
    expect(findBlank('Some text.', '   ')).toBeNull()
  })

  it('does not blow up on regex characters', () => {
    expect(findBlank('Call me (maybe).', 'maybe')?.parts).toEqual(['Call me (', ').'])
    expect(findBlank('Is it a+b?', 'a+b')?.parts).toEqual(['Is it ', '?'])
    expect(findBlank('Is it ab?', 'a+b')).toBeNull()
  })

  it('finds the headword in every built-in example sentence', () => {
    const missing = words.filter((w) => findBlank(w.exampleEn, w.word) === null)
    // If a future word uses an irregular form, question type 3 simply falls back for that card;
    // extend the inflections or fix the example sentence
    expect(missing.map((w) => w.word)).toEqual([])
  })
})
