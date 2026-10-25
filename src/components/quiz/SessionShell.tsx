import { X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import ConfirmDialog from '../ConfirmDialog.tsx'

interface SessionShellProps {
  /** Items done so far and the total, shown as "3/10" and a progress bar. */
  done: number
  total: number
  /** Called after the user confirmed leaving. */
  onExit: () => void
  exitTitle?: string
  exitMessage?: string
  /** Bottom action bar content, e.g. <SessionFooter>. */
  children: ReactNode
}

/**
 * Full-screen frame of a study session (lesson, review): close button with confirmation,
 * progress bar and count on top, scrolling content below. Put a `SessionFooter` inside it.
 */
export default function SessionShell({
  done,
  total,
  onExit,
  exitTitle = 'Thoát bài học?',
  exitMessage = 'Tiến độ bài này sẽ không được lưu.',
  children,
}: SessionShellProps) {
  const [confirming, setConfirming] = useState(false)
  const fraction = total > 0 ? Math.min(1, done / total) : 0

  return (
    <div className="session">
      <header className="session__top">
        <button
          type="button"
          className="icon-btn"
          aria-label="Thoát"
          onClick={() => setConfirming(true)}
        >
          <X size={22} aria-hidden="true" />
        </button>
        <div
          className="session__progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          aria-label="Tiến độ"
        >
          <div className="session__progress-fill" style={{ width: `${fraction * 100}%` }} />
        </div>
        <span className="session__count">
          {done}/{total}
        </span>
      </header>
      {children}
      <ConfirmDialog
        open={confirming}
        title={exitTitle}
        message={exitMessage}
        cancelLabel="Ở lại"
        confirmLabel="Thoát"
        danger
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          onExit()
        }}
      />
    </div>
  )
}

/** Scrolling body of a session screen, leaving room for the fixed `SessionFooter`. */
export function SessionBody({ children }: { children: ReactNode }) {
  return <main className="session__body">{children}</main>
}

/** Fixed bottom action bar (safe-area aware). */
export function SessionFooter({ children }: { children?: ReactNode }) {
  return (
    <div className="session__bar">
      <div className="session__bar-inner">{children}</div>
    </div>
  )
}
