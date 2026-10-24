import { useEffect, useId, useRef } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  /** Button that keeps the user where they are (the safe default, shown first). */
  cancelLabel: string
  /** Button that goes ahead with the action. */
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}

/** Modal confirmation on the native <dialog>: focus trap, Esc and backdrop come for free. */
export default function ConfirmDialog({
  open,
  title,
  message,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Esc: let React state decide, so the dialog never gets out of sync
        event.preventDefault()
        onCancel()
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the <dialog> element itself
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <h2 id={titleId} className="dialog__title">
        {title}
      </h2>
      <p className="dialog__message">{message}</p>
      <div className="dialog__actions">
        <button type="button" className="btn btn--primary" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
