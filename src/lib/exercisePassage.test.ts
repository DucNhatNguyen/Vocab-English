/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { ExerciseSet } from '../data/exercises/types.ts'
import { clozeBlankStates, parsePrompt, passageParagraphs, rewriteTail } from './exercisePassage.ts'

const pt01 = JSON.parse(
  readFileSync(new URL('../data/exercises/practice-test-01.json', import.meta.url), 'utf8'),
) as ExerciseSet
const cloze = pt01.sections.find((s) => s.id === 'pt01-p2b')!

describe('passageParagraphs', () => {
  it('cuts paragraphs and numbered blanks', () => {
    const [first] = passageParagraphs('He {{36}} this {{37}} the name.\n\nSecond one.')
    expect(first).toEqual([
      { kind: 'text', text: 'He ' },
      { kind: 'blank', number: 36 },
      { kind: 'text', text: ' this ' },
      { kind: 'blank', number: 37 },
      { kind: 'text', text: ' the name.' },
    ])
    expect(passageParagraphs('He {{36}} this {{37}} the name.\n\nSecond one.')).toHaveLength(2)
  })

  it('handles a blank at either end and a passage without blanks', () => {
    expect(passageParagraphs('{{1}} and {{2}}')[0]).toEqual([
      { kind: 'blank', number: 1 },
      { kind: 'text', text: ' and ' },
      { kind: 'blank', number: 2 },
    ])
    expect(passageParagraphs('Plain text.\n\n\n\nMore.')).toEqual([
      [{ kind: 'text', text: 'Plain text.' }],
      [{ kind: 'text', text: 'More.' }],
    ])
  })

  it('finds every blank of the real cloze passage, one per question', () => {
    const blanks = passageParagraphs(cloze.passage!.text)
      .flat()
      .flatMap((part) => (part.kind === 'blank' ? [part.number] : []))
    expect(blanks).toEqual(cloze.questions.map((q) => q.number))
  })
})

describe('clozeBlankStates', () => {
  it('reports the picked word, the right word and the verdict of answered blanks only', () => {
    const q36 = cloze.questions[0]
    const q37 = cloze.questions[1]
    if (q36.type !== 'choice' || q37.type !== 'choice') throw new Error('expected choice questions')
    const wrongIndex = (q37.answer + 1) % q37.options.length
    const states = clozeBlankStates(cloze, {
      [q36.id]: { value: q36.answer, correct: true },
      [q37.id]: { value: wrongIndex, correct: false },
    })
    expect([...states.keys()]).toEqual([36, 37])
    expect(states.get(36)).toEqual({ chosen: q36.options[q36.answer], answer: q36.options[q36.answer], correct: true })
    expect(states.get(37)).toEqual({
      chosen: q37.options[wrongIndex],
      answer: q37.options[q37.answer],
      correct: false,
    })
  })
})

describe('parsePrompt', () => {
  it('turns ___ into a gap', () => {
    expect(parsePrompt('We ___ the preparation.')).toEqual([
      [
        { kind: 'text', text: 'We ' },
        { kind: 'gap' },
        { kind: 'text', text: ' the preparation.' },
      ],
    ])
  })

  it('splits dialogue turns on new lines and finds a gap in any of them', () => {
    const lines = parsePrompt('- "What did they find?"\n- "The man ___ going through the files."')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toEqual([{ kind: 'text', text: '- "What did they find?"' }])
    expect(lines[1].map((p) => p.kind)).toEqual(['text', 'gap', 'text'])
  })

  it('handles a prompt without a gap and a gap at the end', () => {
    expect(parsePrompt('What is the purpose of this text?')).toEqual([
      [{ kind: 'text', text: 'What is the purpose of this text?' }],
    ])
    expect(parsePrompt('He is ___')).toEqual([[{ kind: 'text', text: 'He is ' }, { kind: 'gap' }]])
  })

  it('has a gap in every real prompt that contains one', () => {
    for (const section of pt01.sections) {
      for (const question of section.questions) {
        if (question.type === 'choice' && question.prompt?.includes('___')) {
          expect(parsePrompt(question.prompt).flat().some((p) => p.kind === 'gap')).toBe(true)
        }
      }
    }
  })
})

describe('rewriteTail', () => {
  it('appends the suffix, without a space before punctuation', () => {
    expect(rewriteTail({}, 'the good weather, we stayed indoors.')).toBe('the good weather, we stayed indoors.')
    expect(rewriteTail({ suffix: 'several broken bones.' }, 'though he had')).toBe('though he had several broken bones.')
    expect(rewriteTail({ suffix: ', I cannot agree.' }, 'admiring Shakespeare')).toBe('admiring Shakespeare, I cannot agree.')
  })

  it('collapses line breaks the user typed', () => {
    expect(rewriteTail({}, 'the  good\nweather')).toBe('the good weather')
  })
})
