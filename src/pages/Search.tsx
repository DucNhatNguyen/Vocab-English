import { Plus, Search as SearchIcon, SearchX, X } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useCustomWords } from '../app/hooks.ts'
import { paths } from '../app/paths.ts'
import IconBadge from '../components/IconBadge.tsx'
import PageHeader from '../components/PageHeader.tsx'
import WordRow from '../components/WordRow.tsx'
import { CUSTOM_WORD_ID_PREFIX } from '../db/customWords.ts'
import { normalizeText, searchWords } from '../lib/search.ts'

export default function Search() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const inputRef = useRef<HTMLInputElement>(null)
  const customWords = useCustomWords()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = useMemo(() => searchWords(query, customWords), [query, customWords])
  const normalizedQuery = normalizeText(query)
  const hasQuery = normalizedQuery !== ''
  // Offer to add the typed word unless that exact headword is already listed
  const canAdd = hasQuery && !results.some((w) => normalizeText(w.word) === normalizedQuery)
  const addLink = (primary: boolean) => (
    <Link
      to={paths.myWordNew(query.trim())}
      className={primary ? 'btn btn--primary add-word' : 'btn btn--ghost add-word'}
    >
      <Plus size={20} aria-hidden="true" />
      <span>{`Thêm '${query.trim()}' vào Từ của tôi`}</span>
    </Link>
  )

  function setQuery(value: string) {
    // replace: typing should not fill the history stack
    setParams(value ? { q: value } : {}, { replace: true })
  }

  return (
    <>
      <PageHeader title="Tìm kiếm" backTo={paths.home} />
      <div className="page">
        <div className="searchbox">
          <SearchIcon size={20} className="searchbox__icon" aria-hidden="true" />
          <input
            ref={inputRef}
            className="searchbox__input"
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            placeholder="Tiếng Anh hoặc tiếng Việt"
            aria-label="Tìm từ"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur() // close the keyboard
            }}
          />
          {query && (
            <button
              type="button"
              className="icon-btn searchbox__clear"
              aria-label="Xoá nội dung tìm kiếm"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
            >
              <X size={20} aria-hidden="true" />
            </button>
          )}
        </div>

        {!hasQuery && <p className="muted hint">Gõ tiếng Anh hoặc tiếng Việt, không cần gõ dấu.</p>}

        {hasQuery && results.length === 0 && (
          <div className="empty">
            <IconBadge icon={SearchX} hue="pink" size="lg" />
            <p className="empty__title">Không tìm thấy từ nào</p>
            {addLink(true)}
          </div>
        )}

        {results.length > 0 && (
          <>
            <p className="muted hint" aria-live="polite">
              {results.length} kết quả
            </p>
            {canAdd && addLink(false)}
            <ul className="sheet ruled">
              {results.map((word) => (
                <li key={word.id}>
                  <WordRow
                    word={word}
                    badge={
                      word.id.startsWith(CUSTOM_WORD_ID_PREFIX) ? (
                        <span className="chip chip--mine">Từ của tôi</span>
                      ) : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  )
}
