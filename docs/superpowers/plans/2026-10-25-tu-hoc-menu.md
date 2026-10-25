# Menu 3 mục, Tự học, Bài tập: kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the tab bar to Học · Tự học · Bài tập, add a self-study tab that learns and reviews only the user's own words, and add a "coming soon" Exercises tab.

**Architecture:** One pure "study source" concept (`decks` / `mine` / `all`) drives word selection. It sits in `src/lib/lesson.ts` and the new `src/lib/studySource.ts`. The existing Learn and Review pages read it from the `?nguon=tu-hoc` query parameter and adapt their copy and exit routes. Navigation state is a pure function (`src/app/tabs.ts`) shared by the TabBar. The page-transition helpers learn the new tab roots.

**Tech Stack:** React 19, react-router 8, Dexie + dexie-react-hooks, motion 14, Vitest + fake-indexeddb, lucide-react.

Design: `docs/superpowers/specs/2026-10-25-tu-hoc-menu-design.md`.

## Global Constraints

- UI copy is in Vietnamese; code, identifiers and comments are in English.
- No new dependencies. Icons come from `lucide-react`, never emoji.
- Keep the existing liquid-glass classes: `glass`, `sheet`, `btn btn--primary|--ghost|--success|--danger`, `icon-btn`, `IconBadge` with hue `blue|violet|pink|orange|green` and size `sm|md|lg`.
- Touch targets must be ≥44px. Respect `env(safe-area-inset-*)` and `prefers-reduced-motion`.
- No IndexedDB schema change and no migration. Custom word ids stay `custom:<uuid>`.
- Old routes keep working: `/learn`, `/review`, `/notebook`, `/settings`, `/stats`, `/decks`, `/search`, `/words/:id`, `/install`, `/my-words/new`, `/my-words/:id/edit`, and the `?tu=moi|on` deep links. `/my-words` redirects to `/tu-hoc`.
- The query parameter is `nguon` and the self-study value is `tu-hoc`.
- Browser checks: headless Edge with `--mute-audio`, with `speechSynthesis.speak`/`cancel` and `AudioContext` stubbed before page scripts. One light walk at 390×844; dark screenshots only for Học, Tự học and Bài tap. Never kill the user's dev server on port 5173; stop your own preview server by its PID.
- Do NOT commit. The user decides about commits. Wherever a step would normally say "commit", run `npm test` instead.

---

### Task 1: Study source and source-aware lesson selection

**Files:**
- Create: `src/lib/studySource.ts`
- Create: `src/lib/studySource.test.ts`
- Modify: `src/lib/lesson.ts` (`LessonSelectionInput`, `selectLessonWords`)
- Modify: `src/lib/lesson.test.ts` (helper `select` plus the tests that assume own words come first)

**Interfaces:**
- Produces:
  - `type StudySource = 'decks' | 'mine' | 'all'`
  - `SOURCE_PARAM = 'nguon'`
  - `SELF_STUDY_VALUE = 'tu-hoc'`
  - `isSelfStudySearch(search: string): boolean`
  - `filterCardsBySource<T extends { wordId: string }>(cards: readonly T[], source: StudySource): T[]`
  - `countNewToday(cards: Iterable<CardProgress>, today: string, source: StudySource): number`
  - `selectLessonWords({ ..., source: 'decks' | 'mine' })`

- [ ] **Step 1: Write the failing tests** in `src/lib/studySource.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import type { CardProgress } from '../db/types.ts'
import { countNewToday, filterCardsBySource, isSelfStudySearch } from './studySource.ts'

const card = (wordId: string, over: Partial<CardProgress> = {}): CardProgress => ({
  wordId,
  level: 1,
  correctCount: 0,
  wrongCount: 0,
  favorite: false,
  ignored: false,
  ...over,
})

describe('isSelfStudySearch', () => {
  it('detects ?nguon=tu-hoc among other params', () => {
    expect(isSelfStudySearch('?nguon=tu-hoc')).toBe(true)
    expect(isSelfStudySearch('?a=1&nguon=tu-hoc')).toBe(true)
  })
  it('is false without it or with another value', () => {
    expect(isSelfStudySearch('')).toBe(false)
    expect(isSelfStudySearch('?nguon=bo-tu')).toBe(false)
  })
})

describe('filterCardsBySource', () => {
  const cards = [card('hello'), card('custom:a'), card('please'), card('custom:b')]
  it('keeps only own words for mine, only built-in words for decks, everything for all', () => {
    expect(filterCardsBySource(cards, 'mine').map((c) => c.wordId)).toEqual(['custom:a', 'custom:b'])
    expect(filterCardsBySource(cards, 'decks').map((c) => c.wordId)).toEqual(['hello', 'please'])
    expect(filterCardsBySource(cards, 'all')).toHaveLength(4)
  })
})

describe('countNewToday', () => {
  const today = '2026-10-25'
  const cards = [
    card('hello', { learnedAt: today }),
    card('custom:a', { learnedAt: today }),
    card('please', { learnedAt: '2026-10-24' }),
    card('thanks', { level: 0 }),
  ]
  it('counts cards first learned today, by source', () => {
    expect(countNewToday(cards, today, 'decks')).toBe(1)
    expect(countNewToday(cards, today, 'mine')).toBe(1)
    expect(countNewToday(cards, today, 'all')).toBe(2)
  })
})
```

