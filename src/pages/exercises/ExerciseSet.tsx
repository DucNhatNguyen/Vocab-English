import { useLiveQuery } from 'dexie-react-hooks'
import { BookA, BookOpen, Info, ListChecks, PenLine, Play, TextCursorInput, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { paths } from '../../app/paths.ts'
import IconBadge, { type BadgeHue } from '../../components/IconBadge.tsx'
import PageHeader from '../../components/PageHeader.tsx'
import { getCatalogEntry, loadExerciseSet, type ExerciseCatalogEntry } from '../../data/exercises/catalog.ts'
import type { ExerciseSet as ExerciseSetData } from '../../data/exercises/types.ts'
import { getSetProgress } from '../../db/exercises.ts'
import { heroSubline, KIND_LABEL, sectionStatus, setCounts, setNote } from '../../lib/exerciseLabels.ts'
import { sectionInfo, type SectionKind } from '../../lib/exercises.ts'
import NotFound from '../NotFound.tsx'
import ExerciseRow from './ExerciseRow.tsx'

const SECTION_BADGE: Record<SectionKind, { icon: LucideIcon; hue: BadgeHue }> = {
  vocabulary: { icon: BookA, hue: 'blue' },
  reading: { icon: BookOpen, hue: 'violet' },
  completion: { icon: ListChecks, hue: 'orange' },
  grammar: { icon: ListChecks, hue: 'orange' },
  cloze: { icon: TextCursorInput, hue: 'pink' },
  rewrite: { icon: PenLine, hue: 'green' },
}

/** Set detail: best score, the sections with their latest scores, and the way into a run. */
export default function ExerciseSet() {
  const { setId = '' } = useParams()
  const entry = getCatalogEntry(setId)
  if (!entry) return <NotFound message="Không tìm thấy bộ đề" backTo={paths.exercises} />
  return <SetDetail key={entry.id} entry={entry} />
}

function SetDetail({ entry }: { entry: ExerciseCatalogEntry }) {
  const [set, setSet] = useState<ExerciseSetData>()
  const [failed, setFailed] = useState(false)
  const progress = useLiveQuery(() => (set ? getSetProgress(set) : undefined), [set])

  useEffect(() => {
    let cancelled = false
    loadExerciseSet(entry.id)
      .then((loaded) => {
        if (cancelled) return
        if (loaded) setSet(loaded)
        else setFailed(true)
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [entry.id])

  const subline = progress ? heroSubline(progress, entry.questionCount) : undefined

  return (
    <>
      <PageHeader title={entry.title} backTo={paths.exercises} />
      <div className="page ex-page">
        {failed ? (
          <p className="muted ex-note">Không tải được bộ đề này. Kiểm tra kết nối rồi thử lại.</p>
        ) : set && progress ? (
          <>
            <section className="ex-hero glass">
              <p className="ex-hero__kicker">
                {KIND_LABEL[entry.kind]} · {setCounts(entry)}
              </p>
              {progress.bestFull !== undefined ? (
                <p className="ex-hero__score">
                  <span className="ex-hero__num">{progress.bestFull}</span>
                  <span className="ex-hero__unit">/{entry.questionCount} cao nhất</span>
                </p>
              ) : (
                <p className="ex-hero__none">Chưa làm cả đề</p>
              )}
              {subline && <p className="ex-hero__sub">{subline}</p>}
              <Link to={paths.exerciseRun(set.id)} state={progress.openFull ? { resume: true } : undefined} className="btn btn--primary">
                <Play size={20} aria-hidden="true" />
                {progress.openFull ? 'Làm tiếp' : 'Làm cả đề'}
              </Link>
            </section>
            <h2 className="ex-label">Các phần · điểm lần gần nhất</h2>
            <ul className="sheet ruled">
              {set.sections.map((section) => {
                const info = sectionInfo(set, section)
                const badge = SECTION_BADGE[info.kind]
                return (
                  <li key={section.id}>
                    <ExerciseRow
                      to={paths.exerciseRun(set.id, section.id)}
                      lead={<IconBadge icon={badge.icon} hue={badge.hue} />}
                      name={info.name}
                      meta={info.meta}
                      status={sectionStatus(progress.sections[section.id], progress.openSectionIds.includes(section.id))}
                    />
                  </li>
                )
              })}
            </ul>
            {setNote(set) && (
              <p className="ex-note">
                <Info size={18} aria-hidden="true" />
                <span>{setNote(set)}</span>
              </p>
            )}
          </>
        ) : null}
      </div>
    </>
  )
}
