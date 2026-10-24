import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useSettings } from '../app/useSettings.ts'
import { paths } from '../app/paths.ts'
import { useHideTabBar } from '../app/tabBarVisibility.ts'
import PageHeader from '../components/PageHeader.tsx'
import type { Word } from '../data/types.ts'
import { completeLesson, loadLessonWords } from '../db/lesson.ts'
import { today } from '../lib/date.ts'
import { speak } from '../lib/speech.ts'
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
  const { dailyGoal } = useSettings()
  // Live: after a lesson is saved this becomes the next lesson (or empty)
  const upcoming = useLiveQuery(loadLessonWords)
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
      () => setPhase({ name: 'summary', words }),
      () => setPhase({ name: 'saving', words, failed: true }),
    )
  }

  const leave = () => void navigate(paths.home)

  switch (phase.name) {
    case 'start':
      return <LessonStart words={upcoming} dailyGoal={dailyGoal} onStart={start} />
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
          hasMore={(upcoming?.length ?? 0) > 0}
          onMore={() => setPhase({ name: 'start' })}
        />
      )
  }
}
