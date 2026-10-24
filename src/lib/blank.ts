/**
 * Fill-in-the-blank support for review question type 3: find the headword (or a simple
 * inflection of it) inside an example sentence and cut it out.
 */

export interface Blank {
  /** Sentence pieces around the blanks; `parts.length === blank count + 1`. */
  parts: string[]
  /** The first matched text as written in the sentence, e.g. "recovered" for "recover". */
  surface: string
  /** The matched text of every blank, in order (`surfaces[i]` goes between `parts[i]` and `parts[i + 1]`). */
  surfaces: string[]
}

/**
 * The base word plus simple English inflections: -s, -es, -ed, -d, -ing, -ies / -ied (consonant
 * + y), e-dropping -ing (make -> making), -ie -> -ying and a doubled final consonant
 * (stop -> stopped / stopping). Irregular forms are not covered.
 */
export function inflections(word: string): string[] {
  const base = word.toLowerCase()
  const forms = new Set([base, `${base}s`, `${base}es`, `${base}ed`, `${base}d`, `${base}ing`])
  if (base.endsWith('e')) forms.add(`${base.slice(0, -1)}ing`)
  if (base.endsWith('ie')) forms.add(`${base.slice(0, -2)}ying`)
  if (/[^aeiou]y$/.test(base)) {
    forms.add(`${base.slice(0, -1)}ies`)
    forms.add(`${base.slice(0, -1)}ied`)
  }
  if (/[aeiou][bcdfghjklmnpqrstvz]$/.test(base)) {
    const last = base.slice(-1)
    forms.add(`${base}${last}ed`)
    forms.add(`${base}${last}ing`)
  }
  return [...forms]
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Literal token; straight and curly apostrophes match each other. */
function literal(token: string): string {
  return escapeRegExp(token).replace(/['’]/g, "['’]")
}

function alternation(words: readonly string[]): string {
  return `(?:${[...words].sort((a, b) => b.length - a.length).map(literal).join('|')})`
}

/**
 * Regex source matching `headword` in running text. Multi-word headwords match with any
 * whitespace or hyphen between the words ("check-in" also matches "check in"); inflection is
 * allowed on the last word ("fossil fuels") or the first one ("looks up").
 */
function headwordPattern(headword: string): string | null {
  const tokens = headword
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean)
  if (tokens.length === 0) return null

  const inflectAt = [...new Set([tokens.length - 1, 0])]
  const variants = inflectAt.map((index) =>
    tokens
      .map((token, i) => (i === index ? alternation(inflections(token)) : literal(token)))
      .join('[\\s-]+'),
  )
  return `(?<![\\p{L}\\p{N}])(?:${variants.join('|')})(?![\\p{L}\\p{N}])`
}

/**
 * Cuts every occurrence of `headword` (case-insensitive, on word boundaries, with simple
 * inflections) out of `sentence`. Null when the word does not occur, so the question type is
 * not possible for that card.
 */
export function findBlank(sentence: string, headword: string): Blank | null {
  const pattern = headwordPattern(headword)
  if (!pattern || !sentence) return null

  const matches = [...sentence.matchAll(new RegExp(pattern, 'giu'))]
  if (matches.length === 0) return null

  const parts: string[] = []
  let cursor = 0
  for (const match of matches) {
    parts.push(sentence.slice(cursor, match.index))
    cursor = match.index + match[0].length
  }
  parts.push(sentence.slice(cursor))
  const surfaces = matches.map((match) => match[0])
  return { parts, surface: surfaces[0], surfaces }
}
