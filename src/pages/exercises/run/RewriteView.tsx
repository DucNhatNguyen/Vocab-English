import { ArrowRight, Check } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { AnswerVerdict } from '../../../components/quiz/AnswerFeedback.tsx'
import { RedTick, StruckText } from '../../../components/quiz/AnswerMarks.tsx'
import { SessionFooter } from '../../../components/quiz/SessionShell.tsx'
import type { RewriteQuestion } from '../../../data/exercises/types.ts'
import type { ExerciseAnswer } from '../../../db/types.ts'
import { rewriteTail } from '../../../lib/exercisePassage.ts'
import { isRewriteCorrect, joinRewrite } from '../../../lib/exercises.ts'
import ExplainCard from './ExplainCard.tsx'

/** Other accepted answers listed under the explanation. */
const MAX_ALTERNATIVES = 3

interface RewriteViewProps {
  question: RewriteQuestion
  /** An earlier answer to show read-only (review of a wrong question). */
  initial?: ExerciseAnswer
  /** Runs inside the submit / "Mình viết đúng" click (user gesture). */
  onAnswer: (answer: ExerciseAnswer) => void
  onNext: () => void
  /** Replaces the bottom bar (review). Without it the bar has "Mình viết đúng" and "Tiếp". */
  footer?: ReactNode
}

interface Result {
  typed: string
  correct: boolean
  selfMarked: boolean
}

function toResult(initial: ExerciseAnswer | undefined): Result | null {
  if (!initial) return null
  return { typed: String(initial.value), correct: initial.correct, selfMarked: initial.selfMarked === true }
}

/**
 * Rewrite question: the source sentence, the fixed prefix, a multi-line field and the fixed suffix.
 * A match with any accepted answer is right. Otherwise the attempt is struck line by line, the model
 * answer is handwritten under it, and "Mình viết đúng" lets the user overrule the grading. Key it
 * per question.
 */
export default function RewriteView({ question, initial, onAnswer, onNext, footer }: RewriteViewProps) {
  const fieldId = useId()
  const fieldRef = useRef<HTMLTextAreaElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const [text, setText] = useState('')
  const [result, setResult] = useState<Result | null>(() => toResult(initial))
  const reviewing = footer !== undefined
  const answered = result !== null

  useEffect(() => {
    if (!reviewing) fieldRef.current?.focus({ preventScroll: true })
  }, [reviewing])

  // The field and the buttons are gone or disabled once answered, so hand focus to "Tiếp"
  const selfMarked = result?.selfMarked === true
  useEffect(() => {
    if (answered && !reviewing) nextRef.current?.focus()
  }, [answered, selfMarked, reviewing])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (answered || text.trim() === '') return
    const correct = isRewriteCorrect(text, question)
    // Close the keyboard so the fixed bottom bar is not hidden behind it
    fieldRef.current?.blur()
    setResult({ typed: text, correct, selfMarked: false })
    onAnswer({ value: text, correct })
  }

  function markCorrect() {
    if (!result || result.correct) return
    setResult({ ...result, correct: true, selfMarked: true })
    onAnswer({ value: result.typed, correct: true, selfMarked: true })
  }

  const correct = result?.correct === true
  const modelAnswer = joinRewrite(question, question.answers[0])
  const others = selfMarked ? question.answers : correct ? [] : question.answers.slice(1)

  return (
    <>
      <section className="source glass">
        <p className="source__label">Câu gốc</p>
        <p className="source__text">{question.original}</p>
      </section>

      {result === null ? (
        <form className="rewrite-form" onSubmit={submit}>
          <div className="answer-box answer-box--edit">
            <span className="answer-box__prefix">{question.prefix}</span>
            <label className="visually-hidden" htmlFor={fieldId}>
              {`Viết tiếp sau “${question.prefix}”`}
            </label>
            <textarea
              ref={fieldRef}
              id={fieldId}
              className="rewrite-form__field"
              rows={3}
              value={text}
              onChange={(event) => setText(event.target.value)}
              lang="en"
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
            />
            {question.suffix && <span className="answer-box__suffix">{question.suffix}</span>}
          </div>
          <button type="submit" className="btn btn--primary" disabled={text.trim() === ''}>
            Kiểm tra
          </button>
        </form>
      ) : (
        <>
          <div className={correct ? 'answer-box answer-box--right' : 'answer-box'}>
            <span className="answer-box__prefix">{question.prefix}</span>{' '}
            {correct ? (
              <span className="answer-box__text">{rewriteTail(question, result.typed)}</span>
            ) : (
              <StruckText>{rewriteTail(question, result.typed)}</StruckText>
            )}
            {correct && <RedTick className="answer-box__tick" />}
          </div>
          {!correct && (
            <p className="fix" aria-hidden="true">
              <span className="fix__prefix">{question.prefix}</span> {rewriteTail(question, question.answers[0])}
            </p>
          )}
        </>
      )}

      <AnswerVerdict
        answered={answered}
        correct={correct}
        answerLabel={modelAnswer.replace(/[.!?]+$/, '')}
        wrongText="Chưa khớp đáp án."
        hint={
          selfMarked
            ? 'Bạn tự chấm câu này là đúng.'
            : correct
              ? undefined
              : reviewing
                ? undefined
                : 'Nếu bạn chắc câu mình đúng nghĩa và đúng ngữ pháp, bấm “Mình viết đúng”.'
        }
      />

      {answered && (
        <ExplainCard text={question.explanation}>
          {selfMarked && (
            <p className="explain__alt">
              <strong>Đáp án mẫu:</strong> {modelAnswer}
            </p>
          )}
          {others.slice(selfMarked ? 1 : 0, (selfMarked ? 1 : 0) + MAX_ALTERNATIVES).map((answer) => (
            <p key={answer} className="explain__alt">
              Cũng đúng: {joinRewrite(question, answer)}
            </p>
          ))}
        </ExplainCard>
      )}

      {footer ?? (
        <SessionFooter>
          {answered && (
            <>
              {!correct && (
                <button type="button" className="btn btn--ghost btn--self" onClick={markCorrect}>
                  <Check size={20} aria-hidden="true" />
                  Mình viết đúng
                </button>
              )}
              <button
                ref={nextRef}
                type="button"
                className={correct ? 'btn btn--success' : 'btn btn--primary'}
                onClick={onNext}
              >
                Tiếp
                <ArrowRight size={20} aria-hidden="true" />
              </button>
            </>
          )}
        </SessionFooter>
      )}
    </>
  )
}
