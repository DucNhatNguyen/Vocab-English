import { useId } from 'react'

export interface SegmentedOption<T extends string | number> {
  value: T
  label: string
}

interface SegmentedProps<T extends string | number> {
  /** Id of the element that labels the group. */
  labelledBy: string
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
}

/** Single-choice control built on real radio inputs: arrow keys, labels and focus come native. */
export default function Segmented<T extends string | number>({
  labelledBy,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  const name = useId()
  return (
    <div className="segmented" role="radiogroup" aria-labelledby={labelledBy}>
      {options.map((option) => (
        <label key={option.value} className="segmented__item">
          <input
            type="radio"
            className="segmented__input"
            name={name}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          <span className="segmented__label">{option.label}</span>
        </label>
      ))}
    </div>
  )
}
