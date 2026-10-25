import { Lightbulb } from 'lucide-react'
import type { ReactNode } from 'react'
import IconBadge from '../../../components/IconBadge.tsx'

interface ExplainCardProps {
  text: string
  /** Extra lines under the explanation: why the picked option is wrong, other accepted answers. */
  children?: ReactNode
}

/** The "Giải thích" card shown under an answered question. */
export default function ExplainCard({ text, children }: ExplainCardProps) {
  return (
    <section className="explain glass">
      <h2 className="explain__head">
        <IconBadge icon={Lightbulb} hue="blue" size="sm" />
        Giải thích
      </h2>
      <p className="explain__text">{text}</p>
      {children}
    </section>
  )
}
