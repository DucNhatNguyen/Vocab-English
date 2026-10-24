import { CalendarCheck, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '../../app/paths.ts'
import LevelTicks from '../../components/LevelTicks.tsx'
import PageHeader from '../../components/PageHeader.tsx'
import WordRow from '../../components/WordRow.tsx'
import type { Word } from '../../data/types.ts'

interface LessonSummaryProps {
  words: readonly Word[]
  /** Whether another lesson is available (live from the database). */
  hasMore: boolean
  onMore: () => void
}

/** Result of a finished lesson: what was learned, when the first review is, what next. */
export default function LessonSummary({ words, hasMore, onMore }: LessonSummaryProps) {
  return (
    <>
      <PageHeader title="Hoàn thành bài học" />
      <div className="page">
        <section className="summary__hero">
          <p className="summary__count">
            <span className="summary__num">{words.length}</span>
            <span className="summary__unit">từ mới đã vào sổ</span>
          </p>
          <p className="summary__next">
            <CalendarCheck size={20} aria-hidden="true" />
            <span>
              Ôn tập lần đầu: <strong>ngày mai</strong>
            </span>
          </p>
        </section>

        <div className="summary__actions">
          {hasMore && (
            <button type="button" className="btn btn--primary" onClick={onMore}>
              <Plus size={20} aria-hidden="true" />
              Học thêm
            </button>
          )}
          <Link to={paths.home} className={hasMore ? 'btn btn--ghost' : 'btn btn--primary'}>
            Về trang chủ
          </Link>
        </div>
        {!hasMore && (
          <p className="hint muted">
            Bạn đã học hết từ trong các bộ đang chọn.{' '}
            <Link to={paths.decks} className="text-link">
              Chọn thêm bộ từ
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