- [ ] **Step 2: Run the tests and check they fail**

Run: `npx vitest run src/lib/studySource.test.ts`
Expected: FAIL, because `./studySource.ts` cannot be resolved.

- [ ] **Step 3: Implement** `src/lib/studySource.ts`

```ts
import type { CardProgress } from '../db/types.ts'
import { isCustomWordId } from '../db/words.ts'

/**
 * Where a lesson or a review round takes its words from. `decks`: the active built-in decks
 * (the daily lesson). `mine`: the user's own words (Tự học). `all`: both (the shared review).
 */
export type StudySource = 'decks' | 'mine' | 'all'

/** Query parameter that selects the self-study variant of Learn / Review: `/learn?nguon=tu-hoc`. */
export const SOURCE_PARAM = 'nguon'
export const SELF_STUDY_VALUE = 'tu-hoc'

/** True when a location search string asks for the self-study variant. */
export function isSelfStudySearch(search: string): boolean {
  return new URLSearchParams(search).get(SOURCE_PARAM) === SELF_STUDY_VALUE
}

function matches(wordId: string, source: StudySource): boolean {
  if (source === 'all') return true
  return isCustomWordId(wordId) === (source === 'mine')
}

/** Cards (or any rows with a `wordId`) that belong to a source, order kept. */
export function filterCardsBySource<T extends { wordId: string }>(
  cards: readonly T[],
  source: StudySource,
): T[] {
  return cards.filter((card) => matches(card.wordId, source))
}

/** Learned cards of a source whose first lesson was today ("Hôm nay: x/N từ mới"). */
export function countNewToday(
  cards: Iterable<CardProgress>,
  today: string,
  source: StudySource,
): number {
  let count = 0
  for (const card of cards) {
    if (card.level >= 1 && card.learnedAt === today && matches(card.wordId, source)) count += 1
  }
  return count
}
```

- [ ] **Step 4: Run the tests and check they pass**

Run: `npx vitest run src/lib/studySource.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Make lesson selection source-aware.** First change the tests in `src/lib/lesson.test.ts`.

In the `select` helper, add `source: 'decks',` before `...over`.

Replace the test `'puts custom words first, oldest first, then decks in active order'` with:

```ts
  it('decks: only deck words, in active order, never own words', () => {
    const customWords = [custom('x', '2026-10-02'), custom('y', '2026-10-01')]
    expect(select({ customWords })).toEqual(['a1', 'a2', 'a3', 'b1', 'b2'])
  })

  it('mine: only own words, oldest first, never deck words', () => {
    const customWords = [custom('x', '2026-10-02'), custom('y', '2026-10-01')]
    expect(select({ source: 'mine', customWords })).toEqual(['custom:y', 'custom:x'])
  })

  it('mine: respects the count and skips learned own words', () => {
    const customWords = [custom('x', '2026-10-01'), custom('y', '2026-10-02'), custom('z', '2026-10-03')]
    const progress = new Map([['custom:x', prog('custom:x', 1)]])
    expect(select({ source: 'mine', customWords, progress, count: 1 })).toEqual(['custom:y'])
  })
```

In `'orders custom words created on the same day by creation time, then id'`, pass `source: 'mine'` to `select` and drop any deck ids from the expected array, so it only expects custom ids in order. Run the file once and adjust every other test whose expectation started with `custom:` ids in the same way: either add `source: 'mine'` or remove the custom ids from the expectation. Keep each test's intent.

- [ ] **Step 6: Run and check they fail**

Run: `npx vitest run src/lib/lesson.test.ts`
Expected: FAIL. The decks-only test still gets `custom:y`, `custom:x` first.

- [ ] **Step 7: Implement** in `src/lib/lesson.ts`

Add this field to `LessonSelectionInput`:

```ts
  /** `decks`: the daily lesson (active decks only). `mine`: Tự học (own words only). */
  source: 'decks' | 'mine'
```

Update the doc comment and the body of `selectLessonWords`:

```ts
/**
 * Words for the next new-word lesson of a source.
 * - `mine`: unlearned custom words, oldest first (`createdAt`, then `createdAtMs`, then id).
 * - `decks`: unlearned words of each active deck in the order the ids are listed, each deck in its
 *   own order; unknown decks skipped, duplicates dropped.
 * May return fewer than `count` words, or none.
 */
