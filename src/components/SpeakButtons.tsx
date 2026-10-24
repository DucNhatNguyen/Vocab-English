import { Snail, Volume2 } from 'lucide-react'
import { isSpeechSupported, speak } from '../lib/speech.ts'

interface SpeakButtonsProps {
  text: string
  /** Icon-only round buttons (for tight spots such as list rows). */
  compact?: boolean
  className?: string
}

/** Normal and slow pronunciation buttons. Voice and rate come from the user's settings. */
export default function SpeakButtons({ text, compact = false, className }: SpeakButtonsProps) {
  const disabled = !isSpeechSupported()
  const classes = ['speak', compact ? 'speak--compact' : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      <button
        type="button"
        className="btn btn--primary speak__btn"
        aria-label="Phát âm"
        disabled={disabled}
        onClick={() => speak(text)}
      >
        <Volume2 size={20} aria-hidden="true" />
        {!compact && <span>Phát âm</span>}
      </button>
      <button
        type="button"
        className="btn btn--ghost speak__btn"
        aria-label="Phát âm chậm"
        disabled={disabled}
        onClick={() => speak(text, { slow: true })}
      >
        <Snail size={20} aria-hidden="true" />
        {!compact && <span>Chậm</span>}
      </button>
    </div>
  )
}
