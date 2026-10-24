export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type Level = (typeof LEVELS)[number]

/** Allowed values for `Word.pos`. */
export const PARTS_OF_SPEECH = [
  'noun',
  'verb',
  'adj',
  'adv',
  'phrase',
  'prep',
  'conj',
  'pron',
  'interj',
] as const

export interface Deck {
  id: string // "ielts-moi-truong"
  name: string // "IELTS – Môi trường"
  topic: string // "ielts"
  level: Level
  wordIds: string[]
}

export interface Word {
  id: string // "resilient"
  word: string // "resilient"
  emoji?: string // "💪"
  ipa: string // "/rɪˈzɪliənt/"
  pos: string // "adj" (one of PARTS_OF_SPEECH)
  meaningVi: string // "kiên cường, mau phục hồi"
  exampleEn: string
  exampleVi: string
  level: string
  topics: string[]
}
