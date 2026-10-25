// Exercise sets converted from the PDF review booklet
// "Tài liệu ôn tập môn Tiếng Anh" (ĐH KHTN). The booklet has no answer key,
// so answers and explanations are written by AI: see `ExerciseSet.answerSource`.

export type ExerciseKind = 'practice-test' | 'grammar' | 'writing'

export interface ExerciseSet {
  id: string // "practice-test-01"
  title: string // "Practice Test 1"
  kind: ExerciseKind
  sourcePages: [number, number] // PDF page range, for proofreading
  answerSource: 'ai' | 'key' // 'ai': solved by AI, not taken from an official key
  omitted?: string[] // parts of the source left out, e.g. listening without audio
  sections: ExerciseSection[]
}

export interface ExerciseSection {
  id: string // "pt01-p1a"
  title: string // "Paper 1 · Part A: Từ vựng"
  instruction: string // Vietnamese
  examples?: string[] // worked examples shown before the questions (writing practice)
  passage?: Passage // shared text for reading and cloze sections
  questions: Question[]
}

export interface Passage {
  title?: string
  /** Paragraphs separated by "\n\n". Cloze blanks are "{{36}}", matching `ChoiceQuestion.number`. */
  text: string
}

export type Question = ChoiceQuestion | RewriteQuestion

export interface ChoiceQuestion {
  type: 'choice'
  id: string // "pt01-q1"
  number: number // number printed in the PDF
  /** Question text; "___" marks the blank. Omitted for cloze items (the blank is in the passage). */
  prompt?: string
  options: string[]
  answer: number // index into `options`
  explanation: string // Vietnamese: why the answer is right
  /** One note per option, "" for the correct one: why that option is wrong. */
  optionNotes: string[]
}

export interface RewriteQuestion {
  type: 'rewrite'
  id: string
  number: number
  original: string // the sentence to rewrite
  prefix: string // fixed beginning the learner continues from: "Despite"
  suffix?: string // fixed ending, when the source gives one
  /** Accepted texts between `prefix` and `suffix`; the first is the model answer. */
  answers: string[]
  explanation: string // Vietnamese: the structure being tested
}
