import type { LucideIcon } from 'lucide-react'

export type BadgeHue = 'blue' | 'violet' | 'pink' | 'orange' | 'green'

interface IconBadgeProps {
  icon: LucideIcon
  hue?: BadgeHue
  /** sm 36px, md 40px (default), lg 56px (empty states, summaries). */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const ICON_SIZE = { sm: 20, md: 22, lg: 28 } as const

/** Decorative pastel rounded square with a lucide icon in the hue's saturated colour. */
export default function IconBadge({ icon: Icon, hue = 'blue', size = 'md', className }: IconBadgeProps) {
  const classes = ['icon-badge', `icon-badge--${hue}`]
  if (size !== 'md') classes.push(`icon-badge--${size}`)
  if (className) classes.push(className)
  return (
    <span className={classes.join(' ')} aria-hidden="true">
      <Icon size={ICON_SIZE[size]} strokeWidth={2.25} aria-hidden="true" />
    </span>
  )
}
