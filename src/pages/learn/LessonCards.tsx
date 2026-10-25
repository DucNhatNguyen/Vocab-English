import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import SessionShell, { SessionBody, SessionFooter } from '../../components/quiz/SessionShell.tsx'
import SpeakButtons from '../../components/SpeakButtons.tsx'
import type { Word } from '../../data/types.ts'
import { getPosLabel } from '../../lib/pos.ts'
import { speak } from '../../lib/speech.ts'

interface LessonCardsProps {
  words: readonly Word[]
  onDone: () => void
  onExit: () => void
}

/** Step 1: one word card at a time. Each move pronounces the word it lands on. */
export default function LessonCards({ words, onDone, onExit }: LessonCardsProps) {
  const [index, setIndex] = useState(0)
  const word = words[index]
  const last = index === words.length - 1

  // A new card starts at the top, in case the previous one was scrolled
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [index])

  // speak() is called in the click handlers (not in an effect): iOS only allows it in a gesture
  function goTo(next: number) {
    speak(words[next].word)
    setIndex(next)
  }

  return (
    <SessionShell done={index + 1} total={words.length} onExit={onExit}>
      <SessionBody>
        <article className="flashcard glass" aria-live="polite">
          {word.emoji && (
            <div className="word-detail__emoji" aria-hidden="true">
              {word.emoji}
            </div>
          )}
          <h2 className="word-detail__word">{word.word}</h2>
          <p className="word-detail__ipa">
            {word.ipa && <span>{word.ipa}</span>}
            {word.pos && <span className="chip">{getPosLabel(word.pos)}</span>}
          </p>

          <SpeakButtons text={word.word} className="word-detail__speak" />

          <section className="word-detail__section">
            <h3 className="label">Nghĩa</h3>
            <p className="word-detail__meaning">{word.meaningVi}</p>
          </section>

          {(word.exampleEn || word.exampleVi) && (
            <section className="word-detail__section">
              <h3 className="label">Ví dụ</h3>
              <div className="example">
                {word.exampleEn && <p className="example__en">{word.exampleEn}</p>}
                {word.exampleVi && <p className="example__vi">{word.exampleVi}</p>}
              </div>
            </section>
          )}
        </article>
      </SessionBody>

      <SessionFooter>
        <button
          type="button"
          className="btn btn--ghost btn--secondary"
          disabled={index === 0}
          onClick={() => goTo(index - 1)}
        >
          <ArrowLeft size={20} aria-hidden="true" />
          Quay lại
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => (last ? onDone() : goTo(index + 1))}
        >
          {last ? 'Kiểm tra nhanh' : 'Tiếp'}
          <ArrowRight size={20} aria-hidden="true" />
        </button>
      </SessionFooter>
    </SessionShell>
  )
}
