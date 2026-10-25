import { useLiveQuery } from 'dexie-react-hooks'
import {
  CalendarClock,
  CheckCheck,
  ChartColumn,
  Flame,
  GraduationCap,
  Library,
  NotebookPen,
  Play,
  Search,
  Settings,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { paths } from '../app/paths.ts'
import IconBadge from '../components/IconBadge.tsx'
import LevelTicks from '../components/LevelTicks.tsx'
import { loadHomeData, type HomeData } from '../db/stats.ts'
import { formatDateVi, formatWeekdayDateVi, today as localToday } from '../lib/date.ts'
import type { StreakInfo } from '../lib/streak.ts'
import InstallBanner from './home/InstallBanner.tsx'

/** Flame + streak count; filled once today counts, outlined while the streak is only alive. */
function Streak({ streak }: { streak: StreakInfo }) {
  const cls = streak.todayDone ? 'streak streak--done' : streak.current > 0 ? 'streak streak--alive' : 'streak'
  return (
    <p className={cls}>
      <Flame size={22} strokeWidth={2.25} aria-hidden="true" />
      <span className="visually-hidden">Chuỗi ngày học liên tiếp:</span>
      <span className="streak__num">{streak.current}</span>
      <span className="streak__unit">ngày</span>
    </p>
  )
}

/** Nudge shown while today does not count yet. */
function streakNote({ current, longest, todayDone }: StreakInfo): string | null {
  if (todayDone) return null
  if (current > 0) return 'Học hôm nay để giữ chuỗi'
  if (longest > 0) return 'Học hôm nay để bắt đầu chuỗi mới'
  return null
}

/** The main block: reviews due, nothing due (next review day), or the first lesson. */
function ReviewBlock({ data }: { data: HomeData }) {
  const { overview, stats, lessonCount, today } = data

  if (stats.learned === 0) {
    return lessonCount > 0 ? (
      <section className="home-review glass">
        <h2 className="home-review__title">Bắt đầu học nào!</h2>
        <p className="home-review__text">
          Bài đầu tiên có {lessonCount} từ. Học xong, các từ vào lượt ôn từ ngày mai.
        </p>
        <Link to={paths.learn} className="btn btn--primary home-review__go">
          <GraduationCap size={20} aria-hidden="true" />
          Học bài đầu tiên
        </Link>
      </section>
    ) : (
      <section className="home-review glass">
        <h2 className="home-review__title">Chọn bộ từ để học</h2>
        <p className="home-review__text">Hiện chưa có từ nào để học. Hãy chọn một bộ từ vựng.</p>
        <Link to={paths.decks} className="btn btn--primary home-review__go">
          <Library size={20} aria-hidden="true" />
          Xem bộ từ vựng
        </Link>
      </section>
    )
  }

  if (overview.dueCount > 0) {
    return (
      <section className="home-review glass">
        <h2 className="home-review__title">Đến giờ ôn rồi!</h2>
        <p className="home-review__count">
          <span className="home-review__num">{overview.dueCount}</span>
          <span className="home-review__unit">từ đang chờ</span>
        </p>
        <Link to={paths.review} className="btn btn--primary home-review__go">
          <Play size={20} aria-hidden="true" />
          Ôn tập ngay
        </Link>
      </section>
    )
  }

  return (
    <section className="home-review glass">
      <h2 className="home-review__title">Chưa có từ cần ôn</h2>
      {overview.next ? (
        <p className="home-review__next">
          <IconBadge icon={CalendarClock} hue="green" size="sm" />
          <span>
            Lượt ôn tiếp theo:{' '}
            <strong>
              {formatDateVi(overview.next.date, today)}, {overview.next.count} từ
            </strong>
          </span>
        </p>
      ) : (
        <p className="home-review__text">
          Các từ đã học đang được bỏ tick trong Sổ tay nên không có lượt ôn nào.
        </p>
      )}
    </section>
  )
}

/** "Bài mới: N từ" with today's goal progress; a pointer to the decks when nothing is left. */
function LessonLine({ data }: { data: HomeData }) {
  const { lessonCount, hasActiveDecks, stats } = data
  // Deck words only: Tự học words are not part of the daily goal
  const newLearned = data.newToday
  const { goal } = stats.today
  const progress = (
    <p className="home-lesson__sub">
      Hôm nay: {newLearned}/{goal} từ mới
    </p>
  )

  // New users get their invitation (or the pointer to the decks) in the main block instead
  if (stats.learned === 0) return null

  if (lessonCount === 0) {
    return (
      <section className="home-lesson glass">
        <IconBadge icon={hasActiveDecks ? CheckCheck : Library} hue={hasActiveDecks ? 'green' : 'blue'} />
        <div className="home-lesson__main">
          <p className="home-lesson__title">
            {hasActiveDecks ? 'Bạn đã học hết các bộ đang chọn' : 'Chưa chọn bộ từ nào để học'}
          </p>
          {progress}
        </div>
        <Link to={paths.decks} className="btn btn--ghost home-lesson__go">
          Chọn thêm bộ từ
        </Link>
      </section>
    )
  }

  const fraction = goal > 0 ? Math.min(1, newLearned / goal) : 0
  return (
    <section className="home-lesson glass">
      <IconBadge icon={GraduationCap} hue="violet" />
      <div className="home-lesson__main">
        <p className="home-lesson__title">
          Bài mới: <strong>{lessonCount} từ</strong>
        </p>
        {progress}
      </div>
      <Link
        to={paths.learn}
        className={
          data.overview.dueCount > 0 ? 'btn btn--ghost home-lesson__go' : 'btn btn--primary home-lesson__go'
        }
      >
        Học ngay
      </Link>
      <div
        className="meter"
        role="progressbar"
        aria-label="Từ mới hôm nay"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(newLearned, goal)}
      >
        <div className="meter__fill" style={{ '--p': fraction } as CSSProperties} />
      </div>
    </section>
  )
}

