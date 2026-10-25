# Bỏ màn hình học từ có sẵn — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The app only teaches the user's own words and runs exercises; the built-in decks disappear from every screen.

**Architecture:** One data choke point (`loadReviewData`, `loadNotebookEntries`, `selectLessonWords`) filters to custom words, so review, notebook, stats and push tags follow automatically. Exercise answers bump a new optional `StudyLog.exercises` counter that the streak reads. Navigation shrinks to 2 tabs with the own-words page at `/`.

**Tech Stack:** React 19 + react-router 7, Dexie (IndexedDB), Vitest, motion, lucide-react.

Spec: `docs/superpowers/specs/2026-10-25-bo-tu-co-san-design.md`.

## Global Constraints

- Keep `src/data/words.json` and `src/data/decks.json` and `src/data/index.ts`: still used by `lib/dictionary.ts` (meaning prefill) and as the distractor `pool` (`lib/quiz.ts`, `db/review.ts`).
- Never delete or rewrite stored progress of built-in words; backups keep exporting everything.
- No Dexie version bump (`StudyLog.exercises` is not indexed).
- `?nguon=tu-hoc` on incoming URLs must still open the page (ignored, no error).
- UI copy in Vietnamese, matching the existing tone. Follow the existing glass components/classes.
- Work on branch `feature/bai-tap`. Run `npm test`, `npm run build`, `npm run lint` before each commit.

---

### Task 1: Data layer — own words only

**Files:**
- Modify: `src/db/review.ts` (`loadReviewData`)
- Modify: `src/db/notebook.ts` (`loadNotebookEntries`)
- Modify: `src/lib/lesson.ts` (`selectLessonWords`, `LessonSelectionInput`)
- Modify: `src/db/lesson.ts` (`loadLessonWords`)
- Modify: `src/db/stats.ts` (`loadHomeData`, `loadSelfStudyData`, `HomeData`, `SelfStudyData`)
- Delete: `src/lib/studySource.ts`, `src/lib/studySource.test.ts` (move `countNewToday` into `src/lib/stats.ts`)
- Modify: `src/pages/Search.tsx` (own words only)
- Modify: `src/app/hooks.ts` (`useWord`: built-in id → null)
- Tests: `src/db/review.test.ts`, `src/db/notebook.test.ts`, `src/lib/lesson.test.ts`, `src/db/stats.test.ts`, `src/lib/stats.test.ts`, `src/db/reminderTags.test.ts`

**Interfaces:**
- Produces:
  - `loadReviewData(today?): Promise<ReviewData>` — `learned` / `words` contain custom-word cards only; `pool` unchanged (built-in + custom).
  - `loadNotebookEntries(): Promise<NotebookEntry[]>` — custom words only.
  - `selectLessonWords({ count, customWords, progress }): Word[]` — unlearned custom words, oldest first. `activeDeckIds`, `source`, `getDeckWords` removed.
  - `loadLessonWords(): Promise<Word[]>` — no parameter.
  - `countNewToday(cards: Iterable<CardProgress>, today: string): number` in `src/lib/stats.ts` — learned custom-word cards with `learnedAt === today`.
  - `loadSelfStudyData(today?): Promise<SelfStudyData>` where
    ```ts
    export interface SelfStudyData extends StatsData {
      totalCount: number      // all own words
      unlearnedCount: number  // own words not learned yet
      dueCount: number        // due today, ignored cards excluded
      lessonCount: number     // words in the next lesson (<= dailyGoal)
      newToday: number        // own words first learned today
      overview: ReviewOverview
    }
    ```
    (`StatsData` = `{ today, stats }` as today.) `loadHomeData` / `HomeData` are deleted; Task 3 uses `loadSelfStudyData` for the merged page.

- [ ] **Step 1: Write failing tests**

