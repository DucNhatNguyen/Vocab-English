import { Play, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '../../app/paths.ts'
import PageHeader from '../../components/PageHeader.tsx'
import type { Word } from '../../data/types.ts'
import { isCustomWordId } from '../../db/words.ts'

/** "Bạn đã học hết ..." with a way to pick more decks. Shared by the start and summary screens. */
export function NothingLeft() {
  return (
    <div className="empty">
      <p className="empty__title">Bạn đã học hết từ trong các bộ đang chọn</p>
      <Link to={paths.decks} className="btn btn--primary">
        <Plus size={20} aria-hidden="true" />
        Chọn thêm bộ từ
      </Link>
    </div>
  )
}

interface LessonStartProps {
  /** Words of the next lesson; undefined while loading. */
  words: readonly Word[] | undefined
  dailyGoal: number
  onStart: () => void
}

function describeSources(words: readonly Word[]): string {
  const mine = words.filter((w) => isCustomWordId(w.id)).length
  const parts = []
  if (mine > 0) parts.push(`${mine} từ của tôi`)
  if (words.length > mine) parts.push(`${words.length - mine} từ trong các bộ đang chọn`)
  return parts.join(', ')
}

export default function LessonStart({ words, dailyGoal, onStart }: LessonStartProps) {
  return (
    <>
      <PageHeader title="Học từ mới" />
      <div className="page">
        {words === undefined ? null : words.length === 0 ? (
          <NothingLeft />
        ) : (
          <>
            <section className="lesson-start__hero">
              <p className="lesson-start__count">
                <span className="lesson-start__num">{words.length}</span>
                <span className="lesson-start__unit">từ mới</span>
              </p>
              <p className="lesson-start__sub">{describeSources(words)}</p>
              {words.length < dailyGoal && (
                <p className="lesson-start__sub">
                  Chỉ còn {words.length} từ chưa học (mục tiêu mỗi ngày: {dailyGoal} từ).
                </p>
              )}
            </section>

            <ol className="sheet ruled steps">
              <li>
                <div>
                  <strong>Xem thẻ</strong>
                  <span>Nghe, đọc nghĩa và xem ví dụ</span>
                </div>
              </li>
              <li>
                <div>
                  <strong>Kiểm tra nhanh</strong>
                  <span>Chọn nghĩa đúng cho mỗi từ</span>
                </div>
              </li>
            </ol>

            <button type="button" className="btn btn--primary lesson-start__go" onClick={onStart}>
              <Play size={20} aria-hidden="true" />
              Bắt đầu
            </button>
          </>
        )}
      </div>
    </>
  )
}
