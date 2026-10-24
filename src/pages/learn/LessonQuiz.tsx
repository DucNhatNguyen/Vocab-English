import { useRef, useState } from 'react'
import ChoiceQuestion, { type ChoiceOption } from '../../components/quiz/ChoiceQuestion.tsx'
import SessionShell, { SessionBody } from '../../components/quiz/SessionShell.tsx'
import SpeakButtons from '../../components/SpeakButtons.tsx'
import type { Word } from '../../data/types.ts'
import {
  answerQuestion,
  answeredCount,
  buildChoices,
  createQuizQueue,
  currentQuestion,
  isQuizDone,
  type QuizQueue,
} from '../../lib/quiz.ts'
import { playSfx } from '../../lib/sfx.ts'
import { speak } from '../../lib/speech.ts'

interface LessonQuizProps {
  words: readonly Word[]
  onDone: () => void
  onExit: () => void
}

interface QuizState {
  queue: QuizQueue
  /** Increments per question shown, so a re-asked word gets a fresh question component. */
  step: number
  /** Options of the current question, built once so they do not reshuffle on re-render. */
  options: ChoiceOption[]
}

function optionsFor(queue: QuizQueue, words: readonly Word[]): ChoiceOption[] {
  const target = words.find((w) => w.id === currentQuestion(queue))
  if (!target) return []
  return buildChoices(target, words).map((c) => ({ id: c.wordId, label: c.text }))
}

/** Step 2: "pick the meaning" for every word; wrong words come back at the end until correct. */
export default function LessonQuiz({ words, onDone, onExit }: LessonQuizProps) {
  const [state, setState] = useState<QuizState>(() => {
    const queue = createQuizQueue(words.map((w) => w.id))
    return { queue, step: 0, options: optionsFor(queue, words) }
  })
  const lastAnswerCorrect = useRef(false)
  const { queue, step, options } = state

  const target = words.find((w) => w.id === currentQuestion(queue))
  if (!target) return null

  function handleAnswer(correct: boolean) {
    lastAnswerCorrect.current = correct
    // Inside the click: sound effect and pronunciation (iOS needs a user gesture)
    playSfx(correct ? 'correct' : 'wrong')
    speak(target!.word)
  }

  function handleNext() {
    const next = answerQuestion(queue, lastAnswerCorrect.current)
    if (isQuizDone(next)) {
      onDone()
      return
    }
    setState({ queue: next, step: step + 1, options: optionsFor(next, words) })
    window.scrollTo(0, 0)
  }

  return (
    <SessionShell done={answeredCount(queue)} total={queue.total} onExit={onExit}>
      <SessionBody>
        <h2 className="label">Kiểm tra nhanh</h2>
        <div className="quiz__head">
          <p className="quiz__word">{target.word}</p>
          <SpeakButtons text={target.word} compact />
        </div>
        <p className="quiz__prompt">Chọn nghĩa đúng của từ này</p>
        <ChoiceQuestion
          key={step}
          options={options}
          correctId={target.id}
          onAnswer={handleAnswer}
          onNext={handleNext}
          wrongHint="Từ này sẽ được hỏi lại ở cuối lượt."
        />
      </SessionBody>
    </SessionShell>
  )
}
