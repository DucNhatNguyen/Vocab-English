import { CalendarClock, Check, Play, RotateCcw, TrendingUp } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '../../app/paths.ts'
import LevelTicks from '../../components/LevelTicks.tsx'
import PageHeader from '../../components/PageHeader.tsx'
import WordRow from '../../components/WordRow.tsx'
import type { Word } from '../../data/types.ts'
import { formatDateVi } from '../../lib/date.ts'
import type { NextReview } from '../../lib/review.ts'
import { MAX_LEVEL } from '../../lib/srs.ts'

/** First answer of one word of the round, as saved. */
export interface SummaryItem {
  word: Word
  from: number
  to: number
  correct: boolean
}

interface ReviewSummaryProps {
  items: readonly SummaryItem[]
  /** Due words left after this round. */
  remaining: number
  /** Words the next round would contain. */
  nextRoundSize: number
  /** Next review day when nothing is due any more (live from the database). */
  next: NextReview | null
  today: string
  onMore: () => void
}

function Group({ title, items }: { title: string; items: readonly SummaryItem[] }) {
  if (items.length === 0) return null
  return (
    <section className="review-group">
      <h2 className="review-group__title">
        {title} · <strong>{items.length}</strong>
      </h2>
      <ul className="sheet ruled">
        {items.map(({ word, to }) => (
          <li key={word.id}>
            <WordRow word={word} trailing={<LevelTicks level={to} />} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Result of a finished round: words that went up a level, words reset to level 1, what next. */
export default function ReviewSummary({
  items,
  remaining,
  nextRoundSize,
  next,
  today,
  onMore,
}: ReviewSummaryProps) {
  const up = items.filter((i) => i.correct && i.to > i.from)
  // Correct answers on a word that is already at the top level keep it there
  const kept = items.filter((i) => i.correct && i.to === i.from)
  const reset = items.filter((i) => !i.correct)

  return (
    <>
      <PageHeader title="Hoàn thành lượt ôn" />
      <div className="page">
        <section className="summary__hero">
          <p className="summary__count">
            <span className="summary__num">{items.length}</span>
            <span className="summary__unit">từ đã ôn</span>
          </p>
          <div className="summary__stats">
            <p className="stat stat--up">
              <TrendingUp size={20} aria-hidden="true" />
              <span>
                <strong>{up.length}</strong> lên cấp
              </span>
            </p>
            {kept.length > 0 && (
              <p className="stat stat--up">
                <Check size={20} aria-hidden="true" />
                <span>
                  <strong>{kept.length}</strong> giữ cấp {MAX_LEVEL}
                </span>
              </p>
            )}
            <p className="stat stat--reset">
              <RotateCcw size={20} aria-hidden="true" />
              <span>
                <strong>{reset.length}</strong> về cấp 1
              </span>
            </p>
          </div>
        </section>

        <div className="summary__actions">
          {remaining > 0 && (
            <button type="button" className="btn btn--primary" onClick={onMore}>
              <Play size={20} aria-hidden="true" />
              Ôn tiếp ({nextRoundSize} từ)
            </button>
          )}
          <Link to={paths.home} className={remaining > 0 ? 'btn btn--ghost' : 'btn btn--primary'}>
            Về trang chủ
          </Link>
        </div>
        {remaining > 0 ? (
          <p className="hint muted">Còn {remaining} từ đang chờ ôn.</p>
        ) : (
          next && (
            <p className="hint muted summary__next-review">
              <CalendarClock size={18} aria-hidden="true" />
              <span>
                Lượt ôn tiếp theo: {formatDateVi(next.date, today)}, {next.count} từ
              </span>
            </p>
          )
        )}

        <Group title="Lên cấp" items={up} />
        <Group title={`Giữ cấp ${MAX_LEVEL}`} items={kept} />
        <Group title="Về cấp 1" items={reset} />
      </div>
    </>
  )
}
