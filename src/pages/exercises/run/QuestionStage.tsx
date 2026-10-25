import { clozeBlankStates } from '../../../lib/exercisePassage.ts'
import { questionLayout, sectionKicker, startsSection, type Answers, type RunItem } from '../../../lib/exerciseRun.ts'
import type { ExerciseAnswer } from '../../../db/types.ts'
import ChoiceView from './ChoiceView.tsx'
import ClozePassage from './ClozePassage.tsx'
import ExamplesCard from './ExamplesCard.tsx'
import PassageCard from './PassageCard.tsx'
import ReviewFooter from './ReviewFooter.tsx'
import RewriteView from './RewriteView.tsx'

interface QuestionStageProps {
  items: readonly RunItem[]
  index: number
  answers: Answers
  /** Retry runs mix sets, so the kicker names the set too. */
  showSet: boolean
  /** Read-only look at an answered question; `onNext` then goes back. */
  review?: boolean
  /** Runs inside the user gesture that answered the current question. */
  onAnswer?: (answer: ExerciseAnswer) => void
  onNext: () => void
}

/**
 * Everything on screen for one question: the section kicker, the examples or passage that belong to
 * the section, and the question itself. The passage and examples sit outside the keyed question view,
 * so they keep their state (expanded, scroll position) from one question of a section to the next.
 */
export default function QuestionStage({ items, index, answers, showSet, review = false, onAnswer, onNext }: QuestionStageProps) {
  const item = items[index]
  const { question, section, set } = item
  const layout = questionLayout(item)
  const initial = review ? answers[question.id] : undefined
  const footer = review ? <ReviewFooter onBack={onNext} /> : undefined
  const handleAnswer = (answer: ExerciseAnswer) => onAnswer?.(answer)

  return (
    <>
      <p className="ex-kicker">{sectionKicker(set, section, showSet)}</p>
      {section.examples && section.examples.length > 0 && (
        <ExamplesCard
          key={`${set.id}/${section.id}`}
          examples={section.examples}
          initiallyOpen={!review && startsSection(items, index)}
        />
      )}
      {layout === 'reading' && section.passage && <PassageCard key={`${set.id}/${section.id}`} passage={section.passage} />}
      {layout === 'cloze' && section.passage && (
        <ClozePassage
          key={`${set.id}/${section.id}`}
          passage={section.passage}
          states={clozeBlankStates(section, answers)}
          current={question.number}
        />
      )}
      {question.type === 'choice' ? (
        <ChoiceView
          key={question.id}
          question={question}
          cloze={layout === 'cloze'}
          initial={initial}
          onAnswer={handleAnswer}
          onNext={onNext}
          footer={footer}
        />
      ) : (
        <RewriteView
          key={question.id}
          question={question}
          initial={initial}
          onAnswer={handleAnswer}
          onNext={onNext}
          footer={footer}
        />
      )}
    </>
  )
}
