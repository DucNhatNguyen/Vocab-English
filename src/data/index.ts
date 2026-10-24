import decksJson from './decks.json'
import wordsJson from './words.json'
import type { Deck, Word } from './types.ts'

export type { Deck, Level, Word } from './types.ts'

export const decks: Deck[] = decksJson as Deck[]
export const words: Word[] = wordsJson as Word[]

export const wordsById: Map<string, Word> = new Map(words.map((w) => [w.id, w]))
const decksById: Map<string, Deck> = new Map(decks.map((d) => [d.id, d]))

export function getWord(id: string): Word | undefined {
  return wordsById.get(id)
}

export function getDeck(id: string): Deck | undefined {
  return decksById.get(id)
}

/** Words of a deck, in deck order. Unknown deck -> empty array. */
export function getDeckWords(deckId: string): Word[] {
  const deck = decksById.get(deckId)
  if (!deck) return []
  return deck.wordIds.flatMap((id) => {
    const word = wordsById.get(id)
    return word ? [word] : []
  })
}