`src/db/review.test.ts` — add:
```ts
it('ignores progress of built-in words', async () => {
  const builtIn = words[0] // from '../data/index.ts'
  await db.progress.put({ wordId: builtIn.id, level: 2, dueDate: '2026-10-20', correctCount: 0, wrongCount: 0, favorite: false, ignored: false })
  const mine = await addCustomWord(/* minimal custom word, use the helper already used in this file */)
  await db.progress.put({ wordId: mine.id, level: 1, dueDate: '2026-10-20', correctCount: 0, wrongCount: 0, favorite: false, ignored: false })
  const data = await loadReviewData('2026-10-25')
  expect(data.learned.map((c) => c.wordId)).toEqual([mine.id])
  expect(data.words.has(builtIn.id)).toBe(false)
  expect(data.pool.some((w) => w.id === builtIn.id)).toBe(true)
})
```
`src/db/notebook.test.ts` — same setup, assert `loadNotebookEntries()` returns only the custom word (also a built-in favorite at level 0 must be left out).
`src/lib/lesson.test.ts` — replace deck-source tests with: returns unlearned custom words oldest first, capped at `count`; level-0 favorite still counts as unlearned; `count <= 0` → `[]`.
`src/lib/stats.test.ts` — `countNewToday` counts only custom ids with `level >= 1 && learnedAt === today`.
`src/db/stats.test.ts` — `loadSelfStudyData` returns `lessonCount`, `newToday`, `overview`, `stats`; built-in progress does not change `stats.learned` or levels.

- [ ] **Step 2: Run tests, confirm they fail** — `npx vitest run src/db src/lib`

- [ ] **Step 3: Implement**

`src/db/review.ts` `loadReviewData` loop:
```ts
for (const row of rows) {
  // Only the user's own words are studied; built-in progress stays stored but hidden
  if (!row.wordId.startsWith(CUSTOM_WORD_ID_PREFIX)) continue
  const word = custom.get(row.wordId)
  if (!word) continue
  words.set(row.wordId, word)
  learned.push(row)
}
```
Drop the `getWord` import (keep `words as builtInWords` for `pool`). Update the `ReviewData.learned` doc comment.

`src/db/notebook.ts`: same filter; remove the `getWord` import; update the doc comment ("custom words only").

`src/lib/lesson.ts`:
```ts
export interface LessonSelectionInput {
  /** Words per lesson (Settings "Số từ mỗi bài học"). */
  count: number
  /** All of the user's own words, in any order. */
  customWords: readonly CustomWord[]
  progress: ReadonlyMap<string, CardProgress>
}

/** Unlearned own words for the next lesson, oldest first (`createdAt`, `createdAtMs`, id). May be fewer than `count`. */
export function selectLessonWords({ count, customWords, progress }: LessonSelectionInput): Word[] {
  const limit = Math.floor(count)
  if (!(limit > 0)) return []
  return [...customWords]
    .sort(compareCustomWordsOldestFirst)
    .filter((word) => isUnlearned(progress.get(word.id)))
    .slice(0, limit)
}
```
Remove the `data/index.ts` import.

`src/db/lesson.ts` `loadLessonWords()`: no parameter; call `selectLessonWords({ count: settings.dailyGoal, customWords, progress })`.

`src/lib/stats.ts`: add
```ts
/** Own words first learned today ("Hôm nay: x/N từ mới"). */
export function countNewToday(cards: Iterable<CardProgress>, today: string): number {
  let count = 0
  for (const card of cards) {
    if (card.level >= 1 && card.learnedAt === today && isCustomWordId(card.wordId)) count += 1
  }
  return count
}
```
`src/db/stats.ts`: delete `HomeData`/`loadHomeData`; rewrite `loadSelfStudyData` to read `loadReviewData`, `studyLogs`, `getSettings`, `loadLessonWords`, `customWords`, `progress` and fill the interface above (`dueCount = overview.dueCount`).

Delete `src/lib/studySource.ts` and its test. `src/pages/Learn.tsx` / `Review.tsx` will not compile until Task 3 — to keep this task green, make the minimal edits there now: `Learn` calls `loadLessonWords()` and keeps `mine = true` semantics; `Review` uses `data.learned` directly. Leave the UI copy for Task 3.

`src/pages/Search.tsx`: `searchWords(query, customWords)`; drop the `words` import and the "Own words first" comment.

`src/app/hooks.ts` `useWord`: return `null` for non-custom ids; remove the `getWord` import.

