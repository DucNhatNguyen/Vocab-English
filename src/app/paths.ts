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
  /** Bài tập tab: the list of exercise sets. */
  exercises: '/bai-tap',
  /** One exercise set: its sections and scores. */
  exerciseSet: (setId: string) => `/bai-tap/${encodeURIComponent(setId)}`,
  /** Run a whole set, or only one section of it. */
  exerciseRun: (setId: string, sectionId?: string) =>
    `/bai-tap/${encodeURIComponent(setId)}/lam${sectionId ? `?phan=${encodeURIComponent(sectionId)}` : ''}`,
  /** Retry the wrong answers of every set, or of one set. */
  exerciseWrong: (setId?: string) =>
    setId ? `/bai-tap/cau-sai?bo=${encodeURIComponent(setId)}` : '/bai-tap/cau-sai',
  /** Learn / review only the user's own words. */
  learnMine: '/learn?nguon=tu-hoc',
  reviewMine: '/review?nguon=tu-hoc',
  /** New custom word; `word` prefills the English field. */
  myWordNew: (word?: string) =>
    word ? `/my-words/new?word=${encodeURIComponent(word)}` : '/my-words/new',
  myWordEdit: (wordId: string) => `/my-words/${encodeURIComponent(wordId)}/edit`,
} as const
