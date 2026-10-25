import { Search as SearchIcon, SearchX, X } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router'
import IconBadge from '../../components/IconBadge.tsx'
import LevelTicks from '../../components/LevelTicks.tsx'
import WordRow from '../../components/WordRow.tsx'
import { isLearned } from '../../db/progress.ts'
import type { CardProgress, CustomWord } from '../../db/types.ts'
import { searchWords } from '../../lib/search.ts'

interface MyWordListProps {
  /** The user's own words, newest first. */
  words: readonly CustomWord[]
  progress: ReadonlyMap<string, CardProgress>
}

/** Search box plus the list of the user's own words (shown on the Tự học tab). */
export default function MyWordList({ words, progress }: MyWordListProps) {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const inputRef = useRef<HTMLInputElement>(null)

  // Empty query lists everything (already newest first); otherwise ranked search results
  const shown = useMemo(
    () => (query.trim() === '' ? words : searchWords(query, words)),
    [query, words],
  )

  function setQuery(value: string) {
    // replace: typing should not fill the history stack
    setParams(value ? { q: value } : {}, { replace: true })
  }

  return (
    <>
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
          <IconBadge icon={SearchX} hue="pink" size="lg" />
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
  )
}
