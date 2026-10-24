import { Square, SquareCheckBig } from 'lucide-react'

interface ReviewTickProps {
  /** True while the word is included in review (not ignored). */
  ticked: boolean
  onToggle: () => void
}

/** The notebook's "ôn tập" tick: untick = leave the word out of review, keeping its level. */
export default function ReviewTick({ ticked, onToggle }: ReviewTickProps) {
  const Icon = ticked ? SquareCheckBig : Square
  return (
    <button
      type="button"
      className="icon-btn review-tick"
      aria-label={ticked ? 'Bỏ tick ôn tập' : 'Tick lại để ôn tập'}
      onClick={onToggle}
    >
      <Icon size={24} aria-hidden="true" />
    </button>
  )
}
