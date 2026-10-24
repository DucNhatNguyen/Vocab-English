import { RotateCcw } from 'lucide-react'
import { Fragment, useEffect, useRef, useState, type ReactNode, type Ref } from 'react'
import ChoiceQuestion, { type ChoiceOption } from '../../components/quiz/ChoiceQuestion.tsx'
import TypedQuestion from '../../components/quiz/TypedQuestion.tsx'
import LevelTicks from '../../components/LevelTicks.tsx'
import SpeakButtons from '../../components/SpeakButtons.tsx'
import type { Word } from '../../data/types.ts'
import type { Blank } from '../../lib/blank.ts'
import { getPosLabel } from '../../lib/pos.ts'
import type { Question, QuestionType } from '../../lib/review.ts'
import { INTERVAL_DAYS, MAX_LEVEL, nextLevel, type SrsLevel } from '../../lib/srs.ts'

const TYPE_LABELS: Record<QuestionType, string> = {
  1: 'Chọn nghĩa',
  2: 'Nghe và chọn',
  3: 'Điền vào chỗ trống',
  4: 'Gõ từ tiếng Anh',
  5: 'Nghe và gõ',
}

interface ReviewQuestionProps {
  question: Question
  /** Memory level of the card when the round started (1-5). */
  level: number
  /** A re-ask of a word answered wrongly before: not counted again. */
  retry: boolean
  /** Runs inside the answer click / submit (user gesture): sound and pronunciation go here. */
  onAnswer: (correct: boolean) => void
  onNext: () => void
}

type ChoiceQuestionData = Extract<Question, { choices: unknown }>

function toOptions(question: ChoiceQuestionData): ChoiceOption[] {
  return question.choices.map((c) => ({ id: c.wordId, label: c.text }))
}

interface WordRevealProps {
  word: Word
  /** Leave the meaning out when the question already showed it. */
  showMeaning: boolean
  ref?: Ref<HTMLDivElement>
}

/** Word card under the verdict: the word, its IPA, optionally the meaning, and replay buttons. */
function WordReveal({ word, showMeaning, ref }: WordRevealProps) {
  return (
    <div ref={ref} className="reveal">
      <div className="reveal__head">
        <div className="reveal__main">
          <p className="reveal__word">
            <strong>{word.word}</strong>
            {word.ipa && <span className="reveal__ipa">{word.ipa}</span>}
          </p>
          {showMeaning && <p className="reveal__meaning">{word.meaningVi}</p>}
        </div>
        <SpeakButtons text={word.word} compact />
      </div>
    </div>
  )
}

interface ClozeProps {
  blank: Blank
  /** Vietnamese translation of the sentence. */
  hint: string
  answered: boolean
}

/** Fill-in-the-blank sentence; once answered the blanks show the word as written in it. */
function Cloze({ blank, hint, answered }: ClozeProps) {
  return (
    <div className="cloze">
      <p className="cloze__en">
        {blank.parts.map((part, i) => (
          <Fragment key={i}>
            {part}
            {i < blank.surfaces.length &&
              (answered ? (
                <mark className="cloze__fill">{blank.surfaces[i]}</mark>
              ) : (
                <span className="cloze__blank" role="img" aria-label="chỗ trống" />
              ))}
          </Fragment>
        ))}
      </p>
      {hint && (
        <div className="cloze__hint">
          <h3 className="label">Gợi ý</h3>
          <p>{hint}</p>
        </div>
      )}
    </div>
  )
}

function ListenCard({ word, prompt }: { word: Word; prompt: string }) {
  return (
    <div className="listen">
      <p className="listen__prompt">{prompt}</p>
      <SpeakButtons text={word.word} />
    </div>
  )
}

/**
 * One review question: header, the stem of its type, the answer controls (choices or a typed
 * field), the red-pen verdict with the new memory level, and the word card. Key it per
 * question so it resets.
 */
