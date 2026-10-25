import { ChevronDown, ChevronUp } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import type { Passage } from '../../../data/exercises/types.ts'

/**
 * Reading passage above the questions: clamped to about eight lines with "Đọc cả bài", and
 * scrolling on its own once expanded. Key it per passage so the expanded state and the scroll
 * position carry over from one question of the passage to the next.
 */
export default function PassageCard({ passage }: { passage: Passage }) {
  const [expanded, setExpanded] = useState(false)
  const textRef = useRef<HTMLDivElement>(null)
  const textId = useId()
  const Chevron = expanded ? ChevronUp : ChevronDown

  function toggle() {
    if (expanded && textRef.current) textRef.current.scrollTop = 0
    setExpanded((v) => !v)
  }

  return (
    <section className={expanded ? 'passage passage--open glass' : 'passage passage--clamped glass'}>
      {passage.title && <h2 className="passage__title">{passage.title}</h2>}
      <div
        ref={textRef}
        id={textId}
        className="passage__text"
        tabIndex={expanded ? 0 : undefined}
        role={expanded ? 'region' : undefined}
        aria-label={expanded ? (passage.title ?? 'Bài đọc') : undefined}
      >
        {passage.text.split(/\n{2,}/).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <button type="button" className="passage__toggle" aria-expanded={expanded} aria-controls={textId} onClick={toggle}>
        <Chevron size={18} strokeWidth={2.25} aria-hidden="true" />
        {expanded ? 'Thu gọn' : 'Đọc cả bài'}
      </button>
    </section>
  )
}
