import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { paths } from '../app/paths.ts'
import { useHideTabBar } from '../app/tabBarVisibility.ts'
import PageHeader from '../components/PageHeader.tsx'
import type { Word } from '../data/types.ts'
import { loadReviewData, recordReviewAnswer, type ReviewOutcome } from '../db/review.ts'
import { today as localToday } from '../lib/date.ts'
import { scheduleTagSync } from '../lib/notifications.ts'
import {
  REVIEW_ROUND_SIZE,
  getNextReview,
  getReviewOverview,
  isListeningType,
  selectReviewRound,
} from '../lib/review.ts'
import { isSpeechSupported, speak } from '../lib/speech.ts'
import ReviewRound from './review/ReviewRound.tsx'
import ReviewStart from './review/ReviewStart.tsx'
import ReviewSummary, { type SummaryItem } from './review/ReviewSummary.tsx'
import {
  startRound,
  type AnswerEntry,
  type RoundSetup,
  type RoundState,
} from './review/round.ts'

type Phase =
  | { name: 'start' }
  | { name: 'round'; setup: RoundSetup; initial: RoundState; remaining: number }
  | { name: 'saving'; entries: AnswerEntry[]; remaining: number; failed: boolean }
  | { name: 'summary'; items: SummaryItem[]; outcomes: ReviewOutcome[]; remaining: number }

/** "Ôn tập Thời điểm vàng": start screen -> rounds of up to 20 questions -> summary. */
export default function Review() {
  const navigate = useNavigate()
  // Live: answers move cards out of the due list, so this is also the data of the next round
  const data = useLiveQuery(() => loadReviewData())
  const [phase, setPhase] = useState<Phase>({ name: 'start' })
  // Words answered in this visit; a round never asks them again, even if the live data lags
  const reviewed = useRef(new Set<string>())

  const overview = useMemo(
    () => (data ? getReviewOverview(data.learned, data.today) : undefined),
    [data],
  )

  // Next review day shown on the summary: live data with this round's answers applied
  const nextReview = useMemo(() => {
    if (phase.name !== 'summary' || !data) return null
    const answered = new Map(phase.outcomes.map((o) => [o.after.wordId, o.after]))
    return getNextReview(
      data.learned.map((p) => answered.get(p.wordId) ?? p),
      data.today,
    )
  }, [phase, data])

  // A failed save shows the tab bar again, so the user is never trapped
  useHideTabBar(phase.name === 'round' || (phase.name === 'saving' && !phase.failed))

  function startNextRound() {
    if (!data) return
    const cards = data.learned.filter((p) => !reviewed.current.has(p.wordId))
    const { round, remaining } = selectReviewRound(cards, data.today)

    const words = new Map<string, Word>()
    for (const card of round) {
      const word = data.words.get(card.wordId)
      if (word) words.set(card.wordId, word)
    }
    const setup: RoundSetup = {
      words,
      levels: new Map(round.map((card) => [card.wordId, card.level])),
      pool: data.pool,
      speechSupported: isSpeechSupported(),
    }
    const initial = startRound(setup, [...words.keys()])
    if (!initial) return

    // A listening question plays here, inside the click (iOS only allows speech in a gesture)
    if (isListeningType(initial.question.type)) speak(initial.question.word.word)
    setPhase({ name: 'round', setup, initial, remaining })
  }

  /** Waits for every first-answer write; shows the summary, or a retry when one failed. */
  function settle(entries: AnswerEntry[], remaining: number) {
    setPhase({ name: 'saving', entries, remaining, failed: false })
    Promise.allSettled(entries.map((entry) => entry.write)).then((results) => {
      const outcomes: ReviewOutcome[] = []
      const items: SummaryItem[] = []
      let failed = false
      results.forEach((result, i) => {
        if (result.status === 'rejected') failed = true
        else if (result.value) {
          outcomes.push(result.value)
          items.push({
            word: entries[i].word,
            from: result.value.before.level,
            to: result.value.after.level,
            correct: entries[i].correct,
          })
        }
      })
      // Cards due tomorrow and the streak changed (also after a partly failed save)
      scheduleTagSync()
      setPhase(
        failed
          ? { name: 'saving', entries, remaining, failed: true }
          : { name: 'summary', items, outcomes, remaining },
      )
    })
  }

  function finishRound(entries: AnswerEntry[], remaining: number) {
    for (const entry of entries) reviewed.current.add(entry.wordId)
    settle(entries, remaining)
  }

  /** Writes again whatever failed (the transaction rolled back, so repeating is safe). */
  function retrySave(entries: AnswerEntry[], remaining: number) {
    const again = entries.map((entry) => {
      const write = entry.write.then(
        (outcome) => outcome,
        () => recordReviewAnswer(entry.wordId, entry.correct, entry.day),
      )
      write.catch(() => {})
      return { ...entry, write }
    })
    settle(again, remaining)
  }

  const leave = () => void navigate(paths.home)

  switch (phase.name) {
    case 'start':
      return (
        <ReviewStart overview={overview} today={data?.today ?? localToday()} onStart={startNextRound} />
      )
    case 'round':
      return (
        <ReviewRound
          setup={phase.setup}
          initial={phase.initial}
          onDone={(entries) => finishRound(entries, phase.remaining)}
          onExit={leave}
        />
      )
    case 'saving':
      return (
        <>
          <PageHeader title="Đang lưu kết quả" />
          <div className="page empty">
            {phase.failed ? (
              <>
                <p className="empty__title">Không lưu được kết quả lượt ôn. Hãy thử lại.</p>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => retrySave(phase.entries, phase.remaining)}
                >
                  Thử lại
                </button>
              </>
            ) : (
              <p className="muted">Đang lưu…</p>
            )}
          </div>
        </>
      )
    case 'summary':
      return (
        <ReviewSummary
          items={phase.items}
          remaining={phase.remaining}
          nextRoundSize={Math.min(phase.remaining, REVIEW_ROUND_SIZE)}
          next={nextReview}
          today={data?.today ?? localToday()}
          onMore={startNextRound}
        />
      )
  }
}
