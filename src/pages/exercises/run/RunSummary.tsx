import { ChevronRight, RotateCcw, Trophy } from 'lucide-react'
import type { CSSProperties } from 'react'
import { SessionFooter } from '../../../components/quiz/SessionShell.tsx'
import IconBadge from '../../../components/IconBadge.tsx'
import PageHeader from '../../../components/PageHeader.tsx'
import type { BestStatus, RunItem, RunScore } from '../../../lib/exerciseRun.ts'
import { wrongRowText } from '../../../lib/exerciseRun.ts'

interface RunSummaryProps {
  title: string
  score: RunScore
  /** How a whole-set run compares with the best so far; undefined for a section or a retry run. */
  best?: BestStatus
  /** Retry runs mix sets, so the rows name the set too. */
  showSet: boolean
  /** Open the read-only review of a wrong question. */
  onReview: (item: RunItem) => void
  /** "Xong": back to the set (or to the list after a retry). */
  onDone: () => void
  /** Start a retry of this run's wrong questions. */
  onRetryWrong: () => void
}

function subline(score: RunScore, best: BestStatus | undefined, total: number): string {
  const parts: string[] = []
  if (best?.kind === 'new') parts.push('Cao nhất từ trước tới nay')
  else if (best?.kind === 'behind') parts.push(`Cao nhất: ${best.best}/${total}`)
  if (score.selfMarked > 0) parts.push(`${score.selfMarked} câu tự chấm`)
  return parts.join(' · ')
}

/** End of a run: the score, the score of every section, and the wrong questions to look at again. */
export default function RunSummary({ title, score, best, showSet, onReview, onDone, onRetryWrong }: RunSummaryProps) {
  const note = subline(score, best, score.total)

  return (
    <>
      <PageHeader title={title} />
      <div className="page ex-page ex-page--bar">
        <section className="ex-hero glass">
          <IconBadge icon={Trophy} hue="orange" size="lg" />
          <p className="ex-hero__score">
            <span className="ex-hero__num">{score.correct}</span>
            <span className="ex-hero__unit">/{score.total} câu đúng</span>
          </p>
          {note && <p className="ex-hero__sub">{note}</p>}
        </section>

        <h2 className="ex-label">Theo từng phần</h2>
        <ul className="sheet ruled sum-list">
          {score.sections.map((row) => (
            <li key={row.key} className="sum-row">
              <span className="sum-row__name">{row.name}</span>
              <span className="sum-row__bar" aria-hidden="true">
                <span style={{ '--p': row.total > 0 ? row.correct / row.total : 0 } as CSSProperties} />
              </span>
              <span className="sum-row__score">
                <strong>{row.correct}</strong>/{row.total}
              </span>
            </li>
          ))}
        </ul>

        {score.wrong.length > 0 && (
          <>
            <h2 className="ex-label">Câu sai · {score.wrong.length}</h2>
            <ul className="sheet ruled">
              {score.wrong.map((item) => {
                const { title: text, meta } = wrongRowText(item, showSet)
                return (
                  <li key={item.question.id}>
                    <button type="button" className="ex-row" onClick={() => onReview(item)}>
                      <span className="ex-num ex-num--wrong">{item.question.number}</span>
                      <span className="ex-row__main">
                        <span className="ex-row__name ex-row__name--clip">{text}</span>
                        <span className="ex-row__meta">{meta}</span>
                      </span>
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      <SessionFooter>
        <button
          type="button"
          className={score.wrong.length > 0 ? 'btn btn--ghost btn--self' : 'btn btn--primary'}
          onClick={onDone}
        >
          Xong
        </button>
        {score.wrong.length > 0 && (
          <button type="button" className="btn btn--primary" onClick={onRetryWrong}>
            <RotateCcw size={20} aria-hidden="true" />
            Làm lại câu sai
          </button>
        )}
      </SessionFooter>
    </>
  )
}
