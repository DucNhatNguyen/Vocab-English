import type { ExerciseKind, ExerciseSet } from './types.ts'

/**
 * Light catalog of the exercise sets: everything the list screen and the backup need without
 * loading any question. `exercises.test.ts` checks it against the JSON files.
 */
export interface ExerciseCatalogEntry {
  id: string // = file name without ".json"
  title: string
  kind: ExerciseKind
  questionCount: number
  sectionCount: number
}

const practiceTest = (n: number): ExerciseCatalogEntry => ({
  id: `practice-test-${String(n).padStart(2, '0')}`,
  title: `Practice Test ${n}`,
  kind: 'practice-test',
  questionCount: 50,
  sectionCount: 6,
})

const grammar = (n: number, questionCount: number): ExerciseCatalogEntry => ({
  id: `grammar-practice-${String(n).padStart(2, '0')}`,
  title: `Grammar Practice ${n}`,
  kind: 'grammar',
  questionCount,
  sectionCount: 1,
})

/** In display order: practice tests, grammar, writing. */
export const EXERCISE_CATALOG: readonly ExerciseCatalogEntry[] = [
  ...Array.from({ length: 10 }, (_, i) => practiceTest(i + 1)),
  grammar(1, 20),
  grammar(2, 39),
  grammar(3, 35),
  { id: 'writing-practice', title: 'Writing Practice', kind: 'writing', questionCount: 116, sectionCount: 22 },
]

export function getCatalogEntry(id: string): ExerciseCatalogEntry | undefined {
  return EXERCISE_CATALOG.find((entry) => entry.id === id)
}

export function isExerciseSetId(id: string): boolean {
  return getCatalogEntry(id) !== undefined
}

// Not eager: Vite turns every JSON file into its own chunk, loaded on demand, so the ~630 KB of
// questions stays out of the main bundle.
const loaders = import.meta.glob<ExerciseSet>('./*.json', { import: 'default' })

/** Loads one set (a separate chunk, cached by the service worker); undefined for an unknown id. */
export async function loadExerciseSet(id: string): Promise<ExerciseSet | undefined> {
  if (!isExerciseSetId(id)) return undefined
  const load = loaders[`./${id}.json`]
  return load ? load() : undefined
}
