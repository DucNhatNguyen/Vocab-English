import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { isTypedAnswerCorrect } from '../../lib/review.ts'
import { AnswerVerdict, NextFooter } from './AnswerFeedback.tsx'
import { RedTick, StruckText } from './AnswerMarks.tsx'

interface TypedQuestionProps {
  /** The word the user has to type. */
  answer: string
  /** Accessible name of the text field. */
  label: string
  /**
   * Runs inside the submit / "Không nhớ" handler, i.e. inside the user gesture, so it is the
   * place to pronounce the word or play a sound (iOS blocks both outside a gesture).
   */
  onAnswer: (correct: boolean) => void
  onNext: () => void
  nextLabel?: string
  /** Small line under a wrong verdict, e.g. "this word will be asked again". */
  wrongHint?: string
  /** Line under the verdict for right and wrong answers alike; wins over wrongHint. */
  hint?: string
  /** Right-aligned on the verdict line, e.g. the new memory level. */
  aside?: ReactNode
  /** Extra content under the verdict once answered, e.g. the word card of a review. */
  reveal?: ReactNode
}

interface Result {
  /** What the user typed; null when they gave up with "Không nhớ". */
  typed: string | null
  correct: boolean
}

/**
 * "Type the English word" question. Matching ignores case, outer and repeated whitespace and
 * curly apostrophes. The field and both buttons sit in the page flow right under the prompt
 * (not in the fixed bottom bar) so the on-screen keyboard cannot cover them. A wrong answer is
 * struck through in red pen with the right word handwritten below; "Không nhớ" counts as wrong.
 * Key it per question so it resets.
 */
export default function TypedQuestion({
  answer,
  label,
  onAnswer,
  onNext,
  nextLabel = 'Tiếp',
  wrongHint,
  hint,
  aside,
  reveal,
}: TypedQuestionProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const answered = result !== null

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [])

  // When the keyboard opens the visual viewport shrinks (iOS leaves the layout viewport alone):
  // keep the buttons under the field in view.
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport || answered) return
    const keepVisible = () => {
      if (document.activeElement === inputRef.current) {
        actionsRef.current?.scrollIntoView({ block: 'nearest' })
      }
    }
    viewport.addEventListener('resize', keepVisible)
    return () => viewport.removeEventListener('resize', keepVisible)
  }, [answered])

  function finish(typed: string | null) {
    if (answered) return
    const correct = typed !== null && isTypedAnswerCorrect(typed, answer)
    // Close the keyboard so the fixed "Tiếp" bar is not hidden behind it
    inputRef.current?.blur()
    setResult({ typed, correct })
    onAnswer(correct)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (text.trim() === '') return
    finish(text)
  }

  const correct = result?.correct === true
  const gaveUp = result !== null && result.typed === null

  return (
    <>
      {result === null ? (
        <form className="typed" onSubmit={submit}>
          <label className="visually-hidden" htmlFor={inputId}>
            {label}
          </label>
          <input
            ref={inputRef}
            id={inputId}
            className="typed__input"
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Gõ từ tiếng Anh"
            lang="en"
            enterKeyHint="go"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
          />
          <div ref={actionsRef} className="typed__actions">
            <button type="button" className="btn btn--ghost" onClick={() => finish(null)}>
              Không nhớ
            </button>
            <button type="submit" className="btn btn--primary" disabled={text.trim() === ''}>
              Kiểm tra
            </button>
          </div>
        </form>
      ) : gaveUp ? (
        <p className="choice-note typed__answer" aria-hidden="true">
          {answer}
        </p>
      ) : (
        <div className="choice-item">
          <div className={correct ? 'choice choice--static choice--right' : 'choice choice--static'}>
            <span className="choice__text">
              {correct ? answer : <StruckText>{result.typed ?? ''}</StruckText>}
            </span>
            {correct && <RedTick className="choice__tick" />}
          </div>
          {!correct && (
            <p className="choice-note" aria-hidden="true">
              {answer}
            </p>
          )}
        </div>
      )}

      <AnswerVerdict
        answered={answered}
        correct={correct}
        answerLabel={answer}
        wrongText={gaveUp ? 'Chưa nhớ ra.' : 'Chưa đúng.'}
        hint={hint ?? (correct ? undefined : wrongHint)}
        aside={aside}
      />
      {answered && reveal}

      <NextFooter show={answered} label={nextLabel} correct={correct} onNext={onNext} />
    </>
  )
}
