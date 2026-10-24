import { useRef, useState } from 'react'
import SessionShell, { SessionBody } from '../../components/quiz/SessionShell.tsx'
import { recordReviewAnswer } from '../../db/review.ts'
import { today } from '../../lib/date.ts'
import { answeredCount } from '../../lib/quiz.ts'
import { isListeningType } from '../../lib/review.ts'
import { playSfx } from '../../lib/sfx.ts'
import { speak } from '../../lib/speech.ts'
import ReviewQuestion from './ReviewQuestion.tsx'
import {
  advanceRound,
  isRetry,
  type AnswerEntry,
  type RoundSetup,
  type RoundState,
} from './round.ts'

interface ReviewRoundProps {
  setup: RoundSetup
  /** First state, built by the start handler (which also pronounced a listening question). */
  initial: RoundState
  /** Last "Tiếp" pressed; hands over the first answer of every word. */
  onDone: (entries: AnswerEntry[]) => void
  /** Called after the user confirmed leaving; answers so far are already saved. */
  onExit: () => void
}

/**
 * The questions of one round. Only the FIRST answer of a word counts: it is written to the
 * database right away (so leaving mid-round keeps it); a wrong word comes back at the end of
 * the queue and its re-asks are never written.
 */
export default function ReviewRound({ setup, initial, onDone, onExit }: ReviewRoundProps) {
  const [state, setState] = useState(initial)
  const entries = useRef<AnswerEntry[]>([])
  const lastCorrect = useRef(false)
  const { question, queue } = state
  const word = question.word
  const retry = isRetry(state)

  // Runs inside the click / submit: sound effect and pronunciation need the user gesture on iOS
  function handleAnswer(correct: boolean) {
    lastCorrect.current = correct
    playSfx(correct ? 'correct' : 'wrong')
    speak(word.word)

    if (retry) return
    const day = today()
    const write = recordReviewAnswer(word.id, correct, day)
    // A failed write is reported when the round ends (with a retry); avoid an unhandled rejection
    write.catch(() => {})
    entries.current.push({
      wordId: word.id,
      word,
      level: setup.levels.get(word.id) ?? 1,
      correct,
      day,
      write,
    })
  }

  function handleNext() {
    const next = advanceRound(setup, state, lastCorrect.current)
    if (next === null) {
      onDone(entries.current)
      return
    }
    // A listening question plays as soon as it appears, inside this click
    if (isListeningType(next.question.type)) speak(next.question.word.word)
    setState(next)
    window.scrollTo(0, 0)
  }

  return (
    <SessionShell
      done={answeredCount(queue)}
      total={queue.total}
      onExit={onExit}
      exitTitle="Thoát ôn tập?"
      exitMessage="Các câu bạn đã trả lời đến giờ đã được lưu."
    >
      <SessionBody>
        <ReviewQuestion
          key={state.step}
          question={question}
          level={setup.levels.get(word.id) ?? 1}
          retry={retry}
          onAnswer={handleAnswer}
          onNext={handleNext}
        />
      </SessionBody>
    </SessionShell>
  )
}
