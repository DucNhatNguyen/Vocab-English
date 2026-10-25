import { CheckCheck, Play, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '../../app/paths.ts'
import IconBadge from '../../components/IconBadge.tsx'
import PageHeader from '../../components/PageHeader.tsx'
import type { Word } from '../../data/types.ts'

/** "Bạn đã học hết từ của mình" with a way to add more. Shared by the start screen. */
export function NothingLeft() {
  return (
    <div className="empty">
      <IconBadge icon={CheckCheck} hue="green" size="lg" />
      <p className="empty__title">Bạn đã học hết từ của mình</p>
      <Link to={paths.myWordNew()} className="btn btn--primary">
        <Plus size={20} aria-hidden="true" />
        Thêm từ mới
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

export default function LessonStart({ words, dailyGoal, onStart }: LessonStartProps) {
  return (
    <>
      <PageHeader title="Học từ mới" />
      <div className="page">
        {words === undefined ? null : words.length === 0 ? (
          <NothingLeft />
        ) : (
          <>
            <section className="lesson-start__hero glass">
              <p className="lesson-start__count">
                <span className="lesson-start__num">{words.length}</span>
                <span className="lesson-start__unit">từ mới</span>
              </p>
              <p className="lesson-start__sub">Từ bạn tự nhập, cũ trước mới sau.</p>
              {words.length < dailyGoal && (
                <p className="lesson-start__sub">Chỉ còn {words.length} từ của bạn chưa học.</p>
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
