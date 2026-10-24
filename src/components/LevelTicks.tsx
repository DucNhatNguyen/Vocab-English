import { Check } from 'lucide-react'

interface LevelTicksProps {
  /** Memory level 1-5; anything lower renders nothing. */
  level: number
  size?: number
  className?: string
}

/** Memory level as 1-5 red-pen ticks (spec 8.1). */
export default function LevelTicks({ level, size = 16, className }: LevelTicksProps) {
  const count = Math.max(0, Math.min(5, Math.floor(level)))
  if (count === 0) return null
  return (
    <span
      className={className ? `ticks ${className}` : 'ticks'}
      role="img"
      aria-label={`Cấp ${count}/5`}
    >
      {Array.from({ length: count }, (_, i) => (
        <Check key={i} size={size} strokeWidth={3} aria-hidden="true" />
      ))}
    </span>
  )
}
