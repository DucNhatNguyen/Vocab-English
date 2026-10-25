import { ClipboardList, PencilLine, type LucideIcon } from 'lucide-react'
import { m } from 'motion/react'
import { Link, useLocation } from 'react-router'
import { paths } from './paths.ts'
import { activeTab, type TabId } from './tabs.ts'

interface Tab {
  id: TabId
  to: string
  label: string
  icon: LucideIcon
}

const TABS: readonly Tab[] = [
  { id: 'words', to: paths.home, label: 'Từ của tôi', icon: PencilLine },
  { id: 'exercises', to: paths.exercises, label: 'Bài tập', icon: ClipboardList },
]

/** The active tile glides between tabs (shared layout) instead of jumping. */
const TILE_SPRING = { type: 'spring', stiffness: 500, damping: 40 } as const

export default function TabBar() {
  const { pathname } = useLocation()
  const current = activeTab(pathname)
  return (
    <nav className="tabbar" aria-label="Điều hướng chính">
      {TABS.map((tab) => {
        const active = tab.id === current
        return (
          <Link
            key={tab.id}
            to={tab.to}
            className="tabbar__item"
            aria-current={active ? 'page' : undefined}
          >
            {active && (
              <m.span
                layoutId="tabbar-tile"
                className="tabbar__tile"
                transition={TILE_SPRING}
                aria-hidden="true"
              />
            )}
            <tab.icon size={22} strokeWidth={active ? 2.25 : 2} aria-hidden="true" />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
