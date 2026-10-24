import { useLiveQuery } from 'dexie-react-hooks'
import type { CSSProperties } from 'react'
import { paths } from '../app/paths.ts'
import LevelTicks from '../components/LevelTicks.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { loadStats } from '../db/stats.ts'
import { formatDateVi, weekdayShortVi } from '../lib/date.ts'
import { formatAccuracy, type LevelCounts, type Stats as StatsData } from '../lib/stats.ts'

/** Words per memory level as bars: ink-purple bars, red-pen ticks as the axis labels. */
function LevelChart({ levels }: { levels: LevelCounts }) {
  const max = Math.max(...levels, 1)
  const summary = levels.map((count, i) => `cấp ${i + 1}: ${count} từ`).join(', ')
  return (
    <div className="chart" role="img" aria-label={`Số từ theo cấp nhớ. ${summary}`}>
      {levels.map((count, i) => (
        <div className="chart__col" key={i}>
          <div className="chart__plot">
            <span className="chart__value">{count}</span>
            <span
              className={count > 0 ? 'chart__bar' : 'chart__bar chart__bar--zero'}
              style={{ '--h': count / max } as CSSProperties}
            />
          </div>
          <LevelTicks level={i + 1} size={12} className="chart__ticks" />
        </div>
      ))}
    </div>
  )
}

interface StatRowProps {
  label: string
  value: string
  unit?: string
  note?: string
}

function StatRow({ label, value, unit, note }: StatRowProps) {
  return (
    <li className="stat">
      <span className="stat__main">
        <span className="stat__label">{label}</span>
        {note && <span className="stat__note">{note}</span>}
      </span>
      <span className="stat__value">
        <strong>{value}</strong>
        {unit && <span className="stat__unit"> {unit}</span>}
      </span>
    </li>
  )
}

/** Last 7 days: a purple dot for every day with a lesson or a review. */
function Week({ days, today }: { days: StatsData['recent']; today: string }) {
  return (
    <ol className="week">
      {days.map((day) => (
        <li key={day.date} className={day.date === today ? 'week__day week__day--today' : 'week__day'}>
          <span className={day.studied ? 'week__dot week__dot--on' : 'week__dot'} aria-hidden="true" />
          <span aria-hidden="true">{weekdayShortVi(day.date)}</span>
          <span className="visually-hidden">
            {formatDateVi(day.date, today) === 'hôm nay' ? 'Hôm nay' : formatDateVi(day.date, today)}
            {day.studied ? ': đã học' : ': chưa học'}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** Thống kê: words per level, learned / mastered, streak, accuracy, today and the last week. */
export default function Stats() {
  const data = useLiveQuery(() => loadStats())

  return (
    <>
      <PageHeader title="Thống kê" backTo={paths.home} />
      <div className="page stats">
        {data && <StatsBody stats={data.stats} today={data.today} />}
      </div>
    </>
  )
}

function StatsBody({ stats, today }: { stats: StatsData; today: string }) {
  const { streak } = stats
  return (
    <>
      <section>
        <h2 className="label">Số từ theo cấp nhớ</h2>
        <div className="sheet stats__chart">
          <LevelChart levels={stats.levels} />
        </div>
        {stats.learned === 0 && (
          <p className="muted stats__empty">Chưa có từ nào. Học bài đầu tiên để lên biểu đồ.</p>
        )}
      </section>

      <section>
        <h2 className="label">Tổng quan</h2>
        <ul className="sheet ruled">
          <StatRow
            label="Đã học"
            value={String(stats.learned)}
            unit="từ"
            note={stats.ignored > 0 ? `${stats.ignored} từ đang bỏ tick, không ôn` : undefined}
          />
          <StatRow label="Đã thuộc (cấp 5)" value={String(stats.mastered)} unit="từ" />
          <StatRow
            label="Chuỗi ngày học"
            value={String(streak.current)}
            unit="ngày"
            note={`Dài nhất: ${streak.longest} ngày`}
          />
          <StatRow
            label="Trả lời đúng"
            value={formatAccuracy(stats.accuracy)}
            note={
              stats.accuracy === null
                ? 'Chưa có câu trả lời nào'
                : `${stats.correctTotal} đúng, ${stats.wrongTotal} sai`
            }
          />
        </ul>
      </section>

      <section>
        <h2 className="label">Hôm nay</h2>
        <ul className="sheet ruled">
          <StatRow
            label="Từ mới"
            value={`${stats.today.newLearned}/${stats.today.goal}`}
            unit="từ"
          />
          <StatRow label="Đã ôn" value={String(stats.today.reviewed)} unit="từ" />
        </ul>
      </section>

      <section>
        <h2 className="label">7 ngày gần đây</h2>
        <div className="sheet stats__week">
          <Week days={stats.recent} today={today} />
        </div>
      </section>
    </>
  )
}
