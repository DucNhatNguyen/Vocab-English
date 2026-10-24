import { BookOpen, GraduationCap, House, NotebookPen, Settings, type LucideIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { paths } from './paths.ts'

interface Tab {
  to: string
  label: string
  icon: LucideIcon
  /** Path prefixes (besides `to`) that keep this tab highlighted. */
  alsoActiveFor?: readonly string[]
}

const TABS: readonly Tab[] = [
  {
    to: paths.home,
    label: 'Trang chủ',
    icon: House,
    // Decks, word details and search are reached from Home
    alsoActiveFor: [paths.decks, '/words', paths.search],
  },
  { to: paths.learn, label: 'Học', icon: GraduationCap },
  { to: paths.review, label: 'Ôn tập', icon: BookOpen },
  { to: paths.notebook, label: 'Sổ tay', icon: NotebookPen },
  { to: paths.settings, label: 'Cài đặt', icon: Settings },
]

function isActive(tab: Tab, pathname: string): boolean {
  if (tab.to === paths.home && pathname === paths.home) return true
  if (tab.to !== paths.home && (pathname === tab.to || pathname.startsWith(`${tab.to}/`))) {
    return true
  }
  return (tab.alsoActiveFor ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export default function TabBar() {
  const { pathname } = useLocation()
  return (
    <nav className="tabbar" aria-label="Điều hướng chính">
      {TABS.map((tab) => {
        const active = isActive(tab, pathname)
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className="tabbar__item"
            aria-current={active ? 'page' : undefined}
          >
            <tab.icon size={22} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