export function selectLessonWords({
  count,
  customWords,
  activeDeckIds,
  progress,
  source,
  getDeckWords = getBuiltInDeckWords,
}: LessonSelectionInput): Word[] {
  const limit = Math.floor(count)
  if (!(limit > 0)) return []

  const picked: Word[] = []
  const seen = new Set<string>()
  // Returns true once the lesson is full.
  const add = (word: Word): boolean => {
    if (!seen.has(word.id) && isUnlearned(progress.get(word.id))) {
      seen.add(word.id)
      picked.push(word)
    }
    return picked.length >= limit
  }

  if (source === 'mine') {
    for (const word of [...customWords].sort(compareCustomWordsOldestFirst)) if (add(word)) break
    return picked
  }

  for (const deckId of activeDeckIds) {
    for (const word of getDeckWords(deckId)) if (add(word)) return picked
  }
  return picked
}
```

- [ ] **Step 8: Run and check they pass**

Run: `npx vitest run src/lib/lesson.test.ts src/lib/studySource.test.ts`
Expected: PASS. `npx tsc -b` will now fail in `src/db/lesson.ts` (missing `source`). Task 2 fixes that.

---

### Task 2: Data loaders by source

**Files:**
- Modify: `src/db/lesson.ts` (`loadLessonWords`)
- Modify: `src/db/stats.ts` (`HomeData`, `loadHomeData`, new `loadSelfStudyData`)
- Modify: `src/db/lesson.test.ts`, `src/db/stats.test.ts`

**Interfaces:**
- Consumes: `selectLessonWords({ source })`, `filterCardsBySource`, `countNewToday` (Task 1).
- Produces:
  - `loadLessonWords(source: 'decks' | 'mine' = 'decks'): Promise<Word[]>`
  - `HomeData.newToday: number` (deck words first learned today)
  - `interface SelfStudyData { unlearnedCount: number; dueCount: number; totalCount: number }`
  - `loadSelfStudyData(today?: string): Promise<SelfStudyData>`

- [ ] **Step 1: Write the failing tests**

In `src/db/lesson.test.ts`, replace `'returns up to dailyGoal words: own words first, then the active decks'` with:

```ts
  it('decks (default): up to dailyGoal deck words, never own words', async () => {
    await updateSettings({ dailyGoal: 5, activeDeckIds: ['giao-tiep-hang-ngay'] })
    await createCustomWord({
      word: 'serendipity',
      ipa: '',
      pos: 'noun',
      meaningVi: 'sự tình cờ may mắn',
      exampleEn: '',
      exampleVi: '',
    })

    const lesson = await loadLessonWords()
    expect(lesson).toHaveLength(5)
    expect(lesson[0].id).toBe('hello')
    expect(lesson.some((w) => w.id.startsWith('custom:'))).toBe(false)
  })

  it('mine: only own unlearned words, up to dailyGoal, even with no active deck', async () => {
    await updateSettings({ dailyGoal: 5, activeDeckIds: [] })
    const mine = await createCustomWord({
      word: 'serendipity',
      ipa: '',
      pos: 'noun',
      meaningVi: 'sự tình cờ may mắn',
      exampleEn: '',
      exampleVi: '',
    })
    expect((await loadLessonWords('mine')).map((w) => w.id)).toEqual([mine.id])
  })
```

In `src/db/stats.test.ts`, add `loadSelfStudyData` to the import from `./stats.ts`, then add:

```ts
describe('loadHomeData newToday', () => {
  it('counts only deck words first learned today', async () => {
    await db.progress.bulkPut([
      card('hello', 1, { dueDate: '2026-10-25', learnedAt: TODAY }),
      card('custom:x', 1, { dueDate: '2026-10-25', learnedAt: TODAY }),
      card('please', 1, { dueDate: '2026-10-24', learnedAt: '2026-10-23' }),
    ])
    expect((await loadHomeData(TODAY)).newToday).toBe(1)
  })
})

describe('loadSelfStudyData', () => {
  it('counts own words: total, unlearned, due today', async () => {
    const a = await createCustomWord({ word: 'alpha', ipa: '', pos: 'noun', meaningVi: 'a', exampleEn: '', exampleVi: '' })
    const b = await createCustomWord({ word: 'beta', ipa: '', pos: 'noun', meaningVi: 'b', exampleEn: '', exampleVi: '' })
    await createCustomWord({ word: 'gamma', ipa: '', pos: 'noun', meaningVi: 'c', exampleEn: '', exampleVi: '' })
    await db.progress.bulkPut([
      card(a.id, 1, { dueDate: TODAY }),
      card(b.id, 2, { dueDate: '2026-10-30' }),
      card('hello', 1, { dueDate: TODAY }), // built-in: not counted
    ])
    expect(await loadSelfStudyData(TODAY)).toEqual({ totalCount: 3, unlearnedCount: 1, dueCount: 1 })
  })
})
```

`card()` in `stats.test.ts` already takes `over: Partial<CardProgress>`. If the card for `custom:x` has no matching custom word, `loadReviewData` drops it. That is why `newToday` must be computed from the raw progress rows, not from `review.learned` (see Step 3).

- [ ] **Step 2: Run and check they fail**

Run: `npx vitest run src/db/lesson.test.ts src/db/stats.test.ts`
Expected: FAIL. `loadSelfStudyData` is not exported, `newToday` is undefined, and the mine lesson is empty.

- [ ] **Step 3: Implement**

In `src/db/lesson.ts`, change `loadLessonWords`:

```ts
/**
 * Words of the next new-word lesson of a source (`decks`: the daily lesson, `mine`: Tự học) for
 * the current settings and progress. Reads several tables, so it works as a `useLiveQuery` source.
 */
