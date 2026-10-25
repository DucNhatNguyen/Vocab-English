import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpenCheck, PenLine, Play, Plus, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { useCustomWords, useProgressMap } from '../app/hooks.ts'
import { paths } from '../app/paths.ts'
import IconBadge from '../components/IconBadge.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { loadSelfStudyData } from '../db/stats.ts'
import MyWordList from './my-words/MyWordList.tsx'

/** Tự học: the user's own words, learned and reviewed separately from the daily lesson. */
export default function SelfStudy() {
  const data = useLiveQuery(() => loadSelfStudyData())
  const words = useCustomWords()
  const progress = useProgressMap()

  return (
    <>
      <PageHeader title="Tự học" />
      <div className="page">
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
            <section className="self-study__hero glass">
              <div className="self-study__stats">
                <p className="self-study__stat">
                  <IconBadge icon={Sparkles} hue="violet" size="sm" />
                  <span>
                    <strong>{data.unlearnedCount}</strong> từ chưa học
                  </span>
                </p>
                <p className="self-study__stat">
                  <IconBadge icon={BookOpenCheck} hue="green" size="sm" />
                  <span>
                    <strong>{data.dueCount}</strong> từ tới hạn ôn
                  </span>
                </p>
              </div>
              {data.unlearnedCount > 0 ? (
                <Link to={paths.learnMine} className="btn btn--primary">
                  <Play size={20} aria-hidden="true" />
                  Học ngay
                </Link>
              ) : (
                <p className="muted self-study__note">Bạn đã học hết từ của mình. Thêm từ mới nhé.</p>
              )}
              {data.dueCount > 0 && (
                <Link to={paths.reviewMine} className="btn btn--ghost">
                  Ôn từ của tôi
                </Link>
              )}
            </section>
            <Link to={paths.myWordNew()} className="btn btn--ghost self-study__add">
              <Plus size={20} aria-hidden="true" />
              Thêm từ
            </Link>
            <h2 className="label self-study__label">Từ của tôi · {data.totalCount}</h2>
            <MyWordList words={words} progress={progress} />
          </>
        )}
      </div>
    </>
  )
}