/** "Sổ điểm": the five levels with red-pen ticks and counts; opens the statistics. */
function Scores({ levels }: { levels: readonly number[] }) {
  const max = Math.max(...levels, 1)
  return (
    <section className="home-scores">
      <div className="home-scores__head">
        <h2 className="label">Sổ điểm</h2>
      </div>
      <div className="sheet">
        <Link to={paths.stats} className="home-scores__link">
          <ul className="scores ruled">
            {levels.map((count, i) => (
              <li key={i}>
                <LevelTicks level={i + 1} />
                <span className="scores__bar" aria-hidden="true">
                  <span style={{ '--p': count / max } as CSSProperties} />
                </span>
                <span className="scores__count">
                  <strong>{count}</strong> từ
                </span>
              </li>
            ))}
          </ul>
        </Link>
        <nav className="home-links" aria-label="Lối tắt">
          <Link to={paths.notebook}>
            <IconBadge icon={NotebookPen} hue="blue" />
            Sổ tay
          </Link>
          <Link to={paths.stats}>
            <IconBadge icon={ChartColumn} hue="pink" />
            Thống kê
          </Link>
          <Link to={paths.decks}>
            <IconBadge icon={Library} hue="orange" />
            Bộ từ vựng
          </Link>
        </nav>
      </div>
    </section>
  )
}

/** Home dashboard: date and streak, what to do now (review / lesson), "Sổ điểm". */
export default function Home() {
  // Live: finishing a lesson or a review round updates every number here
  const data = useLiveQuery(() => loadHomeData())
  const today = data?.today ?? localToday()
  const note = data ? streakNote(data.stats.streak) : null

  return (
    <div className="home">
      <header className="home-head">
        <h1 className="home-head__date">{formatWeekdayDateVi(today)}</h1>
        <div className="home-head__actions">
          {data && <Streak streak={data.stats.streak} />}
          <Link to={paths.search} className="icon-btn icon-btn--soft" aria-label="Tìm kiếm">
            <Search size={20} aria-hidden="true" />
          </Link>
          <Link to={paths.settings} className="icon-btn icon-btn--soft" aria-label="Cài đặt">
            <Settings size={20} aria-hidden="true" />
          </Link>
        </div>
      </header>
      {note && <p className="home-note">{note}</p>}
      <InstallBanner />
      {data && (
        <>
          <ReviewBlock data={data} />
          <LessonLine data={data} />
          <Scores levels={data.stats.levels} />
        </>
      )}
    </div>
  )
}
