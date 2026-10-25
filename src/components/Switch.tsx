import type { ReactNode } from 'react'

interface SwitchProps {
  label: string
  /** Secondary text under the label (also part of the accessible name). */
  description?: ReactNode
  /** Decorative badge before the label, e.g. an `IconBadge`. */
  leading?: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

/** A labelled on/off row; the whole row is the touch target. */
export default function Switch({ label, description, leading, checked, onChange, disabled }: SwitchProps) {
  return (
    <label className="switch-row">
      {leading}
      <span className="switch-row__text">
        <span className="switch-row__label">{label}</span>
        {description && <span className="switch-row__desc">{description}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}
