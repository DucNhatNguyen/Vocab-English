import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { RowStatus } from '../../lib/exerciseLabels.ts'

/** Right-hand side of a row: a score with a caption, or a pill. */
export function StatusCell({ status }: { status: RowStatus }) {
  if ('label' in status) {
    return <span className={status.tone === 'new' ? 'ex-status ex-status--new' : 'ex-status'}>{status.label}</span>
  }
  return (
    <span className={status.tone === 'doing' ? 'ex-row__score ex-row__score--doing' : 'ex-row__score'}>
      <strong>{status.main}</strong>
      {status.caption && <span>{status.caption}</span>}
    </span>
  )
}

interface ExerciseRowProps {
  to: string
  /** Number tile or icon badge. */
  lead: ReactNode
  name: string
  meta: string
  status: RowStatus
}

/** One tappable row of the Bài tập list or the set detail. */
export default function ExerciseRow({ to, lead, name, meta, status }: ExerciseRowProps) {
  return (
    <Link to={to} className="ex-row">
      {lead}
      <span className="ex-row__main">
        <span className="ex-row__name">{name}</span>
        <span className="ex-row__meta">{meta}</span>
      </span>
      <StatusCell status={status} />
      <ChevronRight size={18} aria-hidden="true" />
    </Link>
  )
}
