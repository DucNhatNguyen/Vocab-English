import { CalendarClock, CheckCheck, GraduationCap, Play } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '../../app/paths.ts'
import IconBadge from '../../components/IconBadge.tsx'
import LevelTicks from '../../components/LevelTicks.tsx'
import PageHeader from '../../components/PageHeader.tsx'
import { formatDateVi } from '../../lib/date.ts'
import { REVIEW_ROUND_SIZE, type ReviewOverview } from '../../lib/review.ts'

interface ReviewStartProps {
  /** Undefined while loading. */
  overview: ReviewOverview | undefined
  today: string
  onStart: () => void
}

/** "Lượt ôn tiếp theo: <ngày>, X từ" or a pointer to learning when there is nothing to schedule. */
function EmptyState({ overview, today }: { overview: ReviewOverview; today: string }) {
  const { next, learnedCount } = overview
  return (
    <>
      <section className="review-empty glass">
        <IconBadge icon={CheckCheck} hue="green" size="lg" />
        <h2 className="review-empty__title">Chưa có từ nào cần ôn</h2>
        {next ? (
          <p className="review-empty__next">
            <IconBadge icon={CalendarClock} hue="blue" size="sm" />
            <span>
              Lượt ôn tiếp theo:{' '}
              <strong>
                {formatDateVi(next.date, today)}, {next.count} từ
              </strong>
            </span>
          </p>
        ) : (
          <p className="review-empty__text">
            {learnedCount === 0
              ? 'Bạn chưa học từ nào của mình. Học trước rồi quay lại ôn nhé.'
              : 'Các từ đã học đang được bỏ tick trong Sổ tay nên không có lượt ôn nào.'}
          </p>
        )}
      </section>
      <div className="review-empty__actions">
        <Link to={paths.learn} className={next ? 'btn btn--ghost' : 'btn btn--primary'}>
          <GraduationCap size={20} aria-hidden="true" />
          Học từ mới
        </Link>
      </div>
    </>
  )
}

export default function ReviewStart({ overview, today, onStart }: ReviewStartProps) {
  return (
    <>
      <PageHeader title="Ôn tập" />
      <div className="page">
        {overview === undefined ? null : overview.dueCount === 0 ? (
          <EmptyState overview={overview} today={today} />
        ) : (
          <>
            <section className="lesson-start__hero glass">
              <p className="lesson-start__count">
                <span className="lesson-start__num">{overview.dueCount}</span>
                <span className="lesson-start__unit">từ đang chờ ôn</span>
              </p>
              <p className="lesson-start__sub">
                {overview.dueCount > REVIEW_ROUND_SIZE
                  ? `Lượt này ôn ${REVIEW_ROUND_SIZE} từ, còn lại ôn ở lượt sau.`
                  : 'Mỗi từ một câu hỏi. Từ trả lời sai sẽ được hỏi lại ở cuối lượt.'}
              </p>
            </section>

            <h2 className="label review-start__label">Theo cấp nhớ</h2>
            <ul className="sheet ruled level-list">
              {([1, 2, 3, 4, 5] as const).map((level) =>
                overview.dueByLevel[level] > 0 ? (
                  <li key={level}>
                    <LevelTicks level={level} />
                    <span className="level-list__count">
                      <strong>{overview.dueByLevel[level]}</strong> từ
                    </span>
                  </li>
                ) : null,
              )}
            </ul>

            <button type="button" className="btn btn--primary lesson-start__go" onClick={onStart}>
              <Play size={20} aria-hidden="true" />
              Ôn tập ngay
            </button>
          </>
        )}
      </div>
    </>
  )
}
