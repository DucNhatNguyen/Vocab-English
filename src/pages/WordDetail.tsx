import { Heart, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useCardProgress, useWord } from '../app/hooks.ts'
import { paths } from '../app/paths.ts'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import LevelTicks from '../components/LevelTicks.tsx'
import PageHeader from '../components/PageHeader.tsx'
import ReviewTick from '../components/ReviewTick.tsx'
import SpeakButtons from '../components/SpeakButtons.tsx'
import { deleteCustomWord } from '../db/customWords.ts'
import { setIgnored, toggleFavorite } from '../db/progress.ts'
import { isCustomWordId } from '../db/words.ts'
import { today } from '../lib/date.ts'
import { reviewStatusLabel } from '../lib/notebook.ts'
import { getPosLabel } from '../lib/pos.ts'
import NotFound from './NotFound.tsx'

export default function WordDetail() {
  // useParams already URL-decodes, so "custom%3Aabc" arrives as "custom:abc"
  const { wordId = '' } = useParams()
  const word = useWord(wordId)
  const progress = useCardProgress(wordId)
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleted, setDeleted] = useState(false)

  async function remove() {
    setConfirmDelete(false)
    setDeleted(true) // hides the page so the vanished word does not flash "not found"
    try {
      await deleteCustomWord(wordId)
      void navigate(paths.home, { replace: true })
    } catch {
      setDeleted(false)
    }
  }

  if (deleted) return <PageHeader title="" />
  // Loading: render only the shell so a valid word does not flash "not found"
  const isCustom = isCustomWordId(wordId)
  const backTo = paths.home
  if (word === undefined) return <PageHeader title="" backTo={backTo} />
  if (word === null) return <NotFound message="Không tìm thấy từ" backTo={backTo} />

  const favorite = progress?.favorite ?? false
  const level = progress?.level ?? 0
  const reviewStatus = progress ? reviewStatusLabel(progress, today()) : null

  return (
    <>
      <PageHeader
        title="Chi tiết từ"
        backTo={backTo}
        actions={
          <button
            type="button"
            className={favorite ? 'icon-btn icon-btn--on' : 'icon-btn'}
            aria-label={favorite ? 'Bỏ yêu thích' : 'Yêu thích'}
            aria-pressed={favorite}
            onClick={() => void toggleFavorite(word.id)}
          >
            <Heart size={22} fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        }
      />
      <div className="page word-detail">
        <article className="flashcard glass">
          {word.emoji && (
            <div className="word-detail__emoji" aria-hidden="true">
              {word.emoji}
            </div>
          )}
          <h2 className="word-detail__word">{word.word}</h2>
          <p className="word-detail__ipa">
            {word.ipa && <span>{word.ipa}</span>}
            {word.pos && <span className="chip">{getPosLabel(word.pos)}</span>}
            {isCustom && <span className="chip chip--mine">Từ của tôi</span>}
          </p>

          <SpeakButtons text={word.word} className="word-detail__speak" />

          <section className="word-detail__section">
            <h3 className="label">Nghĩa</h3>
            <p className="word-detail__meaning">{word.meaningVi}</p>
          </section>

          {(word.exampleEn || word.exampleVi) && (
            <section className="word-detail__section">
              <h3 className="label">Ví dụ</h3>
              <div className="example">
                {word.exampleEn && <p className="example__en">{word.exampleEn}</p>}
                {word.exampleVi && <p className="example__vi">{word.exampleVi}</p>}
              </div>
            </section>
          )}

          <section className="word-detail__section">
            <h3 className="label">Cấp độ nhớ</h3>
            {level >= 1 ? <LevelTicks level={level} size={22} /> : <p className="muted">Chưa học</p>}
            {progress && level >= 1 && (
              <div className="word-detail__review">
                <ReviewTick
                  ticked={!progress.ignored}
                  onToggle={() => void setIgnored(word.id, !progress.ignored)}
                />
                <span className="muted">{reviewStatus}</span>
              </div>
            )}
          </section>

        </article>

        {isCustom && (
          <div className="word-detail__actions">
            <Link to={paths.myWordEdit(word.id)} className="btn btn--ghost">
              <Pencil size={20} aria-hidden="true" />
              Sửa
            </Link>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={20} aria-hidden="true" />
              Xoá
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Xoá từ này?"
        message="Xoá từ này? Tiến độ học của từ cũng sẽ bị xoá."
        cancelLabel="Giữ lại"
        confirmLabel="Xoá"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
      />
    </>
  )
}
