import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { useSettings } from '../app/useSettings.ts'
import { paths } from '../app/paths.ts'
import { useHideTabBar } from '../app/tabBarVisibility.ts'
import IconBadge from '../components/IconBadge.tsx'
import PageHeader from '../components/PageHeader.tsx'
import type { Word } from '../data/types.ts'
import { completeLesson, loadLessonWords } from '../db/lesson.ts'
import { today } from '../lib/date.ts'
import { scheduleTagSync } from '../lib/notifications.ts'
import { speak } from '../lib/speech.ts'
import { isSelfStudySearch } from '../lib/studySource.ts'
import LessonCards from './learn/LessonCards.tsx'
import LessonQuiz from './learn/LessonQuiz.tsx'
import LessonStart from './learn/LessonStart.tsx'
import LessonSummary from './learn/LessonSummary.tsx'

type Phase =
  | { name: 'start' }
  | { name: 'cards'; words: Word[] }
  | { name: 'quiz'; words: Word[] }
  | { name: 'saving'; words: Word[]; failed: boolean }
  | { name: 'summary'; words: Word[] }

/** New-word lesson: start screen -> word cards -> quick check -> summary. */
export default function Learn() {
  const navigate = useNavigate()
  const { search } = useLocation()
  // ?nguon=tu-hoc: learn only the user's own words (Tự học)
  const mine = isSelfStudySearch(search)
  const { dailyGoal } = useSettings()
  // Live: after a lesson is saved this becomes the next lesson (or empty)
  const upcoming = useLiveQuery(() => loadLessonWords(mine ? 'mine' : 'decks'), [mine])
  const [phase, setPhase] = useState<Phase>({ name: 'start' })

  // A failed save shows the tab bar again, so the user is never trapped
  useHideTabBar(
    phase.name === 'cards' || phase.name === 'quiz' || (phase.name === 'saving' && !phase.failed),
  )

  function start() {
    if (!upcoming || upcoming.length === 0) return
    // Pronounce the first card here, inside the click (iOS only allows speech in a gesture)
    speak(upcoming[0].word)
    // Snapshot: later changes to progress must not alter a lesson in progress
    setPhase({ name: 'cards', words: upcoming })
  }

  function save(words: Word[]) {
    setPhase({ name: 'saving', words, failed: false })
    completeLesson(
      words.map((w) => w.id),
      today(),
    ).then(
      () => {
        setPhase({ name: 'summary', words })
        // The next word and the streak changed: refresh the push tags
        scheduleTagSync()
      },
      () => setPhase({ name: 'saving', words, failed: true }),
    )
  }

  const leave = () => void navigate(mine ? paths.selfStudy : paths.home)

  switch (phase.name) {
    case 'start':
      return <LessonStart words={upcoming} dailyGoal={dailyGoal} mine={mine} onStart={start} />
    case 'cards':
      return (
        <LessonCards
          words={phase.words}
          onDone={() => setPhase({ name: 'quiz', words: phase.words })}
          onExit={leave}
        />
      )
    case 'quiz':
      return <LessonQuiz words={phase.words} onDone={() => save(phase.words)} onExit={leave} />
    case 'saving':
      return (
        <>
          <PageHeader title="Đang lưu bài học" />
          <div className="page empty">
            {phase.failed ? (
              <>
                <IconBadge icon={TriangleAlert} hue="orange" size="lg" />
                <p className="empty__title">Không lưu được bài học. Hãy thử lại.</p>
                <button type="button" className="btn btn--primary" onClick={() => save(phase.words)}>
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
        <LessonSummary
          words={phase.words}
          mine={mine}
          hasMore={(upcoming?.length ?? 0) > 0}
          nextCount={upcoming?.length ?? 0}
          onMore={() => setPhase({ name: 'start' })}
        />
      )
  }
}
