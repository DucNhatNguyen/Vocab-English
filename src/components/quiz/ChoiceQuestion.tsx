import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { RedTick, StruckText } from './AnswerMarks.tsx'
import { SessionFooter } from './SessionShell.tsx'

export interface ChoiceOption {
  id: string
  label: string
}

interface ChoiceQuestionProps {
  options: readonly ChoiceOption[]
  correctId: string
  /**
   * Runs inside the click handler of the chosen option, i.e. inside the user gesture, so it is
   * the place to pronounce the word or play a sound (iOS blocks both outside a gesture).
   */
  onAnswer: (correct: boolean) => void
  /** "Tiếp" pressed after the feedback. */
  onNext: () => void
  nextLabel?: string
  /** Small line under a wrong verdict, e.g. "this word will be asked again". */
  wrongHint?: string
}

/**
 * Multiple choice with the red-pen feedback of spec 8.1: a correct pick gets a drawn tick; a
 * wrong pick is struck through and the right answer is written next to it in handwriting.
 * Renders the options, the verdict and the fixed "Tiếp" bar. Key it per question so it resets.
 */
export default function ChoiceQuestion({
  options,
  correctId,
  onAnswer,
  onNext,
  nextLabel = 'Tiếp',
  wrongHint,
}: ChoiceQuestionProps) {
  const [chosenId, setChosenId] = useState<string | null>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const answered = chosenId !== null
  const correct = chosenId === correctId
  const answerLabel = options.find((o) => o.id === correctId)?.label ?? ''

  // The chosen button is disabled after answering, so hand focus to "Tiếp"
  useEffect(() => {
    if (answered) nextRef.current?.focus()
  }, [answered])

  function choose(id: string) {
    if (answered) return
    setChosenId(id)
    onAnswer(id === correctId)
  }

  return (
    <>
      <ul className="choices">
        {options.map((option) => {
          const picked = option.id === chosenId
          const isAnswer = option.id === correctId
          const classes = ['choice']
          if (answered && isAnswer) classes.push('choice--right')
          if (answered && !isAnswer && !picked) classes.push('choice--dim')
          return (
            <li key={option.id} className="choice-item">
              <button
                type="button"
                className={classes.join(' ')}
                disabled={answered}
                onClick={() => choose(option.id)}
              >
                <span className="choice__text">
                  {picked && !correct ? <StruckText>{option.label}</StruckText> : option.label}
                </span>
                {picked && correct && <RedTick className="choice__tick" />}
              </button>
              {picked && !correct && (
                <p className="choice-note" aria-hidden="true">
                  {answerLabel}
                </p>
              )}
            </li>
          )
        })}
      </ul>

      <div className="quiz__verdict" role="status">
        {answered && (
          <>
            <span aria-hidden="true">{correct ? 'Đúng rồi!' : 'Chưa đúng.'}</span>
            <span className="visually-hidden">
              {correct ? 'Đúng.' : `Sai. Đáp án đúng: ${answerLabel}.`}
            </span>
            {!correct && wrongHint && <span className="quiz__hint">{wrongHint}</span>}
          </>
        )}
      </div>

      <SessionFooter>
        {answered && (
          <button ref={nextRef} type="button" className="btn btn--primary" onClick={onNext}>
            {nextLabel}
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        )}
      </SessionFooter>
    </>
  )
}
