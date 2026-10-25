import { useState, type ReactNode } from 'react'
import ChoiceQuestion from '../../../components/quiz/ChoiceQuestion.tsx'
import type { ChoiceQuestion as ChoiceQuestionData } from '../../../data/exercises/types.ts'
import type { ExerciseAnswer } from '../../../db/types.ts'
import ExplainCard from './ExplainCard.tsx'
import PromptText from './PromptText.tsx'

interface ChoiceViewProps {
  question: ChoiceQuestionData
  /** Cloze item: the blank is in the passage above, so the options form a 2x2 grid. */
  cloze: boolean
  /** An earlier answer to show read-only (review of a wrong question). */
  initial?: ExerciseAnswer
  /** Runs inside the click on an option (user gesture). */
  onAnswer: (answer: ExerciseAnswer) => void
  onNext: () => void
  /** Replaces the "Tiếp" bar. */
  footer?: ReactNode
}

/**
 * A multiple-choice question (vocabulary, completion, grammar, reading, cloze) on top of the shared
 * `ChoiceQuestion`: red-pen feedback on the options, then the explanation with the note of the
 * option that was picked wrongly. Key it per question.
 */
export default function ChoiceView({ question, cloze, initial, onAnswer, onNext, footer }: ChoiceViewProps) {
  const [picked, setPicked] = useState<number | undefined>(initial ? Number(initial.value) : undefined)
  const options = question.options.map((label, i) => ({ id: String(i), label }))
  const note = picked !== undefined && picked !== question.answer ? question.optionNotes[picked] : ''

  return (
    <>
      {cloze || question.prompt === undefined ? (
        <p className="ex-question">
          Chọn từ cho chỗ trống <span className="ex-question__num">{question.number}</span>
        </p>
      ) : (
        <PromptText number={question.number} prompt={question.prompt} />
      )}
      <ChoiceQuestion
        options={options}
        correctId={String(question.answer)}
        grid={cloze}
        initialChosenId={initial ? String(initial.value) : undefined}
        onAnswer={(correct, id) => {
          setPicked(Number(id))
          onAnswer({ value: Number(id), correct })
        }}
        onNext={onNext}
        footer={footer}
        reveal={
          <ExplainCard text={question.explanation}>
            {note && (
              <p className="explain__why">
                <strong>Vì sao “{question.options[picked!]}” sai:</strong> {note}
              </p>
            )}
          </ExplainCard>
        }
      />
    </>
  )
}
