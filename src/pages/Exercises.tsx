import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, ClipboardList, PenLine, Play, RotateCcw } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { paths } from '../app/paths.ts'
import IconBadge from '../components/IconBadge.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { EXERCISE_CATALOG, getCatalogEntry, loadExerciseSet } from '../data/exercises/catalog.ts'
import type { ExerciseSet } from '../data/exercises/types.ts'
import { getExerciseOverview, type ExerciseOverview } from '../db/exercises.ts'
import type { ExerciseAttempt } from '../db/types.ts'
import { KIND_LABEL, listStatus, openAttemptSummary, setCounts } from '../lib/exerciseLabels.ts'
import ExerciseRow from './exercises/ExerciseRow.tsx'

const GROUPS = ['practice-test', 'grammar', 'writing'] as const

/** Bài tập: practice tests, grammar and rewriting sets, with progress and a shortcut to wrong answers. */
export default function Exercises() {
  const overview = useLiveQuery(() => getExerciseOverview())

  return (
    <>
      <PageHeader title="Bài tập" />
      <div className="page ex-page">{overview === undefined ? null : <ExerciseList overview={overview} />}</div>
    </>
  )
}

function ExerciseList({ overview }: { overview: ExerciseOverview }) {
  return (
    <>
      {overview.openAttempt && <ContinueCard attempt={overview.openAttempt} />}
      {overview.wrongCount > 0 && (
        <Link to={paths.exerciseWrong()} className="ex-retry glass">
          <IconBadge icon={RotateCcw} hue="pink" />
          <span className="ex-retry__main">
            <span className="ex-retry__title">Làm lại câu sai</span>
            <span className="ex-retry__sub">
              {overview.wrongCount} câu từ {overview.wrongSetCount} bộ
            </span>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
      )}
      {GROUPS.map((kind) => {
        const entries = EXERCISE_CATALOG.filter((entry) => entry.kind === kind)
        return (
          <section key={kind} className="ex-group">
            <h2 className="ex-label">
              {KIND_LABEL[kind]} · {entries.length}
            </h2>
            <ul className="sheet ruled">
              {entries.map((entry, index) => (
                <li key={entry.id}>
                  <ExerciseRow
                    to={paths.exerciseSet(entry.id)}
                    lead={
                      kind === 'writing' ? (
                        <IconBadge icon={PenLine} hue="green" />
                      ) : (
                        <span className="ex-num">{index + 1}</span>
                      )
                    }
                    name={entry.title}
                    meta={setCounts(entry)}
                    status={listStatus(overview.statuses[entry.id] ?? { kind: 'new' })}
                  />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </>
  )
}

/** The unfinished attempt with the most recent answer. The set is loaded lazily just to name the section. */
function ContinueCard({ attempt }: { attempt: ExerciseAttempt }) {
  const entry = getCatalogEntry(attempt.setId)
  const [loaded, setLoaded] = useState<ExerciseSet>()
  const set = loaded?.id === attempt.setId ? loaded : undefined

  useEffect(() => {
    let cancelled = false
    void loadExerciseSet(attempt.setId)
      .then((s) => !cancelled && setLoaded(s))
      .catch(() => {}) // offline and never cached: the card still works without the section name
    return () => {
      cancelled = true
    }
  }, [attempt.setId])

  if (!entry) return null
  const { sub, fraction } = openAttemptSummary(attempt, entry, set)

  return (
    <section className="ex-continue glass">
      <p className="ex-continue__kicker">
        <IconBadge icon={ClipboardList} hue="violet" size="sm" />
        Đang làm dở
      </p>
      <p className="ex-continue__title">{entry.title}</p>
      <p className="ex-continue__sub">{sub}</p>
      <div className="ex-meter" aria-hidden="true">
        <span style={{ '--p': fraction } as CSSProperties} />
      </div>
      <Link to={paths.exerciseRun(attempt.setId, attempt.sectionId)} state={{ resume: true }} className="btn btn--primary">
        <Play size={20} aria-hidden="true" />
        Làm tiếp
      </Link>
    </section>
  )
}
