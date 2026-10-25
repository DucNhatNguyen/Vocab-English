# Bỏ màn hình học từ có sẵn — design

Date: 2026-10-25. Status: approved by the user.

## Goal

The app keeps only two jobs: learning the user's own words (Tự học) and doing exercises
(Bài tập). Everything that exposes the built-in decks goes away.

## Decisions

- Navigation: 2 tabs, **Từ của tôi** (`/`) · **Bài tập** (`/bai-tap`). The own-words page is the home page.
- Kept (scoped to own words): streak + Thống kê, Sổ tay, Tìm kiếm, push review reminders.
- Old progress on built-in words stays in IndexedDB and in backups, untouched, but is never shown or counted.
- Answering an exercise question counts the day for the streak.
- `src/data/words.json` / `decks.json` stay as hidden data: Vietnamese meaning prefill in the own-word
  form (`lib/dictionary.ts`) and the distractor pool for choice questions (`lib/quiz.ts`,
  `db/review.ts` `pool`). They are no longer studied, listed, searched or reviewed.

## 1. Navigation and pages

- `TabBar`: two tabs. `study` and `self` merge into one tab id (e.g. `words`) pointing at `/`;
  `exercises` stays. `activeTab`: `/bai-tap…` → exercises, everything else → words.
- `/` renders the merged page (rework `SelfStudy.tsx`; delete `Home.tsx` and its Home-only parts):
  - Header from old Home: weekday date, streak flame, Search and Settings icon buttons, streak note
    ("Học hôm nay để giữ chuỗi"), `InstallBanner`.
  - Hero (glass): "N từ chưa học", "N từ tới hạn ôn", "Hôm nay: x/N từ mới" with the meter;
    primary button Học ngay (when unlearned > 0) / Ôn tập ngay (when due > 0; primary if nothing to learn).
  - "Thêm từ" button, shortcut links Sổ tay · Thống kê, then "Từ của tôi · N" and the word list.
  - Empty state (no own words): keep the current Tự học empty state, header still shown.
- Removed routes/pages: `Decks.tsx`, `DeckDetail.tsx`, Home. Redirects (`<Navigate replace>`):
  `/tu-hoc`, `/decks`, `/decks/*`, `/my-words` → `/`.
- `paths`: drop `decks`, `deck`, `selfStudy`/`myWords` point to `/` (or are removed; callers updated),
  `learnMine`/`reviewMine` become plain `/learn` and `/review`.
- `?nguon=tu-hoc` on old links / push deep links is accepted and ignored.
- Settings: remove "Chọn bộ từ đang học"; rename daily-goal row to "Số từ mỗi bài học".
  `activeDeckIds` stays in the stored record (harmless) but nothing reads it.
- Learn/Review pages: no source switching; titles/empty states talk about "từ của bạn". Empty states
  that pointed to the decks point to "Thêm từ" instead.

## 2. Data scope: own words only

- Single choke point: `loadReviewData` (`db/review.ts`) returns only cards of custom words
  (`isCustomWordId`). `pool` keeps built-in + custom words for distractors.
- Notebook (`db/notebook.ts`): list only custom-word cards.
- Stats, Home data, reminder tags all flow from `loadReviewData` / `loadLessonWords`, so they follow.
- `loadLessonWords` / `selectLessonWords`: own words only; remove the `decks` path and `activeDeckIds`
  input. `StudySource` and `lib/studySource.ts` go away (or shrink to `isSelfStudySearch` if still needed for
  ignoring the old param — prefer deleting).
- `countNewToday`: counts own words learned today (feeds "Hôm nay: x/N").
- Search: `searchWords(query, customWords)` only.
- `useWord` (`app/hooks.ts`) / `WordDetail`: built-in ids resolve to null → NotFound.
- Backup: unchanged (exports everything, including hidden built-in progress).

## 3. Exercises count for the streak

- `StudyLog.exercises?: number` (optional, not indexed → no Dexie version bump).
- Every recorded exercise answer (normal runs and "Làm lại câu sai") increments today's
  `exercises`, creating the day's log if needed, in the same transaction as the answer write.
- `isStudyDay`: `newLearned > 0 || reviewed > 0 || (exercises ?? 0) > 0`.
- Backup import/validation accepts logs with or without `exercises`.
- Past exercise days are not back-filled.

## 4. Testing

- Update/remove tests tied to decks: `tabs`, `paths`, `lesson`, `stats`, `studySource`, `streak`,
  `data.test.ts` stays (data still shipped).
- New tests: `loadReviewData` / notebook ignore built-in cards; exercise answer bumps
  `StudyLog.exercises` and the day counts in `computeStreak`; redirects of old routes.
- `npm test`, `npm run build`, lint; one silent light-mode browser walk plus dark screenshots.
