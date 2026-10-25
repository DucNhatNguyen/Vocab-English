import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { SessionFooter } from './SessionShell.tsx'

interface AnswerVerdictProps {
  answered: boolean
  correct: boolean
  /** Spoken to screen readers after a wrong answer: "Sai. Đáp án đúng: ...". */
  answerLabel: string
  /** Handwritten verdict of a wrong answer (default "Chưa đúng."). */
  wrongText?: string
  /** Small line under the verdict, e.g. "this word will be asked again". */
  hint?: string
  /** Right-aligned on the verdict line, e.g. the new memory level. */
  aside?: ReactNode
}

/** The red-pen verdict line under a question ("Đúng rồi!" / "Chưa đúng."). */
export function AnswerVerdict({
  answered,
  correct,
  answerLabel,
  wrongText = 'Chưa đúng.',
  hint,
  aside,
}: AnswerVerdictProps) {
  return (
    <div className={answered && correct ? 'quiz__verdict quiz__verdict--right' : 'quiz__verdict'} role="status">
      {answered && (
        <>
          <span className="quiz__verdict-line">
            <span aria-hidden="true">{correct ? 'Đúng rồi!' : wrongText}</span>
            {aside}
          </span>
          <span className="visually-hidden">
            {correct ? 'Đúng.' : `Sai. Đáp án đúng: ${answerLabel}.`}
          </span>
          {hint && <span className="quiz__hint">{hint}</span>}
        </>
      )}
    </div>
  )
}

interface NextFooterProps {
  /** Shown once the question is answered; until then the bar stays empty. */
  show: boolean
  label?: string
  /** Verdict of the answer: a correct one turns "Tiếp" green. */
  correct?: boolean
  onNext: () => void
}

/** Fixed bottom bar with the "Tiếp" button; takes focus when it appears. */
export function NextFooter({ show, label = 'Tiếp', correct = false, onNext }: NextFooterProps) {
  const ref = useRef<HTMLButtonElement>(null)

  // The answered control is disabled or gone, so hand focus to "Tiếp"
  useEffect(() => {
    if (show) ref.current?.focus()
  }, [show])

  return (
    <SessionFooter>
      {show && (
        <button
          ref={ref}
          type="button"
          className={correct ? 'btn btn--success' : 'btn btn--primary'}
          onClick={onNext}
        >
          {label}
          <ArrowRight size={20} aria-hidden="true" />
        </button>
      )}
    </SessionFooter>
  )
}
