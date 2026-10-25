import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { useId, useState } from 'react'
import IconBadge from '../../../components/IconBadge.tsx'

interface ExamplesCardProps {
  examples: readonly string[]
  /** Open when it first appears (the start of a section); it keeps what the user chose after that. */
  initiallyOpen: boolean
}

/** Worked examples of a Writing Practice section, collapsible. Key it per section. */
export default function ExamplesCard({ examples, initiallyOpen }: ExamplesCardProps) {
  const [open, setOpen] = useState(initiallyOpen)
  const listId = useId()
  const Chevron = open ? ChevronUp : ChevronDown

  return (
    <section className="examples glass">
      <button
        type="button"
        className="examples__toggle"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <IconBadge icon={Lightbulb} hue="orange" size="sm" />
        <span className="examples__title">Ví dụ mẫu</span>
        <Chevron size={20} aria-hidden="true" />
      </button>
      <ul id={listId} className="examples__list" hidden={!open}>
        {examples.map((example) => (
          <li key={example}>{example}</li>
        ))}
      </ul>
    </section>
  )
}
