import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { useProgressMap } from '../app/hooks.ts'
import { paths } from '../app/paths.ts'
import { useSettings } from '../app/useSettings.ts'
import PageHeader from '../components/PageHeader.tsx'
import { decks } from '../data/index.ts'
import type { Deck } from '../data/index.ts'
import { getTopicLabel } from '../data/topics.ts'
import { isLearned } from '../db/progress.ts'

/** Decks grouped by topic, keeping the order in which topics first appear. */
function groupByTopic(list: readonly Deck[]): Array<{ topic: string; decks: Deck[] }> {
  const groups = new Map<string, Deck[]>()
  for (const deck of list) {
    const group = groups.get(deck.topic)
    if (group) group.push(deck)
    else groups.set(deck.topic, [deck])
  }
  return [...groups].map(([topic, items]) => ({ topic, decks: items }))
}

const groups = groupByTopic(decks)

export default function Decks() {
  const progress = useProgressMap()
  const { activeDeckIds } = useSettings()

  return (
    <>
      <PageHeader title="Bộ từ vựng" backTo={paths.home} />
      <div className="page">
        {groups.map((group) => (
          <section key={group.topic} className="group">
            <h2 className="group__title">{getTopicLabel(group.topic)}</h2>
            <ul className="sheet ruled">
              {group.decks.map((deck) => {
                const learned = deck.wordIds.filter((id) => isLearned(progress.get(id))).length
                return (
                  <li key={deck.id}>
                    <Link to={paths.deck(deck.id)} className="row deck-row">
                      <span className="deck-row__main">
                        <span className="deck-row__name">{deck.name}</span>
                        <span className="deck-row__meta">
                          {deck.level} · {deck.wordIds.length} từ
                          {activeDeckIds.includes(deck.id) && (
                            <span className="chip chip--mine">Đang học</span>
                          )}
                        </span>
                      </span>
                      <span className="deck-row__count">
                        <strong>
                          {learned}/{deck.wordIds.length}
                        </strong>{' '}
                        đã học
                      </span>
                      <ChevronRight size={18} className="row__chevron" aria-hidden="true" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