Fix every other compile error from removed exports (`npx tsc -b`). `src/db/reminderTags.ts` needs no change (it calls `loadLessonWords()` with no args) — confirm its tests still pass and add one asserting built-in due cards are not counted in `dueTomorrow`.

- [ ] **Step 4: Run** `npm test`, `npx tsc -b` — all pass.

- [ ] **Step 5: Commit** — `git commit -m "Study only the user's own words: filter review, notebook, lesson and stats data"`

---

### Task 2: Exercises count for the streak

**Files:**
- Modify: `src/db/types.ts` (`StudyLog`)
- Modify: `src/db/exercises.ts` (`recordAnswer`)
- Modify: `src/lib/streak.ts` (`isStudyDay`)
- Modify: `src/lib/backup.ts` (`parseStudyLogs`)
- Tests: `src/db/exercises.test.ts`, `src/lib/streak.test.ts`, `src/lib/backup.test.ts`

**Interfaces:**
- Produces: `StudyLog.exercises?: number` — exercise answers recorded that local day.

- [ ] **Step 1: Write failing tests**

`src/lib/streak.test.ts`:
```ts
it('counts a day with only exercise answers', () => {
  expect(isStudyDay({ newLearned: 0, reviewed: 0, exercises: 3 })).toBe(true)
  expect(isStudyDay({ newLearned: 0, reviewed: 0 })).toBe(false)
})
```
`src/db/exercises.test.ts`:
```ts
it('bumps today\'s StudyLog.exercises on every answer, retries included', async () => {
  const now = new Date(2026, 9, 25, 9, 0)
  await recordAnswer(null, 'practice-test-01', 'q1', { value: 0, correct: true }, now)
  await recordAnswer(null, 'practice-test-01', 'q1', { value: 1, correct: false }, now)
  const log = await db.studyLogs.where('date').equals('2026-10-25').first()
  expect(log).toMatchObject({ exercises: 2, newLearned: 0, reviewed: 0, correct: 0, wrong: 0 })
})
```
`src/lib/backup.test.ts`: a log with `exercises: 4` round-trips; a log without it still parses; `exercises: -1` is a problem.

- [ ] **Step 2: Run, confirm failures** — `npx vitest run src/lib/streak.test.ts src/db/exercises.test.ts src/lib/backup.test.ts`

- [ ] **Step 3: Implement**

`src/db/types.ts`:
```ts
export interface StudyLog {
  id?: number
  date: string // "2026-10-24"
  newLearned: number
  reviewed: number
  correct: number // review answers only
  wrong: number // review answers only
  exercises?: number // exercise answers that day; absent on older logs
}
```
`src/lib/streak.ts`:
```ts
/** A day counts for the streak when a lesson was finished, a review answered or an exercise answered. */
export function isStudyDay(log: Pick<StudyLog, 'newLearned' | 'reviewed' | 'exercises'>): boolean {
  return log.newLearned > 0 || log.reviewed > 0 || (log.exercises ?? 0) > 0
}
```
`src/db/exercises.ts` `recordAnswer`: add `db.studyLogs` to the transaction and, after the result write:
```ts
const date = toLocalDateString(now)
const log = await db.studyLogs.where('date').equals(date).first()
if (log) await db.studyLogs.update(log.id!, { exercises: (log.exercises ?? 0) + 1 })
else await db.studyLogs.add({ date, newLearned: 0, reviewed: 0, correct: 0, wrong: 0, exercises: 1 })
```
Update its doc comment ("…and today's StudyLog gets `exercises += 1`").

`src/lib/backup.ts` `parseStudyLogs`: read `exercises` as an optional non-negative integer (reuse the `count` helper only when the key is present); set `log.exercises` when present.

Check `src/lib/stats.ts` and `src/pages/Stats.tsx`: nothing that sums `correct`/`wrong` must change (exercises stay separate). If the stats history view lists study days, it already uses `isStudyDay`/`studyDays`.

- [ ] **Step 4: Run** `npm test` — pass.

- [ ] **Step 5: Commit** — `git commit -m "Count exercise answers toward the study streak"`

