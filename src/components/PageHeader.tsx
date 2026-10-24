import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'

interface PageHeaderProps {
  title: string
  /** Shows a back button. Used as the destination when there is no in-app history (deep link). */
  backTo?: string
  /** Right-aligned controls (44px icon buttons). */
  actions?: ReactNode
}

/** Sticky top bar; sub-pages pass `backTo` to get a back button. */
export default function PageHeader({ title, backTo, actions }: PageHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()

  function goBack() {
    // 'default' = first entry of this session, so there is nothing to go back to
    if (location.key !== 'default') void navigate(-1)
    else if (backTo) void navigate(backTo, { replace: true })
  }

  return (
    <header className="topbar">
      {backTo !== undefined && (
        <button type="button" className="icon-btn" aria-label="Quay lại" onClick={goBack}>
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
      )}
      <h1 className="topbar__title">{title}</h1>
      {actions}
    </header>
  )
}