export async function loadLessonWords(source: 'decks' | 'mine' = 'decks'): Promise<Word[]> {
  const [settings, customWords, progressRows] = await Promise.all([
    getSettings(),
    db.customWords.toArray(),
    db.progress.toArray(),
  ])
  return selectLessonWords({
    count: settings.dailyGoal,
    customWords,
    activeDeckIds: settings.activeDeckIds,
    progress: new Map(progressRows.map((p: CardProgress) => [p.wordId, p])),
    source,
  })
}
```

In `src/db/stats.ts`:
- Add `newToday: number` to `HomeData`, with the doc comment `/** Deck words first learned today (Tự học words are not part of the daily goal). */`.
- In `loadHomeData`, add `db.progress.toArray()` to the `Promise.all` as `progressRows`, and return `newToday: countNewToday(progressRows, today, 'decks')`.
- Then add:

```ts
export interface SelfStudyData {
  /** All of the user's own words. */
  totalCount: number
  /** Own words not learned yet (no progress, or level 0). */
  unlearnedCount: number
  /** Own words due for review today (ignored cards excluded, like the shared review). */
  dueCount: number
}

/** Numbers of the Tự học tab. Live-query friendly (reads progress and customWords). */
export async function loadSelfStudyData(today: string = localToday()): Promise<SelfStudyData> {
  const [review, customWords] = await Promise.all([loadReviewData(today), db.customWords.toArray()])
  const mine = filterCardsBySource(review.learned, 'mine')
  const learnedIds = new Set(mine.map((card) => card.wordId))
  return {
    totalCount: customWords.length,
    unlearnedCount: customWords.filter((w) => !learnedIds.has(w.id)).length,
    dueCount: getReviewOverview(mine, today).dueCount,
  }
}
```

Import `countNewToday` and `filterCardsBySource` from `../lib/studySource.ts`. `review.learned` only holds level ≥1 cards, so a level-0 (favorite-only) own word counts as unlearned, which is correct.

- [ ] **Step 4: Run and check they pass**

Run: `npx vitest run src/db src/lib`
Expected: PASS. Fix any other `loadHomeData` test that does `toEqual` on the whole object by adding `newToday`.

- [ ] **Step 5: Type-check and run the suite**

Run: `npx tsc -b; npm test`
Expected: both succeed.

---

### Task 3: Navigation (3 tabs, routes, transitions, Exercises page)

**Files:**
- Modify: `src/app/paths.ts` (add `selfStudy`, `exercises`, `learnMine`, `reviewMine`)
- Create: `src/app/tabs.ts`
- Create: `src/app/tabs.test.ts`
- Modify: `src/app/TabBar.tsx`
- Modify: `src/app/pageTransition.ts` (`TAB_ROOTS`)
- Modify: `src/app/pageTransition.test.ts`
- Modify: `src/app/paths.test.ts` (if it checks the set of keys)
- Create: `src/pages/Exercises.tsx`
- Modify: `src/app/App.tsx` (routes, `/my-words` redirect)

**Interfaces:**
- Consumes: `isSelfStudySearch` (Task 1).
- Produces:
  - `paths.selfStudy = '/tu-hoc'`
  - `paths.exercises = '/bai-tap'`
  - `paths.learnMine = '/learn?nguon=tu-hoc'`
  - `paths.reviewMine = '/review?nguon=tu-hoc'`
  - `type TabId = 'study' | 'self' | 'exercises'`
  - `activeTab(pathname: string, search: string): TabId`

- [ ] **Step 1: Write the failing tests** in `src/app/tabs.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { activeTab } from './tabs.ts'

describe('activeTab', () => {
  it('Học owns home and everything reached from it', () => {
    for (const p of ['/', '/learn', '/review', '/notebook', '/stats', '/decks', '/decks/x', '/search', '/settings', '/install', '/words/hello']) {
      expect(activeTab(p, '')).toBe('study')
    }
  })
  it('Tự học owns its tab, own-word pages and the self-study sessions', () => {
    expect(activeTab('/tu-hoc', '')).toBe('self')
    expect(activeTab('/my-words/new', '')).toBe('self')
    expect(activeTab('/my-words/custom%3Aabc/edit', '')).toBe('self')
    expect(activeTab('/words/custom%3Aabc', '')).toBe('self')
    expect(activeTab('/learn', '?nguon=tu-hoc')).toBe('self')
    expect(activeTab('/review', '?nguon=tu-hoc')).toBe('self')
  })
  it('Bài tập owns its tab', () => {
    expect(activeTab('/bai-tap', '')).toBe('exercises')
  })
  it('ignores a trailing slash', () => {
    expect(activeTab('/tu-hoc/', '')).toBe('self')
  })
})
```

In `src/app/pageTransition.test.ts`, change the tab-root expectations:
- `isTabRoot('/tu-hoc')`, `isTabRoot('/bai-tap/')` and `isTabRoot('/')` are true.
- `isTabRoot('/notebook')`, `isTabRoot('/learn')` and `isTabRoot('/settings')` are false.
- Update the `classifyNavigation` cases that used `/learn` or `/notebook` as tab roots to use `/tu-hoc` and `/bai-tap`. Add:

```ts
  it('home -> settings is a push and back is a pop', () => {
    expect(classifyNavigation('/', '/settings', 'PUSH')).toBe('push')
    expect(classifyNavigation('/settings', '/', 'POP')).toBe('pop')
  })