---

### Task 3: Navigation and pages

**Files:**
- Modify: `src/app/tabs.ts`, `src/app/TabBar.tsx`, `src/app/paths.ts`, `src/app/pageTransition.ts`, `src/app/App.tsx`
- Modify: `src/pages/SelfStudy.tsx` (becomes the home page) — move the header (date, `Streak`, `streakNote`, search/settings buttons, `InstallBanner`) from `Home.tsx`
- Delete: `src/pages/Home.tsx`, `src/pages/Decks.tsx`, `src/pages/DeckDetail.tsx`; drop now-unused CSS rules from `src/pages/home/home.css` (keep what the moved header and `InstallBanner` use) and deck CSS in `pages.css`
- Modify: `src/pages/Learn.tsx`, `src/pages/learn/LessonStart.tsx`, `src/pages/learn/LessonSummary.tsx`, `src/pages/Review.tsx`, `src/pages/review/ReviewStart.tsx`, `src/pages/review/ReviewSummary.tsx` (remove `mine` prop and deck branches)
- Modify: `src/pages/Settings.tsx` (remove "Chọn bộ từ đang học" row; daily-goal row label → "Số từ mỗi bài học")
- Modify: `src/pages/Notebook.tsx`, `src/pages/Stats.tsx`, `src/pages/WordDetail.tsx`, `src/pages/my-words/MyWordForm.tsx` (back links → `paths.home`)
- Delete if unused afterwards: `toggleActiveDeck` in `src/db/settings.ts` (keep `activeDeckIds` in the type/defaults so stored records and backups still validate)
- Tests: `src/app/tabs.test.ts`, `src/app/paths.test.ts`, `src/app/pageTransition.test.ts`, `src/app/deepLink.test.ts`

**Interfaces:**
- Consumes: `loadSelfStudyData()` / `SelfStudyData` (Task 1), `loadLessonWords()` (Task 1).
- Produces:
  - `type TabId = 'words' | 'exercises'`; `activeTab(pathname: string): TabId` — `/bai-tap` and below → `exercises`, everything else → `words`. (The `search` parameter is dropped.)
  - `paths`: remove `decks`, `deck`, `myWords`, `selfStudy`, `learnMine`, `reviewMine`. `home: '/'` is the own-words page. All callers use `paths.home`, `paths.learn`, `paths.review`.

- [ ] **Step 1: Update tests first**

`src/app/tabs.test.ts`:
```ts
it.each([
  ['/', 'words'], ['/learn', 'words'], ['/review', 'words'], ['/notebook', 'words'],
  ['/my-words/new', 'words'], ['/words/custom%3Aabc', 'words'], ['/settings', 'words'],
  ['/bai-tap', 'exercises'], ['/bai-tap/practice-test-01/lam', 'exercises'],
])('%s -> %s', (path, tab) => expect(activeTab(path)).toBe(tab))
```
`src/app/paths.test.ts`: drop deck/self-study cases. `src/app/pageTransition.test.ts`: tab roots are `/` and `/bai-tap`. `src/app/deepLink.test.ts`: unchanged targets (`moi` → `/learn`, `on` → `/review`) still pass.

- [ ] **Step 2: Run, confirm failures** — `npx vitest run src/app`

- [ ] **Step 3: Implement routing**

`src/app/TabBar.tsx`:
```ts
const TABS: readonly Tab[] = [
  { id: 'words', to: paths.home, label: 'Từ của tôi', icon: PencilLine },
  { id: 'exercises', to: paths.exercises, label: 'Bài tập', icon: ClipboardList },
]
```
and `activeTab(pathname)`. `src/app/pageTransition.ts`: `TAB_ROOTS = [paths.home, paths.exercises]`.

`src/app/App.tsx` routes:
```tsx
<Route index element={<SelfStudy />} />
<Route path="tu-hoc" element={<Navigate to="/" replace />} />
<Route path="decks/*" element={<Navigate to="/" replace />} />
<Route path="my-words" element={<Navigate to="/" replace />} />
```
(`decks/*` also matches `/decks`; verify.) Remove imports of `Home`, `Decks`, `DeckDetail`.