export default function ReviewQuestion({
  question,
  level,
  retry,
  onAnswer,
  onNext,
}: ReviewQuestionProps) {
  const { word } = question
  const [result, setResult] = useState<boolean | null>(null)
  const revealRef = useRef<HTMLDivElement>(null)
  const answered = result !== null

  // The card may sit under the fixed "Tiếp" bar on a long question: bring it into view
  useEffect(() => {
    if (answered) revealRef.current?.scrollIntoView({ block: 'nearest' })
  }, [answered])

  function handleAnswer(correct: boolean) {
    setResult(correct)
    onAnswer(correct)
  }

  const correct = result === true
  const from = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level))) as SrsLevel
  const to = nextLevel(from, correct)

  // Only the first answer moves the card; a re-ask is practice
  let hint: string
  let aside: ReactNode = null
  if (retry) {
    hint = correct ? 'Đã tính ở lần đầu, cấp độ giữ nguyên.' : 'Hỏi lại ở cuối lượt.'
  } else {
    const days = `${INTERVAL_DAYS[to]} ngày`
    const levelLabel = !correct
      ? `Về cấp ${to}`
      : from === MAX_LEVEL
        ? `Giữ cấp ${to}`
        : `Lên cấp ${to}`
    hint = correct ? `Ôn lại sau ${days}.` : `Hỏi lại ở cuối lượt, ôn lại sau ${days}.`
    aside = (
      <span className="quiz__aside">
        <LevelTicks level={to} />
        <span>{levelLabel}</span>
      </span>
    )
  }

  const common = {
    onAnswer: handleAnswer,
    onNext,
    hint,
    aside,
  }
  const choice = (options: ChoiceOption[], showMeaning: boolean) => (
    <ChoiceQuestion
      {...common}
      options={options}
      correctId={word.id}
      reveal={<WordReveal ref={revealRef} word={word} showMeaning={showMeaning} />}
    />
  )
  const typed = (label: string, showMeaning: boolean) => (
    <TypedQuestion
      {...common}
      answer={word.word}
      label={label}
      reveal={<WordReveal ref={revealRef} word={word} showMeaning={showMeaning} />}
    />
  )

  let stem: ReactNode
  let controls: ReactNode
  switch (question.type) {
    case 1:
      stem = (
        <>
          <div className="quiz__head">
            <p className="quiz__word">{word.word}</p>
            <SpeakButtons text={word.word} compact />
          </div>
          <p className="quiz__prompt">Chọn nghĩa đúng của từ này</p>
        </>
      )
      controls = choice(toOptions(question), false)
      break
    case 2:
      stem = <ListenCard word={word} prompt="Nghe rồi chọn từ bạn nghe được" />
      controls = choice(toOptions(question), true)
      break
    case 3:
      stem = <Cloze blank={question.blank} hint={word.exampleVi} answered={answered} />
      controls = choice(toOptions(question), true)
      break
    case 4:
      stem = (
        <>
          <p className="quiz__prompt">Gõ từ tiếng Anh có nghĩa sau</p>
          <div className="meaning-q">
            <p className="meaning-q__vi">{word.meaningVi}</p>
            {word.pos && <span className="chip">{getPosLabel(word.pos)}</span>}
          </div>
        </>
      )
      controls = typed('Từ tiếng Anh', false)
      break
    case 5:
      stem = <ListenCard word={word} prompt="Nghe rồi gõ lại từ bạn nghe được" />
      controls = typed('Từ tiếng Anh bạn nghe được', true)
      break
  }

  return (
    <div data-question-type={question.type}>
      <div className="rq__meta">
        <h2 className="label">{TYPE_LABELS[question.type]}</h2>
        {retry ? (
          <span className="rq__again">
            <RotateCcw size={14} aria-hidden="true" />
            Hỏi lại
          </span>
        ) : (
          <LevelTicks level={from} />
        )}
      </div>
      {stem}
      {controls}
    </div>
  )
}
