import { isExerciseSetId } from '../data/exercises/catalog.ts'
import type {
  CardProgress,
  CustomWord,
  ExerciseAnswer,
  ExerciseAttempt,
  ExerciseResult,
  Settings,
  StudyLog,
} from '../db/types.ts'
import { parseLocalDate, toLocalDateString } from './date.ts'

/** Pure backup format: building, serialising and strictly validating the JSON file. */

export const BACKUP_APP_ID = 'tu-ngay'
/** 2 added `exerciseAttempts` and `exerciseResults`. Version 1 files are still accepted (those tables = empty). */
export const BACKUP_FORMAT_VERSION = 2

export interface BackupData {
  progress: CardProgress[]
  customWords: CustomWord[]
  studyLogs: StudyLog[]
  exerciseAttempts: ExerciseAttempt[]
  exerciseResults: ExerciseResult[]
  settings: Settings
}

export interface BackupFile {
  app: typeof BACKUP_APP_ID
  formatVersion: number
  /** Full ISO timestamp (an instant, not a calendar date). */
  exportedAt: string
  data: BackupData
}

export type ParseResult =
  | { ok: true; data: BackupData; exportedAt: string }
  | { ok: false; errors: string[] }

const CUSTOM_ID_PREFIX = 'custom:'
const DAILY_GOALS = [5, 10, 20]
const VOICES = ['en-US', 'en-GB']
const THEMES = ['system', 'light', 'dark']
const MIN_SPEECH_RATE = 0.8
const MAX_SPEECH_RATE = 1.2
/** Stop collecting after this many problems; a badly broken file would otherwise list thousands. */
const MAX_ERRORS = 30

export function buildBackup(data: BackupData, now: Date = new Date()): BackupFile {
  return {
    app: BACKUP_APP_ID,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    data,
  }
}

export function serializeBackup(file: BackupFile): string {
  return JSON.stringify(file, null, 2)
}

/** "tu-ngay-sao-luu-2026-10-24.json" (local date). */
export function backupFileName(date: Date = new Date()): string {
  return `tu-ngay-sao-luu-${toLocalDateString(date)}.json`
}

/**
 * "X từ đã học, Y từ của tôi, Z ngày học", plus "N câu bài tập" when the file has exercise results;
 * callers add their own verb.
 */
export function describeBackupData(data: BackupData): string {
  const learned = data.progress.filter((p) => p.level >= 1).length
  const parts = [
    `${learned} từ đã học`,
    `${data.customWords.length} từ của tôi`,
    `${data.studyLogs.length} ngày học`,
  ]
  if (data.exerciseResults.length > 0) parts.push(`${data.exerciseResults.length} câu bài tập đã làm`)
  return parts.join(', ')
}

// ---------------------------------------------------------------------------
// Validation helpers

type Obj = Record<string, unknown>

function isObj(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isLocalDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    parseLocalDate(value)
    return true
  } catch {
    return false
  }
}

class Problems {
  readonly list: string[] = []
  /** Every problem seen, including those not listed because of the cap. */
  total = 0
  add(message: string): void {
    this.total++
    if (this.list.length < MAX_ERRORS) this.list.push(message)
    else if (this.list.length === MAX_ERRORS) this.list.push('Và còn nhiều lỗi khác.')
  }
}

/** Reads `obj[key]` as a string; reports and returns undefined otherwise. */
function str(obj: Obj, key: string, where: string, problems: Problems, opts?: { nonEmpty?: boolean }): string | undefined {
  const value = obj[key]
  if (typeof value !== 'string' || (opts?.nonEmpty && value.trim() === '')) {
    problems.add(`${where}: thiếu hoặc sai trường "${key}".`)
    return undefined
  }
  return value
}

function bool(obj: Obj, key: string, where: string, problems: Problems): boolean | undefined {
  const value = obj[key]
  if (typeof value !== 'boolean') {
    problems.add(`${where}: thiếu hoặc sai trường "${key}".`)
    return undefined
  }
  return value
}

function count(obj: Obj, key: string, where: string, problems: Problems): number | undefined {
  const value = obj[key]
  if (!isCount(value)) {
    problems.add(`${where}: "${key}" phải là số nguyên không âm.`)
    return undefined
  }
  return value
}

