/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { EXERCISE_CATALOG, getCatalogEntry, isExerciseSetId, loadExerciseSet } from './catalog.ts'
import type { ExerciseSet } from './types.ts'

// Read the folder at run time: vitest caches the transform of import.meta.glob,
// so JSON files added later would be silently skipped.
const dir = new URL('./', import.meta.url)
const sets = readdirSync(dir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => ({ file, set: JSON.parse(readFileSync(new URL(file, dir), 'utf8')) as ExerciseSet }))

const nonEmpty = (s: unknown) => typeof s === 'string' && s.trim().length > 0

describe('exercise sets', () => {
  it('found at least one set', () => {
    expect(sets.length).toBeGreaterThan(0)
  })

  it('names each file after its set id, with unique ids', () => {
    for (const { file, set } of sets) expect(file, file).toBe(`${set.id}.json`)
    const ids = sets.flatMap(({ set }) => [set.id, ...set.sections.flatMap((s) => [s.id, ...s.questions.map((q) => q.id)])])
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([])
  })

  for (const { file, set } of sets) {
    describe(file, () => {
      it('has set metadata', () => {
        expect(nonEmpty(set.title)).toBe(true)
        expect(['practice-test', 'grammar', 'writing']).toContain(set.kind)
        expect(set.sourcePages[0]).toBeLessThanOrEqual(set.sourcePages[1])
        expect(['ai', 'key']).toContain(set.answerSource)
        expect(set.sections.length).toBeGreaterThan(0)
      })

      for (const section of set.sections) {
        it(`section ${section.id} is well-formed`, () => {
          expect(nonEmpty(section.title)).toBe(true)
          expect(nonEmpty(section.instruction)).toBe(true)
          expect(section.questions.length).toBeGreaterThan(0)
          const blanks = [...(section.passage?.text ?? '').matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]))
          expect(new Set(blanks).size, 'duplicate cloze blank').toBe(blanks.length)

          for (const q of section.questions) {
            expect(Number.isInteger(q.number) && q.number > 0, q.id).toBe(true)
            expect(nonEmpty(q.explanation), q.id).toBe(true)
            if (q.type === 'choice') {
              expect(q.options.length, q.id).toBeGreaterThanOrEqual(2)
              expect(q.options.every(nonEmpty), q.id).toBe(true)
              expect(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, q.id).toBe(true)
              expect(q.optionNotes.length, q.id).toBe(q.options.length)
              q.optionNotes.forEach((note, i) => expect(i === q.answer ? note === '' : nonEmpty(note), `${q.id} note ${i}`).toBe(true))
              if (q.prompt === undefined) expect(blanks, `${q.id} has no prompt and no {{${q.number}}} blank`).toContain(q.number)
              else expect(nonEmpty(q.prompt), q.id).toBe(true)
            } else {
              expect(q.type, q.id).toBe('rewrite')
              expect(nonEmpty(q.original) && nonEmpty(q.prefix), q.id).toBe(true)
              expect(q.answers.length, q.id).toBeGreaterThan(0)
              expect(q.answers.every(nonEmpty), q.id).toBe(true)
            }
          }
          const choiceNumbers = section.questions.filter((q) => q.type === 'choice' && q.prompt === undefined).map((q) => q.number)
          expect([...blanks].sort((a, b) => a - b), 'every blank has a question').toEqual([...choiceNumbers].sort((a, b) => a - b))
        })
      }
    })
  }
})

describe('exercise catalog', () => {
  it('lists exactly the JSON files, in display order', () => {
    expect(EXERCISE_CATALOG.map((e) => e.id).sort()).toEqual(sets.map(({ set }) => set.id).sort())
    const order = { 'practice-test': 0, grammar: 1, writing: 2 }
    const ranks = EXERCISE_CATALOG.map((e) => order[e.kind])
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
    expect(EXERCISE_CATALOG.map((e) => e.kind)).toEqual([
      ...Array(10).fill('practice-test'),
      ...Array(3).fill('grammar'),
      'writing',
    ])
  })

  it('matches title, kind, question count and section count of every set', () => {
    for (const { set } of sets) {
      const entry = getCatalogEntry(set.id)
      expect(entry, set.id).toBeDefined()
      expect(entry).toEqual({
        id: set.id,
        title: set.title,
        kind: set.kind,
        questionCount: set.sections.reduce((n, s) => n + s.questions.length, 0),
        sectionCount: set.sections.length,
      })
    }
  })

  it('looks ids up', () => {
    expect(isExerciseSetId('practice-test-01')).toBe(true)
    expect(isExerciseSetId('nope')).toBe(false)
    expect(getCatalogEntry('nope')).toBeUndefined()
  })

  it('lazy-loads a set by id, and undefined for an unknown id', async () => {
    const loaded = await loadExerciseSet('grammar-practice-02')
    const fromFile = sets.find(({ set }) => set.id === 'grammar-practice-02')!.set
    expect(loaded).toEqual(fromFile)
    expect(await loadExerciseSet('nope')).toBeUndefined()
    expect(await loadExerciseSet('../types')).toBeUndefined()
  })
})
