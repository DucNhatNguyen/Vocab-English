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
  settings: '/settings',
  myWords: '/my-words',
  /** New custom word; `word` prefills the English field. */
  myWordNew: (word?: string) =>
    word ? `/my-words/new?word=${encodeURIComponent(word)}` : '/my-words/new',
  myWordEdit: (wordId: string) => `/my-words/${encodeURIComponent(wordId)}/edit`,
} as const
