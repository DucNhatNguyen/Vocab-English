import { useEffect, useRef } from 'react'
import { StruckText } from '../../../components/quiz/AnswerMarks.tsx'
import type { Passage } from '../../../data/exercises/types.ts'
import { passageParagraphs, type BlankState } from '../../../lib/exercisePassage.ts'

interface ClozePassageProps {
  passage: Passage
  /** Answered blanks by number. */
  states: ReadonlyMap<number, BlankState>
  /** Number of the blank of the question being answered: highlighted and scrolled into view. */
  current: number
}

function blankLabel(number: number, state: BlankState | undefined): string {
  if (!state) return `Chỗ trống ${number}`
  return state.correct
    ? `Chỗ trống ${number}: ${state.chosen}, đúng`
    : `Chỗ trống ${number}: ${state.chosen}, sai, đáp án đúng là ${state.answer}`
}

/**
 * A cloze passage with numbered blanks, in a card that scrolls on its own. The current blank is
 * highlighted; answered ones show the picked word, green when right, struck through with the
 * right word beside it when wrong. Key it per passage.
 */
export default function ClozePassage({ passage, states, current }: ClozePassageProps) {
  const textRef = useRef<HTMLDivElement>(null)

  // Bring the current blank to the middle of the card
  useEffect(() => {
    const box = textRef.current
    const blank = box?.querySelector<HTMLElement>('[data-current="true"]')
    if (!box || !blank) return
    const boxRect = box.getBoundingClientRect()
    const blankRect = blank.getBoundingClientRect()
    const top = box.scrollTop + (blankRect.top - boxRect.top) - (boxRect.height - blankRect.height) / 2
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    box.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' })
  }, [current])

  return (
    <section className="passage cloze glass">
      {passage.title && <h2 className="passage__title">{passage.title}</h2>}
      <div ref={textRef} className="passage__text" tabIndex={0} role="region" aria-label={passage.title ?? 'Đoạn văn'}>
        {passageParagraphs(passage.text).map((parts, p) => (
          <p key={p}>
            {parts.map((part, i) => {
              if (part.kind === 'text') return part.text
              const state = states.get(part.number)
              const isCurrent = part.number === current
              const classes = ['blank', state ? (state.correct ? 'blank--right' : 'blank--wrong') : 'blank--empty']
              if (isCurrent) classes.push('blank--current')
              return (
                <span
                  key={i}
                  className={classes.join(' ')}
                  role="img"
                  aria-label={blankLabel(part.number, state)}
                  data-current={isCurrent}
                >
                  <span className="blank__n" aria-hidden="true">
                    {part.number}
                  </span>
                  {state &&
                    (state.correct ? (
                      <span aria-hidden="true">{state.chosen}</span>
                    ) : (
                      <>
                        <span aria-hidden="true">
                          <StruckText>{state.chosen}</StruckText>
                        </span>
                        <span className="blank__fix" aria-hidden="true">
                          {state.answer}
                        </span>
                      </>
                    ))}
                </span>
              )
            })}
          </p>
        ))}
      </div>
    </section>
  )
}
