import { ClipboardList, Play, RotateCcw } from 'lucide-react'
import type { CSSProperties } from 'react'
import { paths } from '../../../app/paths.ts'
import IconBadge from '../../../components/IconBadge.tsx'
import PageHeader from '../../../components/PageHeader.tsx'

interface ResumePromptProps {
  setId: string
  title: string
  /** "Cả đề" or the name of the section that was being done. */
  scope: string
  answered: number
  total: number
  onResume: () => void
  onRestart: () => void
}

/** Shown when a scope already has an unfinished attempt with answers: continue or start over. */
export default function ResumePrompt({ setId, title, scope, answered, total, onResume, onRestart }: ResumePromptProps) {
  return (
    <>
      <PageHeader title={title} backTo={paths.exerciseSet(setId)} />
      <div className="page ex-page">
        <section className="ex-continue glass">
          <p className="ex-continue__kicker">
            <IconBadge icon={ClipboardList} hue="violet" size="sm" />
            Đang làm dở
          </p>
          <p className="ex-continue__title">{scope}</p>
          <p className="ex-continue__sub">
            Đã làm {answered}/{total} câu
          </p>
          <div className="ex-meter" aria-hidden="true">
            <span style={{ '--p': total > 0 ? answered / total : 0 } as CSSProperties} />
          </div>
          <button type="button" className="btn btn--primary" onClick={onResume}>
            <Play size={20} aria-hidden="true" />
            Làm tiếp
          </button>
          <button type="button" className="btn btn--ghost" onClick={onRestart}>
            <RotateCcw size={20} aria-hidden="true" />
            Làm lại từ đầu
          </button>
        </section>
        <p className="ex-note">Làm lại từ đầu bỏ phần đang làm dở, còn kết quả từng câu đã lưu vẫn giữ cho đến khi bạn làm lại câu đó.</p>
      </div>
    </>
  )
}