```

- [ ] **Step 2: Run and check they fail**

Run: `npx vitest run src/app`
Expected: FAIL, because `./tabs.ts` is missing and the tab roots are still the old ones.

- [ ] **Step 3: Implement**

In `src/app/paths.ts`, add these to `paths`:

```ts
  /** Tự học tab: the user's own words, learned and reviewed on their own. */
  selfStudy: '/tu-hoc',
  /** Bài tập tab (coming soon). */
  exercises: '/bai-tap',
  /** Learn / review only the user's own words. */
  learnMine: '/learn?nguon=tu-hoc',
  reviewMine: '/review?nguon=tu-hoc',
```

Create `src/app/tabs.ts`:

```ts
import { isSelfStudySearch } from '../lib/studySource.ts'
import { paths } from './paths.ts'

/** The three tabs of the tab bar. */
export type TabId = 'study' | 'self' | 'exercises'

function normalize(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
}

const under = (pathname: string, root: string) => pathname === root || pathname.startsWith(`${root}/`)

/**
 * Which tab a location belongs to. Tự học owns its tab, the own-word form, own-word details and the
 * `?nguon=tu-hoc` sessions; Bài tập owns its tab; everything else is reached from Học (home).
 */
export function activeTab(pathname: string, search: string): TabId {
  const path = normalize(pathname)
  if (under(path, paths.exercises)) return 'exercises'
  if (under(path, paths.selfStudy) || under(path, '/my-words')) return 'self'
  if (path.startsWith('/words/custom%3A') || path.startsWith('/words/custom:')) return 'self'
  if ((path === '/learn' || path === '/review') && isSelfStudySearch(search)) return 'self'
  return 'study'
}
```

Replace the `Tab` / `TABS` / `isActive` part of `src/app/TabBar.tsx`. Keep the `m.span` tile, `TILE_SPRING` and the markup:

```tsx
import { ClipboardList, GraduationCap, PencilLine, type LucideIcon } from 'lucide-react'
import { m } from 'motion/react'
import { Link, useLocation } from 'react-router'
import { paths } from './paths.ts'
import { activeTab, type TabId } from './tabs.ts'

interface Tab {
  id: TabId
  to: string
  label: string
  icon: LucideIcon
}

const TABS: readonly Tab[] = [
  { id: 'study', to: paths.home, label: 'Học', icon: GraduationCap },
  { id: 'self', to: paths.selfStudy, label: 'Tự học', icon: PencilLine },
  { id: 'exercises', to: paths.exercises, label: 'Bài tập', icon: ClipboardList },
]
```

Inside the component, compute `const current = activeTab(pathname, search)` with `const { pathname, search } = useLocation()`, and set `const active = tab.id === current`.

In `src/app/pageTransition.ts`, set `const TAB_ROOTS: readonly string[] = [paths.home, paths.selfStudy, paths.exercises]`.

Create `src/pages/Exercises.tsx`:

```tsx
import { FileText } from 'lucide-react'
import IconBadge from '../components/IconBadge.tsx'
import PageHeader from '../components/PageHeader.tsx'

/** Bài tập: exercises built from documents the user imports. Not built yet. */
export default function Exercises() {
  return (
    <>
      <PageHeader title="Bài tập" />
      <div className="page">
        <section className="soon glass">
          <IconBadge icon={FileText} hue="violet" size="lg" />
          <h2 className="soon__title">Sắp ra mắt</h2>
          <p className="soon__text muted">
            Bạn sẽ nhập tài liệu của mình (bài đọc, đề, ghi chú) và làm bài tập từ đó.
          </p>
        </section>
      </div>
    </>
  )
}
```

Add to `src/pages/pages.css`:

```css
/* Bài tập: "Sắp ra mắt" card */
.soon {
  display: grid;
  justify-items: center;
  gap: 12px;
  margin-top: 24px;
  padding: 32px 24px;
  text-align: center;
}

.soon__title {
  font-size: 1.375rem;
  font-weight: 700;
}

.soon__text {
  max-width: 32ch;
}
```

In `src/app/App.tsx`:
- Import `Navigate` from `react-router`, plus `Exercises` and `SelfStudy`. `SelfStudy` is created in Task 4; until then, point the route at a temporary `MyWords` and replace it in Task 4.
- Add these routes inside the layout route:

```tsx
                <Route path="tu-hoc" element={<SelfStudy />} />
                <Route path="bai-tap" element={<Exercises />} />
                <Route path="my-words" element={<Navigate to="/tu-hoc" replace />} />
