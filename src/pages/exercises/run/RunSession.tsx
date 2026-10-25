import { useRef, useState } from 'react'
import SessionShell, { SessionBody } from '../../../components/quiz/SessionShell.tsx'
import { recordAnswer } from '../../../db/exercises.ts'
import type { ExerciseAnswer } from '../../../db/types.ts'
import { firstUnansweredIndex, type Answers, type RunItem } from '../../../lib/exerciseRun.ts'
import { playSfx } from '../../../lib/sfx.ts'
import QuestionStage from './QuestionStage.tsx'

interface RunSessionProps {
  items: readonly RunItem[]
  /** Attempt that stores the answers; null for a retry run, which only updates the latest results. */
  attemptId: number | null
  /** Answers of the attempt so far; the run resumes at the first question without one. */
  initialAnswers: Answers
  /** Retry runs mix sets, so the kicker names the set too. */
  showSet: boolean
  /** Last "Tiếp" pressed: all writes are done; hands over every answer of the run. */
  onFinish: (answers: Answers) => Promise<void>
  /** Called after the user confirmed leaving; answers so far are already saved. */
  onExit: () => void
}

/**
 * The questions of one run, one per screen. Every answer is written to the database as soon as it is
 * given (so leaving mid-run keeps it); the last "Tiếp" waits for pending writes before it finishes.
 */
export default function RunSession({ items, attemptId, initialAnswers, showSet, onFinish, onExit }: RunSessionProps) {
  const [index, setIndex] = useState(() => Math.min(firstUnansweredIndex(items, initialAnswers), items.length - 1))
  const [answers, setAnswers] = useState<Answers>(initialAnswers)
  const [saveFailed, setSaveFailed] = useState(false)
  const pending = useRef<Promise<void>[]>([])
  const finishing = useRef(false)
  const item = items[index]

  // Runs inside the click / submit: the sound effect needs the user gesture on iOS
  function handleAnswer(answer: ExerciseAnswer) {
    playSfx(answer.correct ? 'correct' : 'wrong')
    setAnswers((prev) => ({ ...prev, [item.question.id]: answer }))
    const write = recordAnswer(attemptId, item.set.id, item.question.id, answer)
    pending.current.push(write.catch(() => setSaveFailed(true)))
  }

  async function handleNext() {
    if (finishing.current) return
    if (index + 1 < items.length) {
      setIndex(index + 1)
      window.scrollTo(0, 0)
      return
    }
    finishing.current = true
    await Promise.all(pending.current)
    try {
      await onFinish(answers)
    } finally {
      finishing.current = false
    }
  }

  return (
    <SessionShell
      done={index + 1}
      total={items.length}
      onExit={onExit}
      exitTitle="Thoát bài tập?"
      exitMessage={
        attemptId === null
          ? 'Kết quả các câu bạn đã làm đến giờ đã được lưu.'
          : 'Các câu bạn đã trả lời đến giờ đã được lưu. Bạn có thể làm tiếp từ danh sách Bài tập.'
      }
    >
      <SessionBody>
        {saveFailed && (
          <p className="ex-note ex-note--alert" role="alert">
            Không lưu được câu trả lời. Bài làm vẫn tiếp tục, nhưng kết quả có thể bị mất.
          </p>
        )}
        <QuestionStage
          items={items}
          index={index}
          answers={answers}
          showSet={showSet}
          onAnswer={handleAnswer}
          onNext={() => void handleNext()}
        />
      </SessionBody>
    </SessionShell>
  )
}
