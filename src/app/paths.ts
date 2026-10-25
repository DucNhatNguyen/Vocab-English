/** Route builders. Ids may contain ":" (custom words), so they are always URL-encoded. */
export const paths = {
  home: '/',
  decks: '/decks',
  deck: (deckId: string) => `/decks/${encodeURIComponent(deckId)}`,
  word: (wordId: string) => `/words/${encodeURIComponent(wordId)}`,
  search: '/search',
  learn: '/learn',
  review: '/review',
  notebook: '/notebook',
  stats: '/stats',
  settings: '/settings',
  install: '/install',
  /** Tự học tab (formerly Từ của tôi). */
  myWords: '/tu-hoc',
  /** Tự học tab: the user's own words, learned and reviewed on their own. */
  selfStudy: '/tu-hoc',
  /** Bài tập tab (coming soon). */
  exercises: '/bai-tap',
  /** Learn / review only the user's own words. */
  learnMine: '/learn?nguon=tu-hoc',
  reviewMine: '/review?nguon=tu-hoc',
  /** New custom word; `word` prefills the English field. */
  myWordNew: (word?: string) =>
    word ? `/my-words/new?word=${encodeURIComponent(word)}` : '/my-words/new',
  myWordEdit: (wordId: string) => `/my-words/${encodeURIComponent(wordId)}/edit`,
} as const
