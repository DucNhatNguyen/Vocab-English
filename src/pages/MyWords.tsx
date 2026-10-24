import { Plus, Search as SearchIcon, X } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useCustomWords, useProgressMap } from '../app/hooks.ts'
import { paths } from '../app/paths.ts'
import LevelTicks from '../components/LevelTicks.tsx'
import PageHeader from '../components/PageHeader.tsx'
import WordRow from '../components/WordRow.tsx'
import { isLearned } from '../db/progress.ts'
import { searchWords } from '../lib/search.ts'

/** "Từ của tôi": the user's own words, newest first. */
export default function MyWords() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const inputRef = useRef<HTMLInputElement>(null)
  const customWords = useCustomWords()
  const progress = useProgressMap()

  // Empty query lists everything (already newest first); otherwise ranked search results
  const shown = useMemo(
    () => (query.trim() === '' ? customWords : searchWords(query, customWords)),
    [query, customWords],
  )

  function setQuery(value: string) {
    // replace: typing should not fill the history stack
    setParams(value ? { q: value } : {}, { replace: true })
  }

  const addButton = (
    <Link to={paths.myWordNew()} className="btn btn--primary my-words__add">
      <Plus size={20} aria-hidden="true" />
      Thêm từ
    </Link>
  )

  return (
    <>
      <PageHeader title="Từ của tôi" backTo={paths.home} />
      <div className="page">
        {customWords.length === 0 ? (
          <div className="empty">
            <p className="empty__title">Chưa có từ nào trong Từ của tôi</p>
            <p className="muted empty__text">
              Tự thêm những từ bạn muốn học: gõ từ tiếng Anh, app gợi ý phiên âm và ví dụ, bạn chỉ
              cần nhập nghĩa tiếng Việt. Từ của tôi được ưu tiên trong bài học mới và ôn lại theo
              5 cấp độ nhớ giống mọi từ khác.
            </p>
            {addButton}
          </div>
        ) : (
          <>
            {addButton}
            <div className="searchbox my-words__search">
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
                placeholder="Tìm trong Từ của tôi"
                aria-label="Tìm trong Từ của tôi"
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

            {shown.length === 0 ? (
              <div className="empty">
                <p className="empty__title">Không tìm thấy từ nào</p>
              </div>
            ) : (
              <>
                <p className="muted hint" aria-live="polite">
                  {shown.length} từ
                </p>
                <ul className="sheet ruled">
                  {shown.map((word) => {
                    const entry = progress.get(word.id)
                    return (
                      <li key={word.id}>
                        <WordRow
                          word={word}
                          trailing={
                            isLearned(entry) ? (
                              <LevelTicks level={entry?.level ?? 0} size={14} />
                            ) : (
                              <span className="my-words__unlearned">Chưa học</span>
                            )
                          }
                        />
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
