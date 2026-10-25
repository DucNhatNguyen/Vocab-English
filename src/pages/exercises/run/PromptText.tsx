import { parsePrompt } from '../../../lib/exercisePassage.ts'

interface PromptTextProps {
  number: number
  prompt: string
}

/**
 * The question text: the number in the accent colour, "___" drawn as a gap line, and dialogue
 * turns (separated by line breaks in the data) on their own lines.
 */
export default function PromptText({ number, prompt }: PromptTextProps) {
  const lines = parsePrompt(prompt)
  return (
    <p className="ex-question">
      {lines.map((parts, i) => (
        <span key={i} className="ex-line">
          {i === 0 && <span className="ex-question__num">{number}. </span>}
          {parts.map((part, j) =>
            part.kind === 'gap' ? (
              <span key={j} className="gap" role="img" aria-label="chỗ trống">
                {' '}
              </span>
            ) : (
              part.text
            ),
          )}
        </span>
      ))}
    </p>
  )
}
