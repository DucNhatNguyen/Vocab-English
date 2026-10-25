import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Download, ShieldAlert, ShieldCheck, TriangleAlert, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ConfirmDialog from '../../components/ConfirmDialog.tsx'
import IconBadge from '../../components/IconBadge.tsx'
import { exportBackup, restoreBackup } from '../../db/backup.ts'
import {
  backupFileName,
  describeBackupData,
  parseBackup,
  type BackupData,
} from '../../lib/backup.ts'
import { deliverFile, makeBackupFile } from '../../lib/backupDelivery.ts'
import { isStoragePersistent } from '../../lib/storage.ts'

type Notice =
  | { kind: 'success'; text: string }
  | { kind: 'error'; text: string; details?: string[] }

/** How many validation messages to show; the rest is summarised. */
const MAX_SHOWN_ERRORS = 5

/** "Dữ liệu" section: export / import the whole database as a JSON file, and storage protection. */
export default function BackupSection() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [pending, setPending] = useState<BackupData | null>(null)
  // The file is built ahead of the click and kept current by the live query: iOS only allows
  // navigator.share() while the click's user activation is alive, so no await may precede it.
  const prepared = useLiveQuery(async () => makeBackupFile(await exportBackup(), backupFileName()), [])
  const [persisted, setPersisted] = useState<boolean | undefined | null>(null) // null = checking

  useEffect(() => {
    let cancelled = false
    void isStoragePersistent().then((value) => {
      if (!cancelled) setPersisted(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function onExport() {
    if (!prepared) return
    // Start the share synchronously, straight from the click; only then touch state
    const delivery = deliverFile(prepared)
    setBusy(true)
    setNotice(null)
    try {
      const result = await delivery
      if (result === 'shared') setNotice({ kind: 'success', text: `Đã sao lưu: ${prepared.name}.` })
      else if (result === 'downloaded') {
        setNotice({ kind: 'success', text: `Đã tải file ${prepared.name} về máy.` })
      }
      // 'cancelled': the user closed the share sheet; nothing to report
    } catch {
      setNotice({ kind: 'error', text: 'Không tạo được file sao lưu. Hãy thử lại.' })
    } finally {
      setBusy(false)
    }
  }

  async function onFileChosen(file: File | undefined) {
    if (!file) return
    setNotice(null)
    let text: string
    try {
      text = await file.text()
    } catch {
      setNotice({ kind: 'error', text: 'Không đọc được file này. Dữ liệu hiện tại không bị thay đổi.' })
      return
    }
    const result = parseBackup(text)
    if (!result.ok) {
      setNotice({
        kind: 'error',
        text: 'File này không dùng được. Dữ liệu hiện tại không bị thay đổi.',
        details: result.errors,
      })
      return
    }
    setPending(result.data)
  }

  async function onConfirmRestore() {
    const data = pending
    setPending(null)
    if (!data) return
    setBusy(true)
    try {
      await restoreBackup(data)
      setNotice({ kind: 'success', text: `Đã khôi phục ${describeBackupData(data)}.` })
    } catch {
      setNotice({
        kind: 'error',
        text: 'Không khôi phục được. Dữ liệu hiện tại không bị thay đổi.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ul className="sheet ruled">
        <li className="setting setting--buttons">
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy || !prepared}
            onClick={() => void onExport()}
          >
            <Download size={20} aria-hidden="true" />
            {prepared ? 'Sao lưu' : 'Đang chuẩn bị…'}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={20} aria-hidden="true" />
            Khôi phục
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            data-testid="backup-file"
            onChange={(event) => {
              const file = event.target.files?.[0]
              // Reset so choosing the same file twice still fires a change event
              event.target.value = ''
              void onFileChosen(file)
            }}
          />
        </li>
        {persisted !== null && (
          <li className="setting setting--status">
            {persisted ? (
              <>
                <IconBadge icon={ShieldCheck} hue="green" size="sm" />
                <span>Dữ liệu được bảo vệ khỏi bị xoá tự động.</span>
              </>
            ) : (
              <>
                <IconBadge icon={ShieldAlert} hue="orange" size="sm" />
                <span>
                  Trình duyệt có thể xoá dữ liệu nếu lâu không mở app. Hãy sao lưu thường xuyên.
                </span>
              </>
            )}
          </li>
        )}
      </ul>

      {notice?.kind === 'success' && (
        <p className="notice" role="status">
          <Check size={18} aria-hidden="true" />
          <span>{notice.text}</span>
        </p>
      )}
      {notice?.kind === 'error' && (
        <div className="notice notice--error" role="alert">
          <TriangleAlert size={18} aria-hidden="true" />
          <div>
            <p>{notice.text}</p>
            {notice.details && (
              <ul className="notice__list">
                {notice.details.slice(0, MAX_SHOWN_ERRORS).map((message, i) => (
                  <li key={i}>{message}</li>
                ))}
                {notice.details.length > MAX_SHOWN_ERRORS && (
                  <li>… và {notice.details.length - MAX_SHOWN_ERRORS} lỗi khác.</li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        title="Khôi phục từ file sao lưu?"
        message={`File này có ${pending ? describeBackupData(pending) : ''}. Khôi phục sẽ thay thế toàn bộ dữ liệu hiện tại trên máy này. Tiếp tục?`}
        cancelLabel="Giữ dữ liệu hiện tại"
        confirmLabel="Khôi phục"
        danger
        onCancel={() => setPending(null)}
        onConfirm={() => void onConfirmRestore()}
      />
    </>
  )
}
