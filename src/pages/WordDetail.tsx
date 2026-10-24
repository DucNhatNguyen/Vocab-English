import { Heart } from 'lucide-react'
import { useParams } from 'react-router'
import { useCardProgress, useWord } from '../app/hooks.ts'
import { paths } from '../app/paths.ts'
import LevelTicks from '../components/LevelTicks.tsx'
import PageHeader from '../components/PageHeader.tsx'
import SpeakButtons from '../components/SpeakButtons.tsx'
import { toggleFavorite } from '../db/progress.ts'
import { getPosLabel } from '../lib/pos.ts'
import NotFound from './NotFound.tsx'

export default function WordDetail() {
  // useParams already URL-decodes, so "custom%3Aabc" arrives as "custom:abc"
  const { wordId = '' } = useParams()
  const word = useWord(wordId)
  const progress = useCardProgress(wordId)

  // Loading: render only the shell so a valid word does not flash "not found"
  if (word === undefined) return <PageHeader title="" backTo={paths.home} />
  if (word === null) return <NotFound message="Không tìm thấy từ" backTo={paths.home} />

  const favorite = progress?.favorite ?? false
  const level = progress?.level ?? 0

  return (
    <>
      <PageHeader
        title="Chi tiết từ"
        backTo={paths.home}
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
      <article className="page word-detail">
        {word.emoji && (
          <div className="word-detail__emoji" aria-hidden="true">
            {word.emoji}
          </div>
        )}
        <h2 className="word-detail__word">{word.word}</h2>
        <p className="word-detail__ipa">
          {word.ipa && <span>{word.ipa}</span>}
          <span className="chip">{getPosLabel(word.pos)}</span>
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
        </section>
      </article>
    </>
  )
}
