import { ArrowLeft } from 'lucide-react'
import { SessionFooter } from '../../../components/quiz/SessionShell.tsx'

/** Bottom bar of a read-only review: one button back to the summary. */
export default function ReviewFooter({ onBack }: { onBack: () => void }) {
  return (
    <SessionFooter>
      <button type="button" className="btn btn--primary" onClick={onBack}>
        <ArrowLeft size={20} aria-hidden="true" />
        Quay lại
      </button>
    </SessionFooter>
  )
}