```

- Remove the old `my-words` route that rendered `MyWords`.

- [ ] **Step 4: Run and check they pass**

Run: `npx vitest run src/app`
Expected: PASS.

- [ ] **Step 5: Type-check**

Run: `npx tsc -b; npm test`
Expected: both succeed.

---

### Task 4: Tự học tab (`/tu-hoc`)

**Files:**
- Create: `src/pages/SelfStudy.tsx`
- Create: `src/pages/self-study/self-study.css` (import it in `src/app/App.tsx` next to the other page CSS)
- Create: `src/pages/my-words/MyWordList.tsx`, the list part extracted from `src/pages/MyWords.tsx`
- Delete: `src/pages/MyWords.tsx` once its parts have moved
- Modify: `src/pages/my-words/MyWordForm.tsx` (back and redirect targets → `paths.selfStudy`)
- Modify: `src/pages/WordDetail.tsx` (`backTo` and the post-delete redirect for own words → `paths.selfStudy`)
- Modify: `src/pages/Decks.tsx` (its "Từ của tôi" row links to `paths.selfStudy`)
- Modify: `src/app/paths.ts` (`myWords` now equals `'/tu-hoc'`, so the existing links keep working)

**Interfaces:**
- Consumes: `loadSelfStudyData`, `SelfStudyData` (Task 2); `paths.learnMine`, `paths.reviewMine`, `paths.selfStudy` (Task 3).
- Produces: `MyWordList` component, `{ words: CustomWord[]; progress: ReadonlyMap<string, CardProgress> }`, which renders the search box and the list.

- [ ] **Step 1: Move the list**

Move the search box plus the result list from `MyWords.tsx` (the `searchbox`, the "Không tìm thấy từ nào" empty result, the `{shown.length} từ` hint and the `<ul className="sheet ruled">` of `WordRow`s) into `src/pages/my-words/MyWordList.tsx`. Keep it unchanged: it keeps the `?q=` search param, `searchWords` and the "Chưa học" label. Props are `words` and `progress`.

- [ ] **Step 2: Write `src/pages/SelfStudy.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpenCheck, PenLine, Play, Plus, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { useCustomWords, useProgressMap } from '../app/hooks.ts'
import { paths } from '../app/paths.ts'
import IconBadge from '../components/IconBadge.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { loadSelfStudyData } from '../db/stats.ts'
import MyWordList from './my-words/MyWordList.tsx'

/** Tự học: the user's own words, learned and reviewed separately from the daily lesson. */
export default function SelfStudy() {
  const data = useLiveQuery(() => loadSelfStudyData())
  const words = useCustomWords()
  const progress = useProgressMap()

  const add = (
    <Link to={paths.myWordNew()} className="btn btn--ghost self-study__add">
      <Plus size={20} aria-hidden="true" />
      Thêm từ
    </Link>
  )

  return (
    <>
      <PageHeader title="Tự học" />
      <div className="page">
        {data === undefined ? null : data.totalCount === 0 ? (
          <div className="empty">
            <IconBadge icon={PenLine} hue="orange" size="lg" />
            <p className="empty__title">Chưa có từ nào để tự học</p>
            <p className="muted empty__text">
              Thêm những từ bạn muốn học: gõ từ tiếng Anh, app gợi ý phiên âm và ví dụ, bạn nhập
              nghĩa tiếng Việt. Từ của bạn được học riêng ở đây và ôn lại theo 5 cấp độ nhớ.
            </p>
            <Link to={paths.myWordNew()} className="btn btn--primary">
              <Plus size={20} aria-hidden="true" />
              Thêm từ
            </Link>
          </div>
        ) : (
          <>
            <section className="self-study__hero glass">
              <div className="self-study__stats">
                <p className="self-study__stat">
                  <IconBadge icon={Sparkles} hue="violet" size="sm" />
                  <span>
                    <strong>{data.unlearnedCount}</strong> từ chưa học
                  </span>
                </p>
                <p className="self-study__stat">
                  <IconBadge icon={BookOpenCheck} hue="green" size="sm" />
                  <span>
                    <strong>{data.dueCount}</strong> từ tới hạn ôn
                  </span>
                </p>
              </div>
              {data.unlearnedCount > 0 ? (
                <Link to={paths.learnMine} className="btn btn--primary">
                  <Play size={20} aria-hidden="true" />
                  Học ngay
                </Link>
              ) : (
                <p className="muted self-study__note">Bạn đã học hết từ của mình. Thêm từ mới nhé.</p>
              )}
              {data.dueCount > 0 && (
                <Link to={paths.reviewMine} className="btn btn--ghost">
                  Ôn từ của tôi
                </Link>
              )}
            </section>
            {add}
            <h2 className="label self-study__label">Từ của tôi · {data.totalCount}</h2>
            <MyWordList words={words} progress={progress} />
          </>
        )}
      </div>
    </>
  )
}
```

Use `<button disabled>` instead of hiding "Học ngay" only if the design review asks for it. The design says it is disabled with a short note, and the note above covers that.

- [ ] **Step 3: Styles** in `src/pages/self-study/self-study.css`

```css
/* Tự học: glass action card, then "Thêm từ" and the user's word list. */

.self-study__hero {
  display: grid;
  gap: 14px;
  margin-top: 16px;
  padding: 20px;
}

.self-study__stats {
  display: grid;
  gap: 10px;
}

.self-study__stat {
  display: flex;
  align-items: center;
  gap: 12px;
}

.self-study__stat strong {
  color: var(--accent);
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
}

.self-study__add {
  width: 100%;
  margin-top: 16px;
}

