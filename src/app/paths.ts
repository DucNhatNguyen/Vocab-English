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
} as const
