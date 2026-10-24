import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { paths } from '../app/paths.ts'
import type { Word } from '../data/types.ts'

interface WordRowProps {
  word: Word
  /** Extra content under the meaning, e.g. a "Từ của tôi" label. */
  badge?: ReactNode
  /** Right-aligned content before the chevron, e.g. level ticks. */
  trailing?: ReactNode
  /** Hide the chevron when other controls sit to the right of the row. Default true. */
  showChevron?: boolean
}

/** One ruled-list row linking to the word detail page. */
export default function WordRow({ word, badge, trailing, showChevron = true }: WordRowProps) {
  return (
    <Link to={paths.word(word.id)} className="row word-row">
      <span className="word-row__emoji" aria-hidden="true">
        {word.emoji}
      </span>
      <span className="word-row__main">
        <span className="word-row__head">
          <span className="word-row__word">{word.word}</span>
          {word.ipa && <span className="word-row__ipa">{word.ipa}</span>}
        </span>
        <span className="word-row__meaning">{word.meaningVi}</span>
        {badge}
      </span>
      {trailing}
      {showChevron && <ChevronRight size={18} className="row__chevron" aria-hidden="true" />}
    </Link>
  )
}
