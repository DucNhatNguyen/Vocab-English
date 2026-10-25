import { CalendarCheck, PartyPopper, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '../../app/paths.ts'
import IconBadge from '../../components/IconBadge.tsx'
import LevelTicks from '../../components/LevelTicks.tsx'
import PageHeader from '../../components/PageHeader.tsx'
import WordRow from '../../components/WordRow.tsx'
import type { Word } from '../../data/types.ts'

interface LessonSummaryProps {
  words: readonly Word[]
  /** Whether another lesson is available (live from the database). */
  hasMore: boolean
  /** How many words the next lesson would have. */
  nextCount: number
  /** Tự học: own words only, so the exits go back to the Tự học tab. */
  mine: boolean
  onMore: () => void
}

/** Result of a finished lesson: what was learned, when the first review is, what next. */
export default function LessonSummary({ words, hasMore, nextCount, mine, onMore }: LessonSummaryProps) {
  return (
    <>
      <PageHeader title="Hoàn thành bài học" />
      <div className="page">
        <section className="summary__hero glass">
          <IconBadge icon={PartyPopper} hue="green" size="lg" />
          <p className="summary__count">
            <span className="summary__num">{words.length}</span>
            <span className="summary__unit">từ mới đã vào sổ</span>
          </p>
          <p className="summary__next">
            <IconBadge icon={CalendarCheck} hue="blue" size="sm" />
            <span>
              Ôn tập lần đầu: <strong>ngày mai</strong>
            </span>
          </p>
        </section>

        <div className="summary__actions">
          {hasMore && (
            <button type="button" className="btn btn--primary" onClick={onMore}>
              <Plus size={20} aria-hidden="true" />
              {mine ? `Học tiếp ${nextCount} từ` : 'Học thêm'}
            </button>
          )}
          <Link
            to={mine ? paths.selfStudy : paths.home}
            className={hasMore ? 'btn btn--ghost' : 'btn btn--primary'}
          >
            {mine ? 'Về Tự học' : 'Về trang chủ'}
          </Link>
        </div>
        {!hasMore && (
          <p className="hint muted">
            {mine ? 'Bạn đã học hết từ của mình.' : 'Bạn đã học hết từ trong các bộ đang chọn.'}{' '}
            <Link to={mine ? paths.myWordNew() : paths.decks} className="text-link">
              {mine ? 'Thêm từ mới' : 'Chọn thêm bộ từ'}
            </Link>
          </p>
        )}

        <ul className="sheet ruled">
          {words.map((word) => (
            <li key={word.id}>
              <WordRow word={word} trailing={<LevelTicks level={1} size={16} />} />
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