/** Optional local date: absent is fine, present must be valid. */
function optionalDate(obj: Obj, key: string, where: string, problems: Problems): string | undefined {
  const value = obj[key]
  if (value === undefined) return undefined
  if (!isLocalDate(value)) {
    problems.add(`${where}: "${key}" không phải ngày hợp lệ (YYYY-MM-DD).`)
    return undefined
  }
  return value
}

function requiredDate(obj: Obj, key: string, where: string, problems: Problems): string | undefined {
  if (!isLocalDate(obj[key])) {
    problems.add(`${where}: "${key}" thiếu hoặc không phải ngày hợp lệ (YYYY-MM-DD).`)
    return undefined
  }
  return obj[key] as string
}

/** A full ISO timestamp such as "2026-10-25T08:00:00.000Z". */
function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Date.parse(value))
}

function requiredTimestamp(obj: Obj, key: string, where: string, problems: Problems): string | undefined {
  if (!isTimestamp(obj[key])) {
    problems.add(`${where}: "${key}" thiếu hoặc không phải thời điểm hợp lệ.`)
    return undefined
  }
  return obj[key] as string
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

// ---------------------------------------------------------------------------
// Per-table parsers. Each returns clean objects containing only the known fields.

function parseProgress(rows: unknown[], problems: Problems): CardProgress[] {
  const out: CardProgress[] = []
  const seen = new Set<string>()
  rows.forEach((row, i) => {
    const where = `Tiến độ từ #${i + 1}`
    if (!isObj(row)) return problems.add(`${where}: không phải một bản ghi.`)
    const before = problems.total

    const wordId = str(row, 'wordId', where, problems, { nonEmpty: true })
    const level = row.level
    if (typeof level !== 'number' || !Number.isInteger(level) || level < 0 || level > 5) {
      problems.add(`${where}: "level" phải là số nguyên từ 0 đến 5.`)
    }
    const dueDate = optionalDate(row, 'dueDate', where, problems)
    const learnedAt = optionalDate(row, 'learnedAt', where, problems)
    const lastReviewedAt = optionalDate(row, 'lastReviewedAt', where, problems)
    const correctCount = count(row, 'correctCount', where, problems)
    const wrongCount = count(row, 'wrongCount', where, problems)
    const favorite = bool(row, 'favorite', where, problems)
    const ignored = bool(row, 'ignored', where, problems)
    if (typeof level === 'number' && level >= 1 && dueDate === undefined && row.dueDate === undefined) {
      problems.add(`${where}: từ đã học (cấp ${level}) cần có "dueDate".`)
    }
    if (wordId !== undefined) {
      if (seen.has(wordId)) problems.add(`${where}: trùng "wordId" ${wordId}.`)
      seen.add(wordId)
    }
    if (problems.total > before) return

    const card: CardProgress = {
      wordId: wordId!,
      level: level as CardProgress['level'],
      correctCount: correctCount!,
      wrongCount: wrongCount!,
      favorite: favorite!,
      ignored: ignored!,
    }
    if (dueDate !== undefined) card.dueDate = dueDate
    if (learnedAt !== undefined) card.learnedAt = learnedAt
    if (lastReviewedAt !== undefined) card.lastReviewedAt = lastReviewedAt
    out.push(card)
  })
  return out
}

function parseCustomWords(rows: unknown[], problems: Problems): CustomWord[] {
  const out: CustomWord[] = []
  const seen = new Set<string>()
  rows.forEach((row, i) => {
    const where = `Từ của tôi #${i + 1}`
    if (!isObj(row)) return problems.add(`${where}: không phải một bản ghi.`)
    const before = problems.total

    const id = str(row, 'id', where, problems, { nonEmpty: true })
    if (id !== undefined) {
      if (!id.startsWith(CUSTOM_ID_PREFIX) || id.length === CUSTOM_ID_PREFIX.length) {
        problems.add(`${where}: "id" phải bắt đầu bằng "${CUSTOM_ID_PREFIX}".`)
      }
      if (seen.has(id)) problems.add(`${where}: trùng "id" ${id}.`)
      seen.add(id)
    }
    const word = str(row, 'word', where, problems, { nonEmpty: true })
    const ipa = str(row, 'ipa', where, problems)
    const pos = str(row, 'pos', where, problems)
    const meaningVi = str(row, 'meaningVi', where, problems, { nonEmpty: true })
    const exampleEn = str(row, 'exampleEn', where, problems)
    const exampleVi = str(row, 'exampleVi', where, problems)
    const level = str(row, 'level', where, problems)
    if (!stringArray(row.topics)) problems.add(`${where}: "topics" phải là danh sách chuỗi.`)
    if (row.emoji !== undefined && typeof row.emoji !== 'string') {
      problems.add(`${where}: "emoji" phải là chuỗi.`)
    }
    const createdAt = requiredDate(row, 'createdAt', where, problems)
    if (
      row.createdAtMs !== undefined &&
      !(typeof row.createdAtMs === 'number' && Number.isFinite(row.createdAtMs))
    ) {
      problems.add(`${where}: "createdAtMs" phải là số.`)
    }
    if (problems.total > before) return

    const custom: CustomWord = {
      id: id!,
      word: word!,
      ipa: ipa!,
      pos: pos!,
      meaningVi: meaningVi!,
      exampleEn: exampleEn!,
      exampleVi: exampleVi!,
      level: level!,
      topics: [...(row.topics as string[])],
      createdAt: createdAt!,
    }
    if (typeof row.emoji === 'string') custom.emoji = row.emoji
    if (typeof row.createdAtMs === 'number') custom.createdAtMs = row.createdAtMs
    out.push(custom)
  })
  return out
}

function parseStudyLogs(rows: unknown[], problems: Problems): StudyLog[] {
  const out: StudyLog[] = []
  const dates = new Set<string>()
  const ids = new Set<number>()
  rows.forEach((row, i) => {
    const where = `Ngày học #${i + 1}`
    if (!isObj(row)) return problems.add(`${where}: không phải một bản ghi.`)
    const before = problems.total

    const date = requiredDate(row, 'date', where, problems)
    if (date !== undefined) {
      if (dates.has(date)) problems.add(`${where}: trùng ngày ${date}.`)
      dates.add(date)
    }
    const newLearned = count(row, 'newLearned', where, problems)
    const reviewed = count(row, 'reviewed', where, problems)
    const correct = count(row, 'correct', where, problems)
    const wrong = count(row, 'wrong', where, problems)
    const exercises = row.exercises === undefined ? undefined : count(row, 'exercises', where, problems)
    const id = row.id
    if (id !== undefined) {
      if (typeof id !== 'number' || !Number.isInteger(id) || id < 1) {
        problems.add(`${where}: "id" phải là số nguyên dương.`)
      } else if (ids.has(id)) {
        problems.add(`${where}: trùng "id" ${id}.`)
      } else {
        ids.add(id)
      }
    }
    if (problems.total > before) return

    const log: StudyLog = {
      date: date!,
      newLearned: newLearned!,
      reviewed: reviewed!,
      correct: correct!,
      wrong: wrong!,
    }
    if (typeof id === 'number') log.id = id
    if (exercises !== undefined) log.exercises = exercises
    out.push(log)
  })
  return out
}

/** `{ value, correct, selfMarked? }`, shared by the answers of an attempt and by results. */
function parseAnswer(row: Obj, where: string, problems: Problems): ExerciseAnswer | undefined {
  const before = problems.total
  const { value, correct, selfMarked } = row
  if (typeof value !== 'string' && !(typeof value === 'number' && Number.isFinite(value))) {
    problems.add(`${where}: "value" phải là số hoặc chuỗi.`)
  }
  if (typeof correct !== 'boolean') problems.add(`${where}: "correct" phải là true hoặc false.`)
  if (selfMarked !== undefined && typeof selfMarked !== 'boolean') {
    problems.add(`${where}: "selfMarked" phải là true hoặc false.`)
  }
  if (problems.total > before) return undefined
  const answer: ExerciseAnswer = { value: value as number | string, correct: correct as boolean }
  if (selfMarked === true) answer.selfMarked = true
  return answer
}

/** Records of a set that is not in the app (any more) are dropped without complaint. */
function parseExerciseAttempts(rows: unknown[], problems: Problems): ExerciseAttempt[] {
  const out: ExerciseAttempt[] = []
  const ids = new Set<number>()
  rows.forEach((row, i) => {
    const where = `Lượt làm bài #${i + 1}`
    if (!isObj(row)) return problems.add(`${where}: không phải một bản ghi.`)
    const before = problems.total

    const setId = str(row, 'setId', where, problems, { nonEmpty: true })
    if (row.sectionId !== undefined && (typeof row.sectionId !== 'string' || row.sectionId.trim() === '')) {
      problems.add(`${where}: "sectionId" phải là chuỗi không rỗng.`)
    }
    const startedAt = requiredTimestamp(row, 'startedAt', where, problems)
    const updatedAt = requiredTimestamp(row, 'updatedAt', where, problems)
    if (row.finishedAt !== undefined && !isTimestamp(row.finishedAt)) {
      problems.add(`${where}: "finishedAt" không phải thời điểm hợp lệ.`)
    }
    const id = row.id
    if (id !== undefined) {
      if (typeof id !== 'number' || !Number.isInteger(id) || id < 1) {
        problems.add(`${where}: "id" phải là số nguyên dương.`)
      } else if (ids.has(id)) {
        problems.add(`${where}: trùng "id" ${id}.`)
      } else {
        ids.add(id)
      }
    }
    const answers: ExerciseAttempt['answers'] = {}
    if (!isObj(row.answers)) {
      problems.add(`${where}: "answers" phải là một đối tượng.`)
    } else {
      for (const [questionId, raw] of Object.entries(row.answers)) {
        if (!isObj(raw)) {
          problems.add(`${where}: câu trả lời cho "${questionId}" không phải một bản ghi.`)
          continue
        }
        const answer = parseAnswer(raw, `${where}, câu "${questionId}"`, problems)
        if (answer) answers[questionId] = answer
      }
    }
    if (problems.total > before) return
    if (!isExerciseSetId(setId!)) return

    const attempt: ExerciseAttempt = { setId: setId!, startedAt: startedAt!, updatedAt: updatedAt!, answers }
    if (typeof id === 'number') attempt.id = id
    if (typeof row.sectionId === 'string') attempt.sectionId = row.sectionId
    if (typeof row.finishedAt === 'string') attempt.finishedAt = row.finishedAt
    out.push(attempt)
  })
  return out
}

function parseExerciseResults(rows: unknown[], problems: Problems): ExerciseResult[] {
  const out: ExerciseResult[] = []
  const seen = new Set<string>()
  rows.forEach((row, i) => {
    const where = `Kết quả bài tập #${i + 1}`
    if (!isObj(row)) return problems.add(`${where}: không phải một bản ghi.`)
    const before = problems.total

    const questionId = str(row, 'questionId', where, problems, { nonEmpty: true })
    if (questionId !== undefined) {
      if (seen.has(questionId)) problems.add(`${where}: trùng "questionId" ${questionId}.`)
      seen.add(questionId)
    }
    const setId = str(row, 'setId', where, problems, { nonEmpty: true })
    const answeredAt = requiredTimestamp(row, 'answeredAt', where, problems)
    const answer = parseAnswer(row, where, problems)
    if (problems.total > before) return
    if (!isExerciseSetId(setId!)) return

    out.push({ ...answer!, questionId: questionId!, setId: setId!, answeredAt: answeredAt! })
  })
  return out
}

function parseSettings(raw: unknown, problems: Problems): Settings | undefined {
  const where = 'Cài đặt'
  if (!isObj(raw)) {
    problems.add(`${where}: thiếu hoặc không phải một bản ghi.`)
    return undefined
  }
  const before = problems.total

  const { dailyGoal, voice, speechRate, soundEffects, theme, reminders, activeDeckIds } = raw
  if (typeof dailyGoal !== 'number' || !DAILY_GOALS.includes(dailyGoal)) {
    problems.add(`${where}: "dailyGoal" phải là 5, 10 hoặc 20.`)
  }
  if (typeof voice !== 'string' || !VOICES.includes(voice)) {
    problems.add(`${where}: "voice" phải là en-US hoặc en-GB.`)
  }
  if (
    typeof speechRate !== 'number' ||
    !Number.isFinite(speechRate) ||
    speechRate < MIN_SPEECH_RATE - 1e-9 ||
    speechRate > MAX_SPEECH_RATE + 1e-9
  ) {
    problems.add(`${where}: "speechRate" phải nằm trong khoảng ${MIN_SPEECH_RATE} đến ${MAX_SPEECH_RATE}.`)
  }
  if (typeof soundEffects !== 'boolean') problems.add(`${where}: "soundEffects" phải là true hoặc false.`)
  if (typeof theme !== 'string' || !THEMES.includes(theme)) {
    problems.add(`${where}: "theme" phải là system, light hoặc dark.`)
  }
  let parsedReminders: Settings['reminders'] | undefined
  if (
    isObj(reminders) &&
    typeof reminders.morning === 'boolean' &&
    typeof reminders.noon === 'boolean' &&
    typeof reminders.evening === 'boolean'
  ) {
    parsedReminders = { morning: reminders.morning, noon: reminders.noon, evening: reminders.evening }
  } else {
    problems.add(`${where}: "reminders" cần có morning, noon, evening (true/false).`)
  }
  if (!stringArray(activeDeckIds)) problems.add(`${where}: "activeDeckIds" phải là danh sách chuỗi.`)

  if (problems.total > before) return undefined
  return {
    dailyGoal: dailyGoal as number,
    voice: voice as Settings['voice'],
    speechRate: speechRate as number,
    soundEffects: soundEffects as boolean,
    theme: theme as Settings['theme'],
    reminders: parsedReminders!,
    activeDeckIds: [...(activeDeckIds as string[])],
  }
}

// ---------------------------------------------------------------------------

/** Validates the text of a backup file. Never throws; on failure returns Vietnamese messages. */
export function parseBackup(text: string): ParseResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['Đây không phải file sao lưu: nội dung không phải JSON hợp lệ.'] }
  }

  if (!isObj(json) || json.app !== BACKUP_APP_ID) {
    return { ok: false, errors: ['Đây không phải file sao lưu của Từ Ngày.'] }
  }

  const version = json.formatVersion
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, errors: ['File sao lưu có phiên bản định dạng không hợp lệ.'] }
  }
  if (version > BACKUP_FORMAT_VERSION) {
    return {
      ok: false,
      errors: ['File sao lưu được tạo bởi phiên bản Từ Ngày mới hơn. Hãy cập nhật app rồi thử lại.'],
    }
  }

  if (typeof json.exportedAt !== 'string') {
    return { ok: false, errors: ['File sao lưu thiếu thời điểm xuất (exportedAt).'] }
  }

  const data = json.data
  if (!isObj(data)) return { ok: false, errors: ['File sao lưu thiếu phần dữ liệu (data).'] }

  const problems = new Problems()
  for (const key of ['progress', 'customWords', 'studyLogs'] as const) {
    if (!Array.isArray(data[key])) problems.add(`Thiếu danh sách "${key}" trong dữ liệu.`)
  }
  // Version 1 files predate the exercise tables: missing means empty. When present it must be a list.
  for (const key of ['exerciseAttempts', 'exerciseResults'] as const) {
    if (Array.isArray(data[key])) continue
    if (data[key] !== undefined || version >= 2) problems.add(`Thiếu danh sách "${key}" trong dữ liệu.`)
  }
  if (problems.list.length > 0) return { ok: false, errors: problems.list }

  const progress = parseProgress(data.progress as unknown[], problems)
  const customWords = parseCustomWords(data.customWords as unknown[], problems)
  const studyLogs = parseStudyLogs(data.studyLogs as unknown[], problems)
  const exerciseAttempts = parseExerciseAttempts((data.exerciseAttempts as unknown[] | undefined) ?? [], problems)
  const exerciseResults = parseExerciseResults((data.exerciseResults as unknown[] | undefined) ?? [], problems)
  const settings = parseSettings(data.settings, problems)

  if (problems.list.length > 0 || !settings) {
    return { ok: false, errors: problems.list }
  }
  return {
    ok: true,
    data: { progress, customWords, studyLogs, exerciseAttempts, exerciseResults, settings },
    exportedAt: json.exportedAt,
  }
}
