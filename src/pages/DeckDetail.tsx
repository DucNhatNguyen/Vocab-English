import { Check, Plus } from 'lucide-react'
import { useParams } from 'react-router'
import { useProgressMap } from '../app/hooks.ts'
import { paths } from '../app/paths.ts'
import { useSettingsState } from '../app/useSettings.ts'
import LevelTicks from '../components/LevelTicks.tsx'
import PageHeader from '../components/PageHeader.tsx'
import WordRow from '../components/WordRow.tsx'
import { getDeck, getDeckWords } from '../data/index.ts'
import { getTopicLabel } from '../data/topics.ts'
import { isLearned } from '../db/progress.ts'
import { toggleActiveDeck } from '../db/settings.ts'
import NotFound from './NotFound.tsx'

export default function DeckDetail() {
  const { deckId = '' } = useParams()
  const progress = useProgressMap()
  const { settings, loading } = useSettingsState()
  const deck = getDeck(deckId)

  if (!deck) return <NotFound message="Không tìm thấy bộ từ" backTo={paths.decks} />

  const deckWords = getDeckWords(deck.id)
  const active = settings.activeDeckIds.includes(deck.id)
  const learned = deckWords.filter((w) => isLearned(progress.get(w.id))).length

  return (
    <>
      <PageHeader title={deck.name} backTo={paths.decks} />
      <div className="page">
        <p className="deck-summary">
          {getTopicLabel(deck.topic)} · {deck.level} · <strong>{learned}</strong>/{deckWords.length}{' '}
          đã học
        </p>
        <button
          type="button"
          className={active ? 'btn btn--success deck-toggle' : 'btn btn--primary deck-toggle'}
          aria-pressed={active}
          disabled={loading}
          onClick={() => void toggleActiveDeck(deck.id)}
        >
          {active ? <Check size={20} aria-hidden="true" /> : <Plus size={20} aria-hidden="true" />}
          {active ? 'Đang học bộ này' : 'Thêm vào bài học'}
        </button>
        <p className="hint muted">
          {active
            ? 'Từ chưa học của bộ này có trong bài học mới. Bấm lại để bỏ ra.'
            : 'Thêm để từ của bộ này xuất hiện trong bài học mới.'}
        </p>
        <ul className="sheet ruled">
          {deckWords.map((word) => {
            const level = progress.get(word.id)?.level ?? 0
            return (
              <li key={word.id}>
                <WordRow
                  word={word}
                  trailing={level >= 1 ? <LevelTicks level={level} size={14} /> : undefined}
                />
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