- [ ] **Step 4: Merged home page (`SelfStudy.tsx`)**

Layout, top to bottom (reuse the existing classes/components; move `Streak`, `streakNote` from `Home.tsx`):
1. `<header className="home-head">` — `formatWeekdayDateVi(today)`, `Streak`, Search and Settings `icon-btn`s (exactly as in old Home). Shown in both empty and filled states. No `PageHeader`.
2. `streakNote` line, `<InstallBanner />`.
3. Empty state (no own words): the current Tự học empty block, unchanged.
4. Otherwise the hero `self-study__hero glass`:
   - stats: "**{unlearnedCount}** từ chưa học", "**{dueCount}** từ tới hạn ôn";
   - "Hôm nay: {newToday}/{stats.today.goal} từ mới" + the `meter` progressbar from the old `LessonLine`;
   - buttons: when `dueCount > 0` → "Ôn tập ngay" (`paths.review`, primary) and, if `lessonCount > 0`, "Học ngay" ghost; when no reviews due → "Học ngay" primary if `lessonCount > 0`, else the existing note "Bạn đã học hết từ của mình. Thêm từ mới nhé." and, if `overview.next`, "Lượt ôn tiếp theo: {formatDateVi(...)}, {count} từ".
5. Row: "Thêm từ" ghost button, and links Sổ tay (`NotebookPen`, blue) · Thống kê (`ChartColumn`, pink) styled like the old `home-links`.
6. "Từ của tôi · {totalCount}" + `MyWordList`.

Use `useLiveQuery(() => loadSelfStudyData())`. Keep the Install-banner and streak CSS used by these pieces; delete unused `home-review`, `home-lesson`, `home-scores`, `scores` rules (grep first).

- [ ] **Step 5: Learn / Review / other pages**

- `Learn.tsx`: no `isSelfStudySearch`; `loadLessonWords()`; `leave` → `paths.home`.
- `LessonStart.tsx`: title "Học từ mới"; empty state = the current "mine" variant (link to `paths.myWordNew()`); description "Từ bạn tự nhập, cũ trước mới sau."; delete `describeSources` and the decks branch.
- `LessonSummary.tsx`: "Học tiếp {nextCount} từ", "Về trang chủ" → `paths.home`; end note "Bạn đã học hết từ của mình. Thêm từ mới".
- `Review.tsx`, `ReviewStart.tsx`, `ReviewSummary.tsx`: remove `mine`; title "Ôn tập"; learn link `paths.learn`; back `paths.home`, label "Về trang chủ". Empty-state copy that mentions decks → own words.
- `Settings.tsx`: remove the deck row (around line 200) and its link; rename the goal label "Số từ mỗi bài học". Check the help text near it for deck wording.
- `Stats.tsx`, `Notebook.tsx`, `WordDetail.tsx`, `MyWordForm.tsx`: `paths.selfStudy` → `paths.home`. In `WordDetail` the `backTo` is always `paths.home`.
- `grep -rn "bộ từ\|Bộ từ\|deck" src/pages src/components src/app` — remove remaining user-facing deck wording (data-layer `activeDeckIds` may stay).

- [ ] **Step 6: Verify**

`npm test`, `npm run build`, `npm run lint`. Then one browser walk (mute TTS/sfx, light mode) and dark screenshots of `/`, `/learn`, `/review`, `/bai-tap`, `/settings`; save under `docs/mockups/own-words-only/actual/` and commit them (like `docs/mockups/exercises/actual/`). The walk must be silent: launch headless Edge with `--mute-audio`, stub `speechSynthesis.speak`/`cancel` and `AudioContext` before page scripts. One light walk only; dark mode just for the screenshots. Walk: empty state → add a word → Học ngay → finish → streak shows done → `/decks` and `/tu-hoc?x` redirect to `/` → `/learn?nguon=tu-hoc` opens normally → answer one exercise on a fresh profile → streak counts the day.

- [ ] **Step 7: Commit** — `git commit -m "Drop the built-in deck screens: two tabs, own words on the home page"`
