import { ArrowLeft, CheckCheck, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { paths } from '../../app/paths.ts'
import { useHideTabBar } from '../../app/tabBarVisibility.ts'
import IconBadge from '../../components/IconBadge.tsx'
import PageHeader from '../../components/PageHeader.tsx'
import { SessionBody } from '../../components/quiz/SessionShell.tsx'
import { getCatalogEntry, loadExerciseSet } from '../../data/exercises/catalog.ts'
import type { ExerciseSet } from '../../data/exercises/types.ts'
import {
  finishAttempt,
  getOpenAttempt,
  getSetProgress,
  getWrongQuestions,
  restartAttempt,
  startOrResumeAttempt,
} from '../../db/exercises.ts'
import type { ExerciseAttempt } from '../../db/types.ts'
import { sectionInfo } from '../../lib/exercises.ts'
import {
  bestStatus,
  buildRetryItems,
  buildRunItems,
  firstUnansweredIndex,
  scoreRun,
  type Answers,
  type BestStatus,
  type RunItem,
  type RunScore,
} from '../../lib/exerciseRun.ts'
import NotFound from '../NotFound.tsx'
import QuestionStage from './run/QuestionStage.tsx'
import ResumePrompt from './run/ResumePrompt.tsx'
import RunSession from './run/RunSession.tsx'
import RunSummary from './run/RunSummary.tsx'

/** What the summary and the read-only review of its wrong questions need. */
interface SummaryData {
  title: string
  items: RunItem[]
  answers: Answers
  score: RunScore
  best?: BestStatus
  showSet: boolean
}

interface RunData {
  /** New for every run, so the session component starts fresh. */
  runId: number
  items: RunItem[]
  /** The attempt that stores the answers; null for a retry run. */
  attempt: ExerciseAttempt | null
  set?: ExerciseSet
  answers: Answers
  showSet: boolean
  title: string
}

type Stage =
  | { name: 'loading' }
  | { name: 'notfound' }
  | { name: 'error' }
  | { name: 'empty' }
  | { name: 'prompt'; set: ExerciseSet; items: RunItem[]; attempt: ExerciseAttempt }
  | ({ name: 'run' } & RunData)
  | { name: 'summary'; summary: SummaryData }
  | { name: 'review'; summary: SummaryData; item: RunItem }

let runCounter = 0

function runStage(data: Omit<RunData, 'runId'>): Stage {
  runCounter += 1
  return { name: 'run', runId: runCounter, ...data }
}

/** Closes the attempt (when there is one) and builds the summary of a finished run. */
async function finishRun(run: Omit<RunData, 'runId'>, answers: Answers): Promise<Stage> {
  const { attempt, set, items, showSet, title } = run
  const whole = attempt !== null && attempt.sectionId === undefined && set !== undefined
  let previousBest: number | undefined
  if (attempt) {
    try {
      // Read before closing the attempt: the new score must not count as its own previous best
      if (whole) previousBest = (await getSetProgress(set)).bestFull
      if (attempt.id !== undefined) await finishAttempt(attempt.id)
    } catch {
      // The summary is still worth showing; the attempt just stays open
    }
  }
  const score = scoreRun(items, answers)
  return {
    name: 'summary',
    summary: { title, items, answers, score, best: whole ? bestStatus(score.correct, previousBest) : undefined, showSet },
  }
}

/** Starts (or resumes) a run on an attempt; goes straight to the summary when everything was answered. */
async function enterRun(set: ExerciseSet, items: RunItem[], attempt: ExerciseAttempt): Promise<Stage> {
  const run = { items, attempt, set, answers: attempt.answers, showSet: false, title: `Hoàn thành ${set.title}` }
  if (firstUnansweredIndex(items, attempt.answers) >= items.length) return finishRun(run, attempt.answers)
  return runStage(run)
}

async function bootstrapSet(setId: string, sectionId: string | undefined, resume: boolean): Promise<Stage> {
  if (!getCatalogEntry(setId)) return { name: 'notfound' }
  const set = await loadExerciseSet(setId)
  if (!set) return { name: 'notfound' }
  const items = buildRunItems(set, sectionId)
  if (items.length === 0) return { name: 'notfound' }

  const open = await getOpenAttempt(setId, sectionId)
  // Only an attempt with answers is worth asking about; arriving from a "Làm tiếp" button resumes silently
  if (open && Object.keys(open.answers).length > 0 && !resume) return { name: 'prompt', set, items, attempt: open }
  return enterRun(set, items, open ?? (await startOrResumeAttempt(setId, sectionId)))
}

async function bootstrapRetry(only: string | undefined): Promise<Stage> {
  const refs = await getWrongQuestions(only)
  const setIds = [...new Set(refs.map((ref) => ref.setId))]
  const sets = (await Promise.all(setIds.map((id) => loadExerciseSet(id)))).filter((s): s is ExerciseSet => s !== undefined)
  const items = buildRetryItems(sets, refs)
  if (items.length === 0) return { name: 'empty' }
  return runStage({ items, attempt: null, answers: {}, showSet: sets.length > 1, title: 'Kết quả làm lại câu sai' })
}

/**
 * Runs a set, one section of it (`?phan=`), or a retry of the wrong answers (`retry`, optionally
 * `?bo=` for one set). Route component for `/bai-tap/:setId/lam` and `/bai-tap/cau-sai`.
 */
export default function ExerciseRun({ retry = false }: { retry?: boolean }) {
  const { setId = '' } = useParams()
  const [search] = useSearchParams()
  const { state } = useLocation()
  const sectionId = search.get('phan') ?? undefined
  const only = search.get('bo') ?? undefined
  // "Làm tiếp" buttons pass { resume: true }: no need to ask again
  const resume = (state as { resume?: boolean } | null)?.resume === true

  // Keyed by what is being run, so every new scope starts from the loading stage
  const key = `${retry ? 'retry' : setId}|${sectionId ?? ''}|${only ?? ''}`
  return <RunFlow key={key} retry={retry} setId={setId} sectionId={sectionId} only={only} resume={resume} />
}

interface RunFlowProps {
  retry: boolean
  setId: string
  sectionId?: string
  only?: string
  resume: boolean
}

function RunFlow({ retry, setId, sectionId, only, resume }: RunFlowProps) {
  const navigate = useNavigate()
  const [stage, setStage] = useState<Stage>({ name: 'loading' })
  /** Bumped by "Thử lại" to load again. */
  const [reloads, setReloads] = useState(0)
  const summaryScroll = useRef(0)

  // The component is keyed per scope, so this runs once per scope (and again for "Thử lại")
  useEffect(() => {
    let cancelled = false
    const next = retry ? bootstrapRetry(only) : bootstrapSet(setId, sectionId, resume)
    next.then(
      (loaded) => !cancelled && setStage(loaded),
      () => !cancelled && setStage({ name: 'error' }),
    )
    return () => {
      cancelled = true
    }
  }, [retry, setId, sectionId, only, resume, reloads])

  function reload() {
    setStage({ name: 'loading' })
    setReloads((n) => n + 1)
  }

  useHideTabBar(stage.name === 'loading' || stage.name === 'run' || stage.name === 'summary' || stage.name === 'review')

  const doneTo = retry ? paths.exercises : paths.exerciseSet(setId)
  const leave = () => void navigate(doneTo)

  switch (stage.name) {
    case 'loading':
      return (
        <>
          <PageHeader title={retry ? 'Làm lại câu sai' : (getCatalogEntry(setId)?.title ?? 'Bài tập')} />
          <div className="page" aria-busy="true" />
        </>
      )
    case 'notfound':
      return <NotFound message="Không tìm thấy bài tập này" backTo={paths.exercises} />
    case 'error':
      return (
        <>
          <PageHeader title="Bài tập" backTo={doneTo} />
          <div className="page empty">
            <IconBadge icon={TriangleAlert} hue="orange" size="lg" />
            <p className="empty__title">Không tải được bài tập. Kiểm tra kết nối rồi thử lại.</p>
            <button type="button" className="btn btn--primary" onClick={reload}>
              Thử lại
            </button>
            <Link to={paths.exercises} className="btn btn--ghost">
              Về danh sách
            </Link>
          </div>
        </>
      )
    case 'empty':
      return (
        <>
          <PageHeader title="Làm lại câu sai" backTo={paths.exercises} />
          <div className="page empty">
            <IconBadge icon={CheckCheck} hue="green" size="lg" />
            <p className="empty__title">Không còn câu sai nào</p>
            <p className="muted">Những câu bạn làm sai sẽ hiện ở đây để làm lại.</p>
            <Link to={paths.exercises} className="btn btn--primary">
              Về danh sách
            </Link>
          </div>
        </>
      )
    case 'prompt': {
      const { set, items, attempt } = stage
      const section = set.sections.find((s) => s.id === attempt.sectionId)
      const go = (next: Promise<Stage>) => void next.then(setStage, () => setStage({ name: 'error' }))
      return (
        <ResumePrompt
          setId={set.id}
          title={set.title}
          scope={section ? sectionInfo(set, section).name : 'Cả đề'}
          answered={Object.keys(attempt.answers).length}
          total={items.length}
          onResume={() => go(enterRun(set, items, attempt))}
          onRestart={() => go(restartAttempt(set.id, sectionId).then((fresh) => enterRun(set, items, fresh)))}
        />
      )
    }
    case 'run':
      return (
        <RunSession
          key={stage.runId}
          items={stage.items}
          attemptId={stage.attempt?.id ?? null}
          initialAnswers={stage.answers}
          showSet={stage.showSet}
          onFinish={async (answers) => {
            setStage(await finishRun(stage, answers))
            window.scrollTo(0, 0)
          }}
          onExit={leave}
        />
      )
    case 'summary':
      return (
        <RunSummary
          title={stage.summary.title}
          score={stage.summary.score}
          best={stage.summary.best}
          showSet={stage.summary.showSet}
          onReview={(item) => {
            summaryScroll.current = window.scrollY
            setStage({ name: 'review', summary: stage.summary, item })
            window.scrollTo(0, 0)
          }}
          onDone={leave}
          onRetryWrong={() => {
            const items = stage.summary.score.wrong
            setStage(
              runStage({
                items,
                attempt: null,
                answers: {},
                showSet: new Set(items.map((i) => i.set.id)).size > 1,
                title: 'Kết quả làm lại câu sai',
              }),
            )
            window.scrollTo(0, 0)
          }}
        />
      )
    case 'review': {
      const { summary, item } = stage
      const back = () => {
        setStage({ name: 'summary', summary })
        requestAnimationFrame(() => window.scrollTo(0, summaryScroll.current))
      }
      return (
        <>
          <header className="topbar">
            <button type="button" className="icon-btn" aria-label="Quay lại tổng kết" onClick={back}>
              <ArrowLeft size={22} aria-hidden="true" />
            </button>
            <h1 className="topbar__title">Xem lại câu {item.question.number}</h1>
          </header>
          <SessionBody>
            <QuestionStage items={[item]} index={0} answers={summary.answers} showSet={summary.showSet} review onNext={back} />
          </SessionBody>
        </>
      )
    }
  }
}