.self-study__label {
  margin: 24px 4px 8px;
}
```

- [ ] **Step 4: Point the routes and links at the new tab**

- In `App.tsx`, the `tu-hoc` route renders `SelfStudy`.
- Set `paths.myWords` to `'/tu-hoc'`, and update its doc comment to "Tự học tab (formerly Từ của tôi)". Update the expectation in `src/app/paths.test.ts` (`paths.myWords` → `'/tu-hoc'`). `myWordNew` and `myWordEdit` keep their `/my-words/...` URLs.
- `MyWordForm`: `backTo` for a new word, and the post-save redirect, go to `paths.selfStudy`.
- `WordDetail`: for a custom id (`isCustomWordId`), use `backTo={paths.selfStudy}` and redirect after delete to `paths.selfStudy`. Built-in words keep `paths.home`.
- `Home.tsx` loses its "Từ của tôi" link in Task 6.

- [ ] **Step 5: Verify**

Run: `npx tsc -b; npm test; npm run lint`
Expected: all pass. `grep -rn "MyWords" src` returns nothing except `MyWordList`, `MyWordForm` and CSS class names.

---

### Task 5: Learn and Review in self-study mode

**Files:**
- Modify: `src/pages/Learn.tsx`, `src/pages/learn/LessonStart.tsx`, `src/pages/learn/LessonSummary.tsx`
- Modify: `src/pages/Review.tsx`, `src/pages/review/ReviewStart.tsx`, `src/pages/review/ReviewSummary.tsx`
- Modify: `src/components/quiz/SessionShell.tsx` only if its exit target is hard-coded. `onExit` is passed in, so this is probably not needed.

**Interfaces:**
- Consumes: `isSelfStudySearch`, `filterCardsBySource` (Task 1); `loadLessonWords(source)` (Task 2); `paths.selfStudy`, `paths.learnMine` (Task 3).
- Produces: a `mine: boolean` prop on `LessonStart`, `LessonSummary`, `ReviewStart` and `ReviewSummary`.

- [ ] **Step 1: Learn**

In `Learn.tsx`:

```tsx
  const { search } = useLocation()
  const mine = isSelfStudySearch(search)
  const upcoming = useLiveQuery(() => loadLessonWords(mine ? 'mine' : 'decks'), [mine])
  ...
  const leave = () => void navigate(mine ? paths.selfStudy : paths.home)
```

Pass `mine` to `LessonStart` and `LessonSummary`.

In `LessonStart`:
- When `mine`: the title is "Học từ của bạn".
- When `mine`, drop `describeSources` and use the sub line `Từ bạn tự nhập, cũ trước mới sau.`
- The "fewer than goal" line reads `Chỉ còn {n} từ của bạn chưa học.`
- The empty state renders a new `NothingLeftMine`:

```tsx
export function NothingLeftMine() {
  return (
    <div className="empty">
      <IconBadge icon={CheckCheck} hue="green" size="lg" />
      <p className="empty__title">Bạn đã học hết từ của mình</p>
      <Link to={paths.myWordNew()} className="btn btn--primary">
        <Plus size={20} aria-hidden="true" />
        Thêm từ mới
      </Link>
    </div>
  )
}
```

- When not `mine`, keep `describeSources` (it now always reports deck words only).

In `LessonSummary` when `mine`:
- The "Học thêm" button reads `Học tiếp {n} từ`. Pass `nextCount = upcoming?.length ?? 0` as a new prop; it is shown when `hasMore`.
- The home link becomes `<Link to={paths.selfStudy}>Về Tự học</Link>`.
- The `!hasMore` hint reads `Bạn đã học hết từ của mình.` with a link "Thêm từ mới" to `paths.myWordNew()`.

When not `mine`, everything stays as it is.

- [ ] **Step 2: Review**

In `Review.tsx`:

```tsx
  const { search } = useLocation()
  const mine = isSelfStudySearch(search)
  const source = mine ? 'mine' : 'all'
  const data = useLiveQuery(() => loadReviewData(), [])
  // Self-study reviews only the user's own words; the shared review keeps everything
  const learned = useMemo(() => (data ? filterCardsBySource(data.learned, source) : undefined), [data, source])
```

Replace every `data.learned` use (overview, nextReview, startNextRound) with `learned`. `data.words` and `data.pool` stay as they are, so distractors can still come from every word. `leave` goes to `paths.selfStudy` when `mine`.

In `ReviewStart` when `mine`:
- The title is "Ôn từ của tôi".
- The empty state's "Học từ mới" link goes to `paths.learnMine`.
- The empty text when nothing is learned reads `Bạn chưa học từ nào của mình. Học trước rồi quay lại ôn nhé.`

In `ReviewSummary` when `mine`: the home link becomes "Về Tự học" (`paths.selfStudy`).

- [ ] **Step 3: Verify**

Run: `npx tsc -b; npm test; npm run lint`
Expected: all pass.

---

### Task 6: Home (tab Học)

**Files:**
- Modify: `src/pages/Home.tsx`, `src/pages/home/home.css`
- Modify: `docs/mockups/glass/mockup.html` only if you want; it is not required.

**Interfaces:**
- Consumes: `HomeData.newToday` (Task 2); `paths.search`, `paths.settings`, `paths.notebook`, `paths.stats`, `paths.decks`.

- [ ] **Step 1: Header actions**

In `Home`, render a right-hand group in `home-head`:

```tsx
      <header className="home-head">
        <h1 className="home-head__date">{formatWeekdayDateVi(today)}</h1>
        <div className="home-head__actions">
          {data && <Streak streak={data.stats.streak} />}
          <Link to={paths.search} className="icon-btn icon-btn--soft" aria-label="Tìm kiếm">
            <Search size={20} aria-hidden="true" />
          </Link>
          <Link to={paths.settings} className="icon-btn icon-btn--soft" aria-label="Cài đặt">
            <Settings size={20} aria-hidden="true" />
          </Link>
        </div>
      </header>
