import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type State = 'idle' | 'copied' | 'manual'

/**
 * "Sao chép liên kết": Clipboard API first. If the browser refuses (embedded browsers often do),
 * the link is shown in a selected text field so it can be copied by hand.
 */
export default function CopyLink({ url }: { url: string }) {
  const [state, setState] = useState<State>('idle')
  const field = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state !== 'manual') return
    field.current?.focus()
    field.current?.select()
  }, [state])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setState('copied')
    } catch {
      setState('manual')
    }
  }

  return (
    <div className="copy-link">
      <button type="button" className="btn btn--ghost copy-link__btn" onClick={() => void copy()}>
        {state === 'copied' ? <Check size={20} aria-hidden="true" /> : <Copy size={20} aria-hidden="true" />}
        {state === 'copied' ? 'Đã sao chép' : 'Sao chép liên kết'}
      </button>
      <p className="visually-hidden" role="status">
        {state === 'copied' ? 'Đã sao chép liên kết' : ''}
      </p>
      {state === 'manual' && (
        <>
          <input
            ref={field}
            className="input copy-link__field"
            readOnly
            value={url}
            aria-label="Liên kết của Từ Ngày"
            onFocus={(event) => event.currentTarget.select()}
          />
          <p className="copy-link__hint">Chưa sao chép được. Hãy giữ ngón tay vào ô trên và chọn Sao chép.</p>
        </>
      )}
    </div>
  )
}
