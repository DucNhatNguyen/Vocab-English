import { useLiveQuery } from 'dexie-react-hooks'
import {
  BookOpenCheck,
  CalendarClock,
  ChartColumn,
  Flame,
  NotebookPen,
  PenLine,
  Play,
  Plus,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { useCustomWords, useProgressMap } from '../app/hooks.ts'
import { paths } from '../app/paths.ts'
import IconBadge from '../components/IconBadge.tsx'
import { loadSelfStudyData, type SelfStudyData } from '../db/stats.ts'
import { formatDateVi, formatWeekdayDateVi, today as localToday } from '../lib/date.ts'
import type { StreakInfo } from '../lib/streak.ts'
import InstallBanner from './home/InstallBanner.tsx'
import MyWordList from './my-words/MyWordList.tsx'

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

/** The main card: what is left to learn and review, today's goal, and the way into each. */
function Hero({ data }: { data: SelfStudyData }) {
  const { overview, stats, lessonCount, newToday, unlearnedCount, dueCount, today } = data
  const { goal } = stats.today
  const fraction = goal > 0 ? Math.min(1, newToday / goal) : 0

  return (
    <section className="self-study__hero glass">
      <div className="self-study__stats">
        <p className="self-study__stat">
          <IconBadge icon={Sparkles} hue="violet" size="sm" />
          <span>
            <strong>{unlearnedCount}</strong> từ chưa học
          </span>
        </p>
        <p className="self-study__stat">
          <IconBadge icon={BookOpenCheck} hue="green" size="sm" />
          <span>
            <strong>{dueCount}</strong> từ tới hạn ôn
          </span>
        </p>
      </div>
      <div>
        <p className="self-study__goal">
          Hôm nay: {newToday}/{goal} từ mới
        </p>
        <div
          className="meter"
          role="progressbar"
          aria-label="Từ mới hôm nay"
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-valuenow={Math.min(newToday, goal)}
        >
          <div className="meter__fill" style={{ '--p': fraction } as CSSProperties} />
        </div>
      </div>
      {dueCount > 0 && (
        <Link to={paths.review} className="btn btn--primary">
          <Play size={20} aria-hidden="true" />
          Ôn tập ngay
        </Link>
      )}
      {lessonCount > 0 && (
        <Link to={paths.learn} className={dueCount > 0 ? 'btn btn--ghost' : 'btn btn--primary'}>
          {dueCount === 0 && <Play size={20} aria-hidden="true" />}
          Học ngay
        </Link>
      )}
      {dueCount === 0 && lessonCount === 0 && (
        <p className="muted self-study__note">Bạn đã học hết từ của mình. Thêm từ mới nhé.</p>
      )}
      {dueCount === 0 && overview.next && (
        <p className="self-study__next">
          <IconBadge icon={CalendarClock} hue="green" size="sm" />
          <span>
            Lượt ôn tiếp theo:{' '}
            <strong>
              {formatDateVi(overview.next.date, today)}, {overview.next.count} từ
            </strong>
          </span>
        </p>
      )}
    </section>
  )
}

/** Home page: date and streak, what to learn and review now, and the user's own words. */
export default function SelfStudy() {
  // Live: finishing a lesson or a review round updates every number here
  const data = useLiveQuery(() => loadSelfStudyData())
  const words = useCustomWords()
  const progress = useProgressMap()
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
      {data === undefined ? null : data.totalCount === 0 ? (
        <div className="empty">
          <IconBadge icon={PenLine} hue="orange" size="lg" />
          <p className="empty__title">Chưa có từ nào để tự học</p>
          <p className="muted empty__text">
            Thêm những từ bạn muốn học: gõ từ tiếng Anh, app gợi ý phiên âm và ví dụ, bạn nhập
            nghĩa tiếng Việt. Từ của bạn được học riêng ở đây và ôn lại theo 5 cấp độ nhớ.
          </p>
          <Link to={paths.myWordNew()} className="btn btn--primary">
            <Plus size={20} aria-hidden="true" />
            Thêm từ
          </Link>
        </div>
      ) : (
        <>
          <Hero data={data} />
          <Link to={paths.myWordNew()} className="btn btn--ghost">
            <Plus size={20} aria-hidden="true" />
            Thêm từ
          </Link>
          <nav className="home-links sheet" aria-label="Lối tắt">
            <Link to={paths.notebook}>
              <IconBadge icon={NotebookPen} hue="blue" />
              Sổ tay
            </Link>
            <Link to={paths.stats}>
              <IconBadge icon={ChartColumn} hue="pink" />
              Thống kê
            </Link>
          </nav>
          <section>
            <h2 className="label">Từ của tôi · {data.totalCount}</h2>
            <MyWordList words={words} progress={progress} />
          </section>
        </>
      )}
    </div>
  )
}