```

CSS: `.home-head__actions { display: flex; align-items: center; gap: 8px; }`.

At 390px wide the date must not wrap awkwardly. If it does, let `.home-head` wrap so the actions go under the date, aligned to the start (`flex-wrap: wrap; row-gap: 8px`). Check this in the browser walk.

- [ ] **Step 2: Lesson line uses deck-only progress**

In `LessonLine`, replace `const { newLearned, goal } = stats.today` with:

```tsx
  const newLearned = data.newToday
  const { goal } = stats.today
```

- [ ] **Step 3: Scores and quick links**

In `Scores`:
- Remove the `<span className="home-scores__more">Xem thống kê …</span>`. The level list stays a link to `paths.stats`.
- Replace the `home-links` nav with:

```tsx
        <nav className="home-links" aria-label="Lối tắt">
          <Link to={paths.notebook}>
            <IconBadge icon={NotebookPen} hue="blue" />
            Sổ tay
          </Link>
          <Link to={paths.stats}>
            <IconBadge icon={ChartColumn} hue="pink" />
            Thống kê
          </Link>
          <Link to={paths.decks}>
            <IconBadge icon={Library} hue="orange" />
            Bộ từ vựng
          </Link>
        </nav>
```

- Fix the imports: add `NotebookPen`, `ChartColumn` and `Settings`; drop `PenLine` and `ChevronRight` if they are now unused. Remove the `.home-scores__more` rules from `home.css` if nothing uses them.

- [ ] **Step 4: Verify**

Run: `npx tsc -b; npm test; npm run lint`
Expected: all pass.

---

### Task 7: Spec, browser walk, final checks

**Files:**
- Modify: `vocab-app-spec.md`. In section 3 (Chức năng), turn "Từ của tôi" into **Tự học**: own words are learned in their own sessions of up to N words with no daily cap; they are no longer mixed into the daily lesson; due own words appear in both the shared review and "Ôn từ của tôi". Add **Bài tập (chưa triển khai)**. In section 8, the tab bar is Học / Tự học / Bài tập, and Cài đặt + Tìm kiếm are icon buttons on the Trang chủ header. In section 8.1, update the Home description (quick links Sổ tay / Thống kê / Bộ từ vựng). In section 10/11, reword the "Từ của tôi" lines accordingly.
- Modify: `README.md` only if it describes the tab bar.

- [ ] **Step 1: Update the spec text.** Keep the Vietnamese style and format, and keep every other section as it is.

- [ ] **Step 2: Browser walk.** Use headless Edge as in Global Constraints. Run `npm run build` first, then serve with `npx vite preview --port 5201 --strictPort` in the background and note its PID. Seed IndexedDB with: 2 decks active, 3 own words (one learned and due today), and a few learned deck words due today. Then:
  1. Học tab: the header has the streak, search and settings icons; the quick links are Sổ tay / Thống kê / Bộ từ vựng; "Hôm nay: x/N" ignores own words. Screenshot `docs/mockups/glass/actual/nav-01-hoc.png`.
  2. Tap Tự học: the tile glides; the hero shows 2 unlearned and 1 due; the list shows 3 words. Screenshot `nav-02-tu-hoc.png`.
  3. Tap Học ngay: the lesson has only own words; finish it; the summary shows "Về Tự học" (and "Học tiếp" if more remain). Screenshot `nav-03-learn-mine-summary.png`. The Tự học tab stays active the whole time.
  4. Ôn từ của tôi: the round asks only own words. Exiting returns to `/tu-hoc`.
  5. Tap Bài tập: the "Sắp ra mắt" card. Screenshot `nav-04-bai-tap.png`.
  6. From Học, open Cài đặt and go back, then open Tìm kiếm and go back: push and pop transitions, and the Học tab stays active.
  7. `/?tu=on` opens the shared review. `/my-words` lands on `/tu-hoc`.
  8. Dark mode screenshots: `nav-01-hoc-dark.png`, `nav-02-tu-hoc-dark.png`, `nav-04-bai-tap-dark.png`.

  Check the console for errors. Stop the preview by its PID.

- [ ] **Step 3: Final checks**

Run: `npm run build; npm test; npm run lint`
Expected: all three succeed. Report the test count.

---

## Self-review notes

- **Spec coverage:**

  | Spec section | Task |
  |---|---|
  | §1 navigation | Tasks 3 and 6 |
  | §2 Tự học | Tasks 4 and 5 |
  | §3 Bài tập | Task 3 |
  | §4 logic | Tasks 1 and 2 (daily lesson decks-only, `newToday`, shared review keeps `all`, tags unchanged) |
  | §5 docs | Task 7 |
  | §6 tests | Tasks 1–3 and 7 |

- **OneSignal tags:** `src/db/reminderTags.ts` is untouched on purpose. The shared review count still includes own words.
- **Stats and streak:** the Stats page and the streak still use `StudyLog`, which counts every new word, so they cover all words as the spec says.
