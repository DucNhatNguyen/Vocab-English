import { Heart, NotebookPen, Search as SearchIcon, SearchX, X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'
import { paths } from '../app/paths.ts'
import IconBadge from '../components/IconBadge.tsx'
import LevelTicks from '../components/LevelTicks.tsx'
import PageHeader from '../components/PageHeader.tsx'
import ReviewTick from '../components/ReviewTick.tsx'
import WordRow from '../components/WordRow.tsx'
import { loadNotebookEntries } from '../db/notebook.ts'
import { setIgnored, toggleFavorite } from '../db/progress.ts'
import { today } from '../lib/date.ts'
import {
  buildNotebook,
  filterToParam,
  NOTEBOOK_LEVELS,
  parseFilter,
  reviewStatusLabel,
  type NotebookEntry,
  type NotebookFilter,
} from '../lib/notebook.ts'
import { MAX_LEVEL } from '../lib/srs.ts'

interface FilterChip {
  filter: NotebookFilter
  label: string
  count: number
}

export default function Notebook() {
  const [params, setParams] = useSearchParams()
  const filter = parseFilter(params.get('f'))
  const query = params.get('q') ?? ''
  const chipsRef = useRef<HTMLDivElement>(null)
  const entries = useLiveQuery(loadNotebookEntries, [])
  const loaded = entries !== undefined

  const view = useMemo(() => buildNotebook(entries ?? [], filter, query), [entries, filter, query])

  // Bring the selected chip into view (e.g. "Yêu thích" after coming back with ?f=favorites)
  useEffect(() => {
    const box = chipsRef.current
    const chip = box?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!box || !chip) return
    box.scrollLeft = chip.offsetLeft - (box.clientWidth - chip.offsetWidth) / 2
  }, [filter, loaded])

  // Loading: render only the shell so the empty state does not flash
  if (entries === undefined) return <PageHeader title="Sổ tay" />

  const { counts } = view
  const chips: FilterChip[] = [
    { filter: 'all', label: 'Tất cả', count: counts.all },
    ...NOTEBOOK_LEVELS.map((level) => ({
      filter: level,
      label: `Cấp ${level}`,
      count: counts.levels[level],
    })),
    { filter: 'favorites', label: 'Yêu thích', count: counts.favorites },
  ]

  function update(next: { filter?: NotebookFilter; query?: string }) {
    const f = filterToParam(next.filter ?? filter)
    const q = next.query ?? query
    const p = new URLSearchParams()
    if (f) p.set('f', f)
    if (q) p.set('q', q)
    // replace: filtering and typing should not fill the history stack
    setParams(p, { replace: true })
  }

  const notebookEmpty = counts.all === 0 && filter !== 'favorites'
  const showControls = entries.length > 0
  const todayDate = today()

  return (
    <>
      <PageHeader title="Sổ tay" />
      <div className="page">
        {showControls && (
          <>
            <p className="deck-summary">
              <strong>{counts.all}</strong> từ đã học · <strong>{counts.levels[MAX_LEVEL]}</strong> từ
              đã thuộc (cấp 5)
            </p>

            <div className="searchbox">
              <SearchIcon size={20} className="searchbox__icon" aria-hidden="true" />
              <input
                className="searchbox__input"
                type="text"
                inputMode="search"
                enterKeyHint="search"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="off"
                placeholder="Tìm trong sổ tay"
                aria-label="Tìm trong sổ tay"
                value={query}
                onChange={(e) => update({ query: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur() // close the keyboard
                }}
              />
              {query && (
                <button
                  type="button"
                  className="icon-btn searchbox__clear"
                  aria-label="Xoá nội dung tìm kiếm"
                  onClick={() => update({ query: '' })}
                >
                  <X size={20} aria-hidden="true" />
                </button>
              )}
            </div>

            <div ref={chipsRef} className="filter-chips" role="group" aria-label="Lọc theo cấp">
              {chips.map((chip) => (
                <button
                  key={chip.filter}
                  type="button"
                  className="filter-chip"
                  aria-pressed={chip.filter === filter}
                  onClick={() => update({ filter: chip.filter })}
                >
                  {chip.label}
                  <span className="filter-chip__count">{chip.count}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {view.items.length === 0 &&
          (notebookEmpty ? (
            <div className="empty">
              <IconBadge icon={NotebookPen} hue="violet" size="lg" />
              <p className="empty__title">Sổ tay còn trống</p>
              <p className="muted">Học vài từ mới, chúng sẽ được ghi vào đây.</p>
              <Link to={paths.learn} className="btn btn--primary">
                Học từ mới
              </Link>
            </div>
          ) : (
            <div className="empty">
              <IconBadge icon={SearchX} hue="pink" size="lg" />
              <p className="empty__title">Không có từ nào phù hợp</p>
            </div>
          ))}

        {view.items.length > 0 && (
          <ul className="sheet ruled notebook-list">
            {view.items.map((entry) => (
              <NotebookRow key={entry.word.id} entry={entry} todayDate={todayDate} />
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function NotebookRow({ entry, todayDate }: { entry: NotebookEntry; todayDate: string }) {
  const { word, progress } = entry
  const learned = progress.level >= 1
  const status = reviewStatusLabel(progress, todayDate)

  return (
    <li className={progress.ignored && learned ? 'notebook-row notebook-row--off' : 'notebook-row'}>
      {learned ? (
        <ReviewTick
          ticked={!progress.ignored}
          onToggle={() => void setIgnored(word.id, !progress.ignored)}
        />
      ) : (
        <span className="notebook-row__spacer" aria-hidden="true" />
      )}
      <WordRow
        word={word}
        showChevron={false}
        badge={
          <span className="notebook-row__meta">
            {learned ? <LevelTicks level={progress.level} size={14} /> : <span>Chưa học</span>}
            {status && <span className="notebook-row__status">{status}</span>}
          </span>
        }
      />
      <button
        type="button"
        className={progress.favorite ? 'icon-btn icon-btn--on' : 'icon-btn'}
        aria-label={progress.favorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
        onClick={() => void toggleFavorite(word.id)}
      >
        <Heart size={22} fill={progress.favorite ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
    </li>
  )
}
